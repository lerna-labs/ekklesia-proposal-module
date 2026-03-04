// express router
import { Router } from "express";
const router = Router();

// schema import
import { Proposal } from "../../../schema/Proposal.js";
import { Category } from "../../../schema/Category.js";
import { Vote } from "../../../schema/Vote.js";
import { Comment } from "../../../schema/Comment.js";

// helper imports
import mongoose from "mongoose";
import { z } from "zod";
import { verifyToken } from "../../../helper/verifyToken.js";
import { validateAddress } from "../../../helper/validateAddress.js";
import { loadValidationScript } from "../../../validation/loadValidationScript.js";
import { loadExcludeScript } from "../../../validation/loadExcludeScript.js";

/**
 * Compute total budget (ADA) from metaData.proposalDetails.workPackages, same logic as FormFinancialSummary.
 * Sums each budgetBreakdown row's total or quantity*unitPrice.
 * @param {Object} metaData - proposal metaData
 * @returns {number} grand total in ADA
 */
function computeTotalBudgetFromMetaData(metaData) {
  if (!metaData?.proposalDetails?.workPackages || !Array.isArray(metaData.proposalDetails.workPackages)) {
    return 0;
  }
  let total = 0;
  for (const pkg of metaData.proposalDetails.workPackages) {
    const rows = Array.isArray(pkg?.budgetBreakdown) ? pkg.budgetBreakdown : [];
    for (const row of rows) {
      const ada = Number(row?.total ?? (row?.quantity != null && row?.unitPrice != null ? row.quantity * row.unitPrice : NaN));
      if (Number.isFinite(ada)) total += ada;
    }
  }
  return total;
}

/**
 * @route POST /api/v0/proposals
 * @description Create a new proposal (draft or live). Requires authentication. Body validated with same schema as frontend (__frontend/src/lib/budget2026/Schema.js).
 * @access Private (requires valid JWT)
 *
 * @body {string} voteId - Valid MongoDB ObjectId for the vote cycle (required)
 * @body {string} title - Proposal title (2–100 chars)
 * @body {string} summary - Executive summary (2–2000 chars)
 * @body {string} status - "draft" or "live"
 * @body {Object} metaData - Full metaData object per proposal-schema-description.md
 *
 * @returns {Object} 201 - Created proposal document
 * @returns {Object} 400 - Validation error (Zod errors in body)
 * @returns {Object} 401 - Not authenticated
 * @returns {Object} 404 - Vote not found
 * @returns {Object} 500 - Server error
 */
router.post("/", async (req, res) => {
  try {
    const tokenResult = verifyToken(req);
    if (tokenResult.status !== "success" || !tokenResult.userId) {
      return res.status(tokenResult.code ?? 401).json({
        status: "error",
        message: tokenResult.message ?? "Authentication required",
      });
    }

    const proposerId = tokenResult.userId;

    const rawVoteId = req.body?.voteId;
    if (!rawVoteId || !mongoose.Types.ObjectId.isValid(rawVoteId) || String(rawVoteId).length !== 24) {
      return res.status(400).json({
        status: "error",
        message: "Invalid voteId. Must be a valid ObjectId.",
      });
    }

    const voteDoc = await Vote.findById(rawVoteId).lean();
    if (!voteDoc) {
      return res.status(404).json({
        status: "error",
        message: "Vote not found",
      });
    }

    const script = await loadValidationScript(voteDoc.validationScript);
    if (!script) {
      return res.status(503).json({
        status: "error",
        message: `Validation script "${voteDoc.validationScript}" could not be loaded.`,
      });
    }
    const validation = script.validate(req.body);

    if (!validation.success) {
      const errorTree = z.treeifyError(validation.error);
      return res.status(400).json({
        status: "error",
        message: "Validation failed",
        errors: errorTree,
      });
    }

    const { voteId, title, summary, status, metaData } = validation.data;

    // For draft, merge with minimal defaults so Mongoose metaData subfields exist
    const defaultDraftMetaData =
      status === "draft"
        ? {
          trackRecord: "",
          strategicFocusArea: null,
          keyPerformanceIndicators: [],
          proposalDetails: { conversionRate: "", workPackages: [] },
        }
        : null;

    let rawMetaData = defaultDraftMetaData ? { ...defaultDraftMetaData, ...metaData } : metaData;

    // Empty string strategicFocusArea is allowed for draft; store as null for Mongoose ObjectId
    const sanitizedMetaData = { ...rawMetaData };
    if (sanitizedMetaData.strategicFocusArea === "") {
      sanitizedMetaData.strategicFocusArea = null;
    } else if (sanitizedMetaData.strategicFocusArea) {
      sanitizedMetaData.strategicFocusArea = new mongoose.Types.ObjectId(sanitizedMetaData.strategicFocusArea);
    }

    const doc = {
      proposerId,
      voteId: new mongoose.Types.ObjectId(voteId),
      title,
      summary: summary ?? "",
      status,
      metaData: sanitizedMetaData,
    };

    if (status === "live") {
      doc.submittedAt = new Date();
    }

    doc.totalBudget = computeTotalBudgetFromMetaData(sanitizedMetaData);

    const proposal = await Proposal.create(doc);
    const created = proposal.toObject ? proposal.toObject() : proposal;
    return res.status(201).json(created);
  } catch (error) {
    if (error.name === "ValidationError" && error.errors) {
      const fieldErrors = {};
      for (const [path, err] of Object.entries(error.errors)) {
        fieldErrors[path] = err.message;
      }
      return res.status(400).json({
        status: "error",
        message: "Validation failed",
        errors: fieldErrors,
      });
    }
    console.error("Error creating proposal:", error);
    return res.status(500).json({
      status: "error",
      message: "Internal server error",
    });
  }
});

const WITHDRAWAL_CATEGORIES = [
  "Inappropriate content",
  "Spam",
  "Policy violation",
  "Duplicate submission",
  "Other",
];

/**
 * @route PUT /api/v0/proposals/:proposalId/withdraw
 * @description Withdraw a live or draft proposal (proposer or vote admin). Only live or draft can be withdrawn;
 * archived and already-withdrawn proposals return 400. Request body: { category, comment } (both required).
 * @access Private (proposer or vote admin)
 * @returns {Object} 200 - Withdrawn proposal (status set to withdrawnByProposer or withdrawnByAdmin)
 * @returns {Object} 400 - Invalid proposalId/category/comment; or proposal not live/draft (e.g. archived); or date limits exceeded
 * @returns {Object} 403 - Not the proposer or a vote admin
 * @returns {Object} 404 - Proposal not found
 */
router.put("/:proposalId/withdraw", async (req, res) => {
  try {
    const tokenResult = verifyToken(req);
    if (tokenResult.status !== "success" || !tokenResult.userId) {
      return res.status(tokenResult.code ?? 401).json({
        status: "error",
        message: tokenResult.message ?? "Authentication required",
      });
    }
    const userId = tokenResult.userId;
    const { proposalId } = req.params;
    const { category, comment } = req.body ?? {};

    if (
      !mongoose.Types.ObjectId.isValid(proposalId) ||
      proposalId.length !== 24
    ) {
      return res.status(400).json({
        status: "error",
        message: "Invalid proposalId. Must be a valid ObjectId.",
      });
    }

    if (!category || !WITHDRAWAL_CATEGORIES.includes(category)) {
      return res.status(400).json({
        status: "error",
        message: `category is required and must be one of: ${WITHDRAWAL_CATEGORIES.join(", ")}`,
      });
    }

    const commentStr =
      typeof comment === "string" ? comment.trim() : "";
    if (!commentStr) {
      return res.status(400).json({
        status: "error",
        message: "comment is required and must be a non-empty string.",
      });
    }

    const proposal = await Proposal.findById(proposalId);
    if (!proposal) {
      return res.status(404).json({
        status: "error",
        message: "Proposal not found",
      });
    }

    if (proposal.status !== "live") {
      return res.status(400).json({
        status: "error",
        message: "Only live proposals can be withdrawn. Draft proposals can be deleted.",
      });
    }

    const voteDoc = await Vote.findById(proposal.voteId).lean();
    if (!voteDoc) {
      return res.status(400).json({
        status: "error",
        message: "Proposal vote not found.",
      });
    }

    // Require: authenticated user must be the proposer or a vote admin
    const authUserId = String(userId ?? "").trim();
    const proposerIdStr = proposal.proposerId ? String(proposal.proposerId).trim() : "";
    const isProposer = proposerIdStr && authUserId && proposerIdStr === authUserId;
    const isVoteAdmin =
      Array.isArray(voteDoc.admins) &&
      voteDoc.admins.some((id) => String(id).trim() === authUserId);

    if (!isProposer && !isVoteAdmin) {
      return res.status(403).json({
        status: "error",
        message: "Only the proposer or a vote admin can withdraw this proposal.",
      });
    }

    const now = new Date();
    // Date limits apply only to live proposals
    if (proposal.status === "live") {
      if (isProposer && voteDoc.feedbackEndDate && now > new Date(voteDoc.feedbackEndDate)) {
        return res.status(400).json({
          status: "error",
          message: "Proposer withdrawal is only allowed until the vote feedback end date.",
        });
      }
      if (isVoteAdmin && voteDoc.reviewEndDate && now > new Date(voteDoc.reviewEndDate)) {
        return res.status(400).json({
          status: "error",
          message: "Admin withdrawal is only allowed until the vote review end date.",
        });
      }
    }

    proposal.status = isProposer ? "withdrawnByProposer" : "withdrawnByAdmin";
    proposal.withdrawalDetails = {
      category,
      userId,
      comment: commentStr,
      date: now,
    };
    await proposal.save();

    const updated = proposal.toObject ? proposal.toObject() : proposal;
    return res.status(200).json(updated);
  } catch (error) {
    console.error("Error withdrawing proposal:", error);
    return res.status(500).json({
      status: "error",
      message: "Internal server error",
    });
  }
});

/**
 * @route DELETE /api/v0/proposals/:proposalId
 * @description Delete a proposal. Authenticated users may delete only their own draft proposals.
 * @access Private (requires valid JWT)
 * @returns {Object} 200 - { status: "success", message: "Proposal deleted" }
 * @returns {Object} 400 - Invalid proposalId
 * @returns {Object} 401 - Not authenticated
 * @returns {Object} 403 - Not the proposer or proposal is not a draft
 * @returns {Object} 404 - Proposal not found
 */
router.delete("/:proposalId", async (req, res) => {
  try {
    const tokenResult = verifyToken(req);
    if (tokenResult.status !== "success" || !tokenResult.userId) {
      return res.status(tokenResult.code ?? 401).json({
        status: "error",
        message: tokenResult.message ?? "Authentication required",
      });
    }
    const userId = String(tokenResult.userId ?? "").trim();
    const { proposalId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(proposalId) || proposalId.length !== 24) {
      return res.status(400).json({
        status: "error",
        message: "Invalid proposalId. Must be a valid ObjectId.",
      });
    }

    const proposal = await Proposal.findById(proposalId).lean();
    if (!proposal) {
      return res.status(404).json({
        status: "error",
        message: "Proposal not found",
      });
    }

    if (proposal.status !== "draft") {
      return res.status(403).json({
        status: "error",
        message: "Only draft proposals can be deleted.",
      });
    }

    const proposerIdStr = proposal.proposerId ? String(proposal.proposerId).trim() : "";
    if (proposerIdStr !== userId) {
      return res.status(403).json({
        status: "error",
        message: "You can only delete your own proposals.",
      });
    }

    await Proposal.findByIdAndDelete(proposalId);

    return res.status(200).json({
      status: "success",
      message: "Proposal deleted",
    });
  } catch (error) {
    console.error("Error deleting proposal:", error);
    return res.status(500).json({
      status: "error",
      message: "Internal server error",
    });
  }
});

/**
 * @route PUT /api/v0/proposals/:proposalId
 * @description Update a proposal (same body as POST). Only proposer or vote admin (draft only).
 * Archived proposals are read-only and cannot be updated (400). When the proposal is currently live:
 * status is immutable (400 if body tries to change it); updates are locked after the vote's
 * reviewEndDate (400); the current version is archived (new doc with status "archived") and
 * a reference is appended to versions before applying the update. Computes totalBudget from work packages.
 * @access Private (proposer or vote admin for draft only)
 * @returns {Object} 200 - Updated proposal (with versions array when previous version was archived)
 * @returns {Object} 400 - Invalid proposalId; validation error; archived (read-only); status change when live; or locked after reviewEndDate
 * @returns {Object} 403 - Not the proposer or a vote admin for this draft
 * @returns {Object} 404 - Proposal not found
 */
router.put("/:proposalId", async (req, res) => {
  try {
    const tokenResult = verifyToken(req);
    if (tokenResult.status !== "success" || !tokenResult.userId) {
      return res.status(tokenResult.code ?? 401).json({
        status: "error",
        message: tokenResult.message ?? "Authentication required",
      });
    }
    const userId = String(tokenResult.userId ?? "").trim();
    const { proposalId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(proposalId) || proposalId.length !== 24) {
      return res.status(400).json({
        status: "error",
        message: "Invalid proposalId. Must be a valid ObjectId.",
      });
    }

    const proposal = await Proposal.findById(proposalId);
    if (!proposal) {
      return res.status(404).json({
        status: "error",
        message: "Proposal not found",
      });
    }

    const voteDoc = proposal.voteId
      ? await Vote.findById(proposal.voteId).lean()
      : null;

    let validation;
    if (!voteDoc) {
      return res.status(400).json({
        status: "error",
        message: "Proposal has no associated vote.",
      });
    }
    const script = await loadValidationScript(voteDoc.validationScript);
    if (!script) {
      return res.status(503).json({
        status: "error",
        message: `Validation script "${voteDoc.validationScript}" could not be loaded.`,
      });
    }
    validation = script.validate(req.body);

    if (!validation.success) {
      const errorTree = z.treeifyError(validation.error);
      return res.status(400).json({
        status: "error",
        message: "Validation failed",
        errors: errorTree,
      });
    }

    const isProposer = proposal.proposerId && String(proposal.proposerId).trim() === userId;
    let isVoteAdmin = false;
    if (proposal.voteId && proposal.status === "draft") {
      const voteDoc = await Vote.findById(proposal.voteId).lean();
      if (voteDoc?.admins && Array.isArray(voteDoc.admins)) {
        isVoteAdmin = voteDoc.admins.some((id) => String(id).trim() === userId);
      }
    }
    if (!isProposer && !isVoteAdmin) {
      return res.status(403).json({
        status: "error",
        message: "Only the proposer or a vote admin can update this proposal.",
      });
    }

    // Archived proposals are read-only (no update and no withdraw)
    if (proposal.status === "archived") {
      return res.status(400).json({
        status: "error",
        message: "Archived proposals cannot be updated.",
      });
    }

    const { voteId, title, summary, status, metaData } = validation.data;

    // When proposal is already live: reject status change; enforce reviewEndDate lock; archive current version then apply update
    if (proposal.status === "live") {
      if (status !== "live") {
        return res.status(400).json({
          status: "error",
          message: "Proposal status cannot be changed once the proposal is live.",
        });
      }
      const voteDoc = await Vote.findById(proposal.voteId).lean();
      if (voteDoc?.reviewEndDate && new Date() > new Date(voteDoc.reviewEndDate)) {
        return res.status(400).json({
          status: "error",
          message: "Proposal cannot be updated after the vote review period has ended (reviewEndDate).",
        });
      }
      // Versioning: copy current document to a new doc with status "archived" (new _id), then append { _id, createdAt } to versions
      const currentState = proposal.toObject ? proposal.toObject() : { ...proposal };
      delete currentState._id;
      delete currentState.createdAt;
      delete currentState.updatedAt;
      currentState.status = "archived";
      currentState.versions = [];
      const archivedDoc = new Proposal(currentState);
      await archivedDoc.save();
      if (!Array.isArray(proposal.versions)) proposal.versions = [];
      proposal.versions.push({
        _id: archivedDoc._id,
        createdAt: archivedDoc.createdAt,
      });
    }

    const rawMetaData = metaData;
    const sanitizedMetaData = { ...rawMetaData };
    if (sanitizedMetaData.strategicFocusArea === "") {
      sanitizedMetaData.strategicFocusArea = null;
    } else if (sanitizedMetaData.strategicFocusArea) {
      sanitizedMetaData.strategicFocusArea = new mongoose.Types.ObjectId(sanitizedMetaData.strategicFocusArea);
    }

    const totalBudget = computeTotalBudgetFromMetaData(sanitizedMetaData);

    proposal.voteId = new mongoose.Types.ObjectId(voteId);
    proposal.title = title;
    proposal.summary = summary ?? "";
    proposal.status = status;
    proposal.metaData = sanitizedMetaData;
    proposal.totalBudget = totalBudget;
    if (status === "live") {
      proposal.submittedAt = proposal.submittedAt || new Date();
    }
    await proposal.save();

    const updated = proposal.toObject ? proposal.toObject() : proposal;
    return res.status(200).json(updated);
  } catch (error) {
    if (error.name === "ValidationError" && error.errors) {
      const fieldErrors = {};
      for (const [path, err] of Object.entries(error.errors)) {
        fieldErrors[path] = err.message;
      }
      return res.status(400).json({
        status: "error",
        message: "Validation failed",
        errors: fieldErrors,
      });
    }
    console.error("Error updating proposal:", error);
    return res.status(500).json({
      status: "error",
      message: "Internal server error",
    });
  }
});

/**
 * @route GET /api/v0/proposals/:proposalId
 * @description Get a single proposal by ID (full data). Same permission logic as GET /proposals: public can see live/withdrawn; authenticated proposer can see all; vote admin can see draft for their vote.
 * @access Public (visibility depends on proposal status and optional auth)
 *
 * @param {string} proposalId - The ID of the proposal to retrieve (must be valid ObjectId)
 *
 * @returns {Object} 200 - Full proposal document with category (when found)
 * @returns {Object} 400 - Invalid proposalId format
 * @returns {Object} 403 - Proposal exists but requester is not the proposer or a vote admin (draft/archived)
 * @returns {Object} 404 - Proposal not found (invalid ID or no document)
 */
router.get("/:proposalId", async (req, res) => {
  try {
    const { proposalId } = req.params;

    // Validate proposalId format
    if (
      !mongoose.Types.ObjectId.isValid(proposalId) ||
      proposalId.length !== 24
    ) {
      return res.status(400).json({
        status: "error",
        message: "Invalid proposalId parameter. Must be a valid ObjectId.",
      });
    }

    const proposal = await Proposal.findById(proposalId).lean();
    if (!proposal) {
      return res.status(404).json({
        status: "error",
        message: "Proposal not found",
      });
    }

    const status = proposal.status;
    const isLiveOrWithdrawn =
      status === "live" ||
      status === "withdrawnByProposer" ||
      status === "withdrawnByAdmin";

    // Resolve auth for both access control (draft/archived) and field exclusion
    let authenticatedUserId = null;
    const tokenResult = verifyToken(req);
    if (tokenResult.status === "success" && tokenResult.userId) {
      authenticatedUserId = String(tokenResult.userId ?? "").trim();
    }

    const proposerIdStr = proposal.proposerId
      ? String(proposal.proposerId).trim()
      : "";
    const isProposer =
      authenticatedUserId &&
      proposerIdStr &&
      proposerIdStr === authenticatedUserId;

    let voteDoc = proposal.voteId
      ? await Vote.findById(proposal.voteId).lean()
      : null;
    let isVoteAdmin = false;
    if (
      authenticatedUserId &&
      voteDoc?.admins &&
      Array.isArray(voteDoc.admins)
    ) {
      isVoteAdmin = voteDoc.admins.some(
        (id) => String(id).trim() === authenticatedUserId
      );
    }

    if (!isLiveOrWithdrawn) {
      const allowed =
        isProposer || (status === "draft" && isVoteAdmin);
      if (!allowed) {
        return res.status(403).json({
          status: "error",
          message:
            "You do not have permission to view or edit this proposal.",
        });
      }
    }

    let payload = proposal;

    // Apply exclude script: remove non-public fields unless proposer or vote admin
    if (voteDoc?.excludeScript) {
      const excludeMod = await loadExcludeScript(voteDoc.excludeScript);
      if (excludeMod?.excludeNonPublicFields) {
        payload = excludeMod.excludeNonPublicFields(payload, {
          isProposer,
          isAdmin: isVoteAdmin,
        });
      }
    }

    const categoryDoc = await Category.findById(proposal.categoryId).lean();
    if (categoryDoc) {
      const { voteId, createdAt, updatedAt, ...category } = categoryDoc;
      payload = { ...payload, category };
    }

    // commentCount: total number of comments and replies on this proposal (excluding withdrawn)
    const commentCount = await Comment.countDocuments({
      proposalId: proposal._id,
      status: "live",
    });
    payload = { ...payload, commentCount };

    return res.status(200).json(payload);
  } catch (error) {
    console.error("Error fetching proposal by ID:", error);
    return res.status(500).json({
      status: "error",
      message: "Internal server error",
    });
  }
});

/**
 * @route GET /api/v0/proposals
 * @description Get all Live proposals with pagination. Returns proposals from all votes by default. Supports filtering by vote and searching by proposalId or title.
 * @access Public (Authentication optional - provides enhanced access when proposer matches authenticated user's ID)
 *
 * @query {string} [vote] - Filter by vote cycle (exact match, must be valid ObjectId). If provided, validates vote exists.
 * @query {string} [category] - Filter by category (exact match, accepts multiple comma-separated Category ObjectIds). Filters proposals where metaData.strategicFocusArea matches any of the provided Category ObjectIds. Valid values are MongoDB ObjectIds from the Category schema.
 * @query {string} [proposer] - Filter by proposer ID (exact match, must be valid User ObjectId). Returns all proposals for the specified proposer. When authenticated and proposer matches the authenticated user's ID, all proposal statuses are returned (including draft and archived).
 * @query {string} [status=live] - Filter by proposal status. Valid values: 'live' or 'withdrawn' (includes both withdrawnByProposer and withdrawnByAdmin). Defaults to 'live' if not provided. When authenticated and proposer matches authenticated user's ID, all statuses are allowed.
 * @query {string} [search] - Search term to match against proposal _id (exact match), title, description, metaData.contractingParty.legalEntityName, or proposerId (partial, case-insensitive)
 * @query {string} [sort=date] - Sort field: title, status, date (submittedAt), updatedAt, totalBudget, or commentCount
 * @query {string} [direction=desc] - Sort direction: asc or desc
 * @query {number} [page=1] - Page number for pagination (default: 1)
 * @query {number} [limit=10] - Number of results per page (default: 10, max: 100)
 *
 * @returns {Object} 200 - Response object containing:
 *   - data: Array of proposal documents (may include draft/archived when authenticated user queries own proposals)
 *   - meta: Object containing pagination metadata
 * @returns {Object} 400 - Error if query parameters are invalid
 * @returns {Object} 404 - Vote not found (when vote is provided)
 */
router.get("/", async (req, res) => {
  try {
    const {
      search,
      vote: voteParam,
      category,
      proposer,
      status: statusParam,
      sort: sortParam,
      direction = "desc",
      page = 1,
      limit = 10,
    } = req.query;

    // Validate pagination parameters
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);

    if (isNaN(pageNum) || pageNum < 1) {
      return res.status(400).json({
        status: "error",
        message: "Invalid page parameter. Must be a positive integer.",
      });
    }

    if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
      return res.status(400).json({
        status: "error",
        message:
          "Invalid limit parameter. Must be a positive integer between 1 and 100.",
      });
    }

    // Check authentication (optional - don't fail if token is missing)
    let authenticatedUserId = null;
    const tokenResult = verifyToken(req);
    if (tokenResult.status === "success" && tokenResult.userId) {
      authenticatedUserId = tokenResult.userId.toString();
    }

    // Check if authenticated user is querying their own proposals
    const isAuthenticatedUserQueryingOwnProposals =
      authenticatedUserId &&
      proposer &&
      proposer.trim() === authenticatedUserId;

    // Build search query - default to Live proposals, or filter by status
    let query = {};
    let isVoteAdmin = false;

    // Add vote filter (exact match, must be valid ObjectId)
    if (voteParam) {
      const voteTerm = voteParam.trim();
      if (
        !mongoose.Types.ObjectId.isValid(voteTerm) ||
        voteTerm.length !== 24
      ) {
        return res.status(400).json({
          status: "error",
          message: "Invalid vote parameter. Must be a valid ObjectId.",
        });
      }

      // Validate that vote exists
      const voteDoc = await Vote.findById(voteTerm).lean();
      if (!voteDoc) {
        return res.status(404).json({
          status: "error",
          message: "Vote not found",
        });
      }

      // Check if authenticated user is an admin of this vote
      if (
        authenticatedUserId &&
        voteDoc.admins &&
        Array.isArray(voteDoc.admins) &&
        voteDoc.admins.includes(authenticatedUserId)
      ) {
        isVoteAdmin = true;
      }

      query.voteId = new mongoose.Types.ObjectId(voteTerm);
    }

    // Handle status filter (single value or comma-separated: live,withdrawn,draft).
    // Draft may only be requested by: (1) admins on the given vote, or (2) authenticated users
    // querying their own proposals (proposer=userId). Everyone else gets 400 if they include draft.
    // Normalize: accept string "live,draft" or array ["live", "draft"] from query
    const statusStr =
      typeof statusParam === "string"
        ? statusParam
        : Array.isArray(statusParam)
          ? statusParam.join(",")
          : "";
    if (statusStr) {
      const statusTerms = statusStr
        .split(",")
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean);
      const hasLive = statusTerms.includes("live");
      const hasWithdrawn = statusTerms.includes("withdrawn");
      const hasDraft = statusTerms.includes("draft");
      const mayRequestDraft = isVoteAdmin || isAuthenticatedUserQueryingOwnProposals;
      if (hasDraft && !mayRequestDraft) {
        return res.status(400).json({
          status: "error",
          message:
            "Invalid status parameter. Draft proposals are only accessible to vote admins or the proposal owner.",
        });
      }
      const statusIn = [];
      if (hasLive) statusIn.push("live");
      if (hasWithdrawn) {
        statusIn.push("withdrawnByProposer", "withdrawnByAdmin");
      }
      if (hasDraft && mayRequestDraft) {
        statusIn.push("draft");
      }
      if (statusTerms.length === 0 && !isAuthenticatedUserQueryingOwnProposals) {
        query.status = "live";
      } else if (statusTerms.length === 0) {
        // invalid and own proposals: don't filter by status
      } else if (statusIn.length === 0) {
        // only invalid terms (e.g. draft for non-admin) – default to live for non-own
        if (!isAuthenticatedUserQueryingOwnProposals) {
          query.status = "live";
        }
      } else if (statusIn.length === 1) {
        query.status = statusIn[0];
      } else {
        query.status = { $in: [...new Set(statusIn)] };
      }
    } else {
      // Default to live if no status specified, unless authenticated user is querying own proposals
      if (!isAuthenticatedUserQueryingOwnProposals) {
        query.status = "live";
      }
      // If authenticated user is querying own proposals, don't filter by status (show all)
    }

    // Add category filter (exact match, accepts multiple comma-separated Category ObjectIds)
    if (category) {
      // Split comma-separated category IDs
      const categoryIds = category
        .split(",")
        .map((id) => id.trim())
        .filter((id) => id.length > 0);

      if (categoryIds.length === 0) {
        return res.status(400).json({
          status: "error",
          message: "Invalid category parameter. Must provide at least one valid Category ObjectId.",
        });
      }

      // Validate all category IDs are valid ObjectIds
      const invalidIds = categoryIds.filter(
        (id) => !mongoose.Types.ObjectId.isValid(id) || id.length !== 24
      );
      if (invalidIds.length > 0) {
        return res.status(400).json({
          status: "error",
          message: `Invalid category parameter. The following category IDs are not valid ObjectIds: ${invalidIds.join(", ")}`,
        });
      }

      // Validate that all categories exist (and belong to this vote when vote filter is set)
      const categoryObjectIds = categoryIds.map(
        (id) => new mongoose.Types.ObjectId(id)
      );
      const categoryQuery = { _id: { $in: categoryObjectIds } };
      if (query.voteId) {
        categoryQuery.voteId = query.voteId;
      }
      const existingCategories = await Category.find(categoryQuery).lean();

      if (existingCategories.length !== categoryIds.length) {
        const existingIds = new Set(
          existingCategories.map((cat) => cat._id.toString())
        );
        const missingIds = categoryIds.filter(
          (id) => !existingIds.has(id)
        );
        const hint = query.voteId
          ? " Categories must exist and belong to the requested vote."
          : "";
        return res.status(400).json({
          status: "error",
          message: `Invalid category parameter. The following categories were not found or do not belong to this vote: ${missingIds.join(", ")}.${hint}`,
        });
      }

      // Filter by strategicFocusArea (category reference in Proposal schema) using $in for multiple values
      query["metaData.strategicFocusArea"] = { $in: categoryObjectIds };
    }

    // Add proposer filter (exact match, must be valid bech32 address)
    if (proposer) {
      const proposerTerm = proposer.trim();
      // Validate bech32 address format - try stake first, then drep
      const stakeValidation = validateAddress(proposerTerm, "stake");
      const drepValidation = validateAddress(proposerTerm, "drep");

      let validatedAddress = null;
      if (!stakeValidation.error) {
        validatedAddress = proposerTerm; // stake address is valid as-is
      } else if (drepValidation && !drepValidation.error && drepValidation.cip129) {
        validatedAddress = drepValidation.cip129; // use CIP-129 format for drep
      }

      if (!validatedAddress) {
        return res.status(400).json({
          status: "error",
          message: "Invalid proposer parameter. Must be a valid bech32 address (stake1... or drep1...).",
        });
      }

      query.proposerId = validatedAddress;
    }

    // Add search: title, metaData.contractingParty.legalEntityName, proposerId (partial, case-insensitive) or _id (exact match)
    if (search) {
      const searchTerm = search.trim();
      if (searchTerm) {
        const searchConditions = [
          { title: { $regex: searchTerm, $options: "i" } },
          {
            "metaData.contractingParty.legalEntityName": {
              $regex: searchTerm,
              $options: "i",
            },
          },
          { proposerId: { $regex: searchTerm, $options: "i" } },
        ];
        if (mongoose.Types.ObjectId.isValid(searchTerm) && searchTerm.length === 24) {
          searchConditions.push({ _id: new mongoose.Types.ObjectId(searchTerm) });
        }
        query.$or = searchConditions;
      }
    }

    // Map sort parameter to schema field (commentCount resolved via aggregation)
    const sortFieldMap = {
      title: "title",
      status: "status",
      date: "submittedAt",
      updatedAt: "updatedAt",
      totalBudget: "totalBudget",
      commentCount: "commentCount",
    };
    const sortParamNorm = sortParam ? sortParam.trim().toLowerCase() : "date";
    const sortKey = Object.keys(sortFieldMap).find(
      (k) => k.toLowerCase() === sortParamNorm
    );
    if (!sortKey) {
      return res.status(400).json({
        status: "error",
        message: `Invalid sort parameter. Must be one of: ${Object.keys(sortFieldMap).join(", ")}.`,
      });
    }

    // Validate direction parameter
    const directionNorm = String(direction).trim().toLowerCase();
    if (directionNorm !== "asc" && directionNorm !== "desc") {
      return res.status(400).json({
        status: "error",
        message: "Invalid direction parameter. Must be asc or desc.",
      });
    }

    const sortDirection = directionNorm === "asc" ? 1 : -1;
    const sortField = sortKey === "title" ? "title" : sortFieldMap[sortKey];
    const sortOption = { [sortField]: sortDirection };

    const skip = (pageNum - 1) * limitNum;
    const totalItems = await Proposal.countDocuments(query);

    let proposals;
    if (sortKey === "commentCount") {
      const pipeline = [
        { $match: query },
        {
          $lookup: {
            from: "comments",
            let: { pid: "$_id" },
            pipeline: [
              {
                $match: {
                  $expr: { $eq: ["$proposalId", "$$pid"] },
                  status: "live",
                },
              },
              { $count: "count" },
            ],
            as: "commentCountArr",
          },
        },
        {
          $addFields: {
            commentCount: {
              $ifNull: [{ $arrayElemAt: ["$commentCountArr.count", 0] }, 0],
            },
          },
        },
        { $sort: { commentCount: sortDirection } },
        { $skip: skip },
        { $limit: limitNum },
      ];
      proposals = await Proposal.aggregate(pipeline);
      proposals = proposals.map((p) => ({ ...p, commentCount: p.commentCount ?? 0 }));
    } else {
      proposals = await Proposal.find(query)
        .sort(sortOption)
        .skip(skip)
        .limit(limitNum)
        .lean();
      const proposalIds = proposals.map((p) => p._id).filter(Boolean);
      let commentCountsById = new Map();
      if (proposalIds.length > 0) {
        const commentCounts = await Comment.aggregate([
          {
            $match: {
              proposalId: { $in: proposalIds },
              status: "live",
            },
          },
          {
            $group: {
              _id: "$proposalId",
              count: { $sum: 1 },
            },
          },
        ]);
        commentCountsById = new Map(
          commentCounts.map((doc) => [String(doc._id), doc.count ?? 0]),
        );
      }
      proposals = proposals.map((p) => ({
        ...p,
        commentCount: commentCountsById.get(String(p._id)) ?? 0,
      }));
    }

    const formattedProposals = proposals.map((proposal) => {
      const { metaData, withdrawalReason, versions, signature, userId, commentCount, ...rest } = proposal;
      const shortenedMetaData = metaData
        ? {
          strategicFocusArea: metaData.strategicFocusArea,
        }
        : null;
      return { ...rest, metaData: shortenedMetaData, commentCount: commentCount ?? 0 };
    });

    // Calculate pagination metadata
    const totalPages = Math.ceil(totalItems / limitNum);
    const hasNextPage = pageNum < totalPages;
    const hasPreviousPage = pageNum > 1;

    return res.status(200).json({
      data: formattedProposals,
      meta: {
        page: pageNum,
        limit: limitNum,
        total: totalItems,
        totalPages,
        hasNextPage,
        hasPreviousPage,
      },
    });
  } catch (error) {
    console.error("Error fetching proposals:", error);
    return res.status(500).json({
      status: "error",
      message: "Internal server error",
    });
  }
});

export default router;
