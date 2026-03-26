// express router
import { Router } from "express";
const router = Router();

// schema import
import { Proposal } from "../../../schema/Proposal.js";
import { Vote } from "../../../schema/Vote.js";
import { Comment } from "../../../schema/Comment.js";

// helper imports
import mongoose from "mongoose";
import { z } from "zod";
import { isAuthenticated } from "../../../helper/middleWare.js";
import { authenticatedWriteLimiter } from "../../../helper/rateLimiters.js";
import { verifyToken } from "../../../helper/verifyToken.js";
import { validateAddress } from "../../../helper/validateAddress.js";
import { loadValidationScript } from "../../../validation/loadValidationScript.js";
import { loadExcludeScript } from "../../../validation/loadExcludeScript.js";
import { verifyDeposit } from "../../../helper/verifyDeposit.js";

/** Build error tree for metaData.treasuryDonationTxHash (matches Zod treeifyError shape for frontend). */
function treasuryTxHashErrorTree(message) {
  return {
    properties: {
      metaData: {
        properties: {
          treasuryDonationTxHash: { errors: [message] },
        },
      },
    },
  };
}

/**
 * Validate treasury donation tx hash: normalize, check uniqueness across proposals, call verifyDeposit.
 * @param {string} txHash - Raw tx hash from metaData.treasuryDonationTxHash
 * @param {string} proposerId - Proposer stake address
 * @param {import("mongoose").LeanDocument} voteDoc - Vote document (lean) with depositOptions.treasuryDonation
 * @param {{ excludeProposalIds?: import("mongoose").Types.ObjectId[] }} [options] - On PUT, exclude current proposal + versions
 * @returns {Promise<{ ok: true, normalizedHash: string } | { ok: false, error: string }>}
 */
async function validateProposalTreasuryTxHash(txHash, proposerId, voteDoc, options = {}) {
  const normalizedHash = String(txHash ?? "").trim().toLowerCase();
  if (!normalizedHash) {
    return { ok: false, error: "Treasury donation verification hash is required to submit" };
  }
  const excludeProposalIds = options.excludeProposalIds ?? [];
  const treasuryDonation = voteDoc?.depositOptions?.treasuryDonation;
  if (treasuryDonation == null) {
    return { ok: false, error: "Vote has no treasury donation configured" };
  }

  // Uniqueness: same hash not allowed on another proposal (case-insensitive). Allow same proposal + its versions.
  const regex = new RegExp(`^${escapeRegex(normalizedHash)}$`, "i");
  const existing = await Proposal.findOne({
    "metaData.treasuryDonationTxHash": regex,
    _id: { $nin: excludeProposalIds },
  })
    .lean()
    .exec();
  if (existing) {
    return { ok: false, error: "This transaction hash is already used by another proposal" };
  }

  const result = await verifyDeposit(normalizedHash, proposerId, {
    treasuryDonation,
  });
  if (result !== true) {
    return { ok: false, error: result?.error ?? "Transaction verification failed" };
  }
  return { ok: true, normalizedHash };
}

function getByPath(obj, path) {
  if (!obj || !path) return undefined;
  const parts = path.split(".");
  let current = obj;
  for (const p of parts) {
    current = current?.[p];
    if (current === undefined) return undefined;
  }
  return current;
}

/** Escape special regex characters in a string for safe use in MongoDB $regex. */
function escapeRegex(str) {
  return String(str).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
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
router.post("/", isAuthenticated, authenticatedWriteLimiter, async (req, res) => {
  try {
    const proposerId = req.userId;

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
          keyPerformanceIndicators: [],
          proposalDetails: { conversionRate: "", workPackages: [] },
        }
        : null;

    let rawMetaData = defaultDraftMetaData ? { ...defaultDraftMetaData, ...metaData } : metaData;
    const sanitizedMetaData = { ...rawMetaData };

    if (status === "live" && voteDoc.depositOptions?.treasuryDonation != null) {
      const txHash = metaData?.treasuryDonationTxHash;
      if ((txHash ?? "").toString().trim() === "") {
        return res.status(400).json({
          status: "error",
          message: "Validation failed",
          errors: treasuryTxHashErrorTree("Treasury donation verification hash is required to submit"),
        });
      }
      const validationResult = await validateProposalTreasuryTxHash(
        txHash,
        proposerId,
        voteDoc,
        {},
      );
      if (!validationResult.ok) {
        return res.status(400).json({
          status: "error",
          message: "Validation failed",
          errors: treasuryTxHashErrorTree(validationResult.error),
        });
      }
      sanitizedMetaData.treasuryDonationTxHash = validationResult.normalizedHash;
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
router.put("/:proposalId/withdraw", isAuthenticated, authenticatedWriteLimiter, async (req, res) => {
  try {
    const userId = req.userId;
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
    if (commentStr.length > 1000) {
      return res.status(400).json({
        status: "error",
        message: "comment must be at most 1000 characters.",
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
router.delete("/:proposalId", isAuthenticated, authenticatedWriteLimiter, async (req, res) => {
  try {
    const userId = String(req.userId ?? "").trim();
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
 * @description Update a proposal (same body as POST). Only the proposer can update.
 * Archived proposals are read-only and cannot be updated (400). When the proposal is currently live:
 * status is immutable (400 if body tries to change it); updates are locked after the vote's
 * reviewEndDate (400); the current version is archived (new doc with status "archived") and
 * a reference is appended to versions before applying the update.
 * @access Private (proposer only)
 * @returns {Object} 200 - Updated proposal (with versions array when previous version was archived)
 * @returns {Object} 400 - Invalid proposalId; validation error; archived (read-only); status change when live; or locked after reviewEndDate
 * @returns {Object} 403 - Not the proposer
 * @returns {Object} 404 - Proposal not found
 */
router.put("/:proposalId", isAuthenticated, authenticatedWriteLimiter, async (req, res) => {
  try {
    const userId = String(req.userId ?? "").trim();
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
    if (!isProposer) {
      return res.status(403).json({
        status: "error",
        message: "Only the proposer can update this proposal.",
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
    const previousStatus = proposal.status;

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
      currentState.currentProposalId = proposal._id;
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

    if (proposal.status === "live") {
      sanitizedMetaData.treasuryDonationTxHash =
        proposal.metaData?.treasuryDonationTxHash ?? sanitizedMetaData.treasuryDonationTxHash;
    } else if (
      status === "live" &&
      voteDoc.depositOptions?.treasuryDonation != null
    ) {
      const txHash = metaData?.treasuryDonationTxHash;
      if ((txHash ?? "").toString().trim() === "") {
        return res.status(400).json({
          status: "error",
          message: "Validation failed",
          errors: treasuryTxHashErrorTree("Treasury donation verification hash is required to submit"),
        });
      }
      const excludeProposalIds = [
        proposal._id,
        ...(proposal.versions ?? []).map((v) => v._id),
      ];
      const validationResult = await validateProposalTreasuryTxHash(
        txHash,
        // Requester identity is already resolved by isAuthenticated -> req.userId.
        userId,
        voteDoc,
        { excludeProposalIds },
      );
      if (!validationResult.ok) {
        return res.status(400).json({
          status: "error",
          message: "Validation failed",
          errors: treasuryTxHashErrorTree(validationResult.error),
        });
      }
      sanitizedMetaData.treasuryDonationTxHash = validationResult.normalizedHash;
    }

    proposal.voteId = new mongoose.Types.ObjectId(voteId);
    proposal.title = title;
    proposal.summary = summary ?? "";
    proposal.status = status;
    proposal.metaData = sanitizedMetaData;
    if (status === "live") {
      proposal.submittedAt = proposal.submittedAt || new Date();
      // Version is set only by the backend, never from request body. 1 on first submit, increment on re-submit.
      if (previousStatus === "draft") {
        proposal.version = 1;
      } else if (previousStatus === "live") {
        proposal.version = (proposal.version ?? 1) + 1;
      }
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
 * @description Get a single proposal by ID (full data). Public can see live, withdrawn, and archived; draft is restricted to proposer or vote admin.
 * @access Public (visibility depends on proposal status and optional auth)
 *
 * @param {string} proposalId - The ID of the proposal to retrieve (must be valid ObjectId)
 *
 * @returns {Object} 200 - Full proposal document with category (when found)
 * @returns {Object} 400 - Invalid proposalId format
 * @returns {Object} 403 - Proposal exists but requester is not the proposer or a vote admin (draft only)
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
    const isArchived = status === "archived";
    const isPubliclyVisible = isLiveOrWithdrawn || isArchived;

    // Resolve auth for access control (draft only) and field exclusion
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

    // Only draft is restricted; live, withdrawn, and archived are visible to anyone
    if (!isPubliclyVisible) {
      const allowed = isProposer || (status === "draft" && isVoteAdmin);
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
 * @query {string} vote - Vote cycle (required, must be valid ObjectId). Validates vote exists.
 * @query {string} [category] - Filter by category (exact match, accepts multiple comma-separated Category IDs). Filters proposals where metaData.strategyFramework.pillars contains any of the provided category IDs. Valid values are MongoDB ObjectIds from the Category schema.
 * @query {string} [proposer] - Filter by proposer ID (exact match, must be valid User ObjectId). Returns all proposals for the specified proposer. When authenticated and proposer matches the authenticated user's ID, all proposal statuses are returned (including draft and archived).
 * @query {string} [status=live] - Filter by proposal status. Valid values: 'live' or 'withdrawn' (includes both withdrawnByProposer and withdrawnByAdmin). Defaults to 'live' if not provided. When authenticated and proposer matches authenticated user's ID, all statuses are allowed.
 * @query {string} [search] - Search term matched using the vote's searchOptions (e.g. title, summary, proposerId, _id; partial case-insensitive or exact per option)
 * @query {string} [sort] - Sort value from vote's sortOptions (e.g. title, submittedAt, updatedAt, commentCount). Default: submittedAt.
 * @query {string} [direction=desc] - Sort direction: asc or desc. Default when sort omitted: desc.
 * @query {number} [page=1] - Page number for pagination (default: 1)
 * @query {number} [limit=10] - Number of results per page (default: 10, max: 100)
 *
 * @returns {Object} 200 - Response object containing:
 *   - data: Array of proposal documents (may include draft/archived when authenticated user queries own proposals)
 *   - meta: Object containing pagination metadata
 * @returns {Object} 400 - Error if query parameters are invalid
 * @returns {Object} 404 - Vote not found
 */
router.get("/", async (req, res) => {
  try {
    const {
      search,
      vote: voteParam,
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

    // Require vote parameter
    if (!voteParam || typeof voteParam !== "string") {
      return res.status(400).json({
        status: "error",
        message: "The vote query parameter is required.",
      });
    }

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

    const voteDoc = await Vote.findById(voteTerm).lean();
    if (!voteDoc) {
      return res.status(404).json({
        status: "error",
        message: "Vote not found",
      });
    }

    const resolvedFilterOptions =
      voteDoc.filterOptions ?? Vote.schema.path("filterOptions").options.default?.() ?? [];
    const resolvedSearchOptions =
      voteDoc.searchOptions ?? Vote.schema.path("searchOptions").options.default?.() ?? [];
    const filterParamSet = new Set(
      resolvedFilterOptions.map((o) => o.param)
    );

    // Check authentication (optional - don't fail if token is missing).
    // Use same normalized comparison as GET single for consistent exclude/auth behavior.
    let authenticatedUserId = null;
    const tokenResult = verifyToken(req);
    if (tokenResult.status === "success" && tokenResult.userId) {
      authenticatedUserId = String(tokenResult.userId ?? "").trim();
    }

    // Check if authenticated user is an admin of this vote (same logic as GET single: .some with trim).
    let isVoteAdmin = false;
    if (
      authenticatedUserId &&
      voteDoc.admins &&
      Array.isArray(voteDoc.admins)
    ) {
      isVoteAdmin = voteDoc.admins.some(
        (id) => String(id).trim() === authenticatedUserId
      );
    }

    // Check if authenticated user is querying their own proposals
    const isAuthenticatedUserQueryingOwnProposals =
      authenticatedUserId &&
      proposer &&
      proposer.trim() === authenticatedUserId;

    // Build search query - default to Live proposals, or filter by status
    let query = { voteId: new mongoose.Types.ObjectId(voteTerm) };

    // Handle status filter only if vote's filterOptions include status (same permission logic as before).
    // Draft may only be requested by: (1) admins on the given vote, or (2) authenticated users
    // querying their own proposals (proposer=userId). Everyone else gets 400 if they include draft.
    const statusOption = resolvedFilterOptions.find((o) => o.param === "status");
    const statusStr =
      typeof statusParam === "string"
        ? statusParam
        : Array.isArray(statusParam)
          ? statusParam.join(",")
          : "";
    if (filterParamSet.has("status") && statusOption) {
      if (statusStr) {
        const statusTerms = statusStr
          .split(",")
          .map((s) => s.trim().toLowerCase())
          .filter(Boolean);
        const allowedSet = new Set(
          (statusOption.allowedValues || []).map((s) => s.toLowerCase())
        );
        const invalidTerms = statusTerms.filter((t) => !allowedSet.has(t));
        if (invalidTerms.length > 0) {
          return res.status(400).json({
            status: "error",
            message: `Invalid status parameter. Allowed: ${(statusOption.allowedValues || []).join(", ")}.`,
          });
        }
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
        if (statusIn.length === 1) {
          query.status = statusIn[0];
        } else if (statusIn.length > 1) {
          query.status = { $in: [...new Set(statusIn)] };
        }
      } else {
        if (!isAuthenticatedUserQueryingOwnProposals) {
          query.status = "live";
        }
      }
    } else if (!filterParamSet.has("status")) {
      if (!isAuthenticatedUserQueryingOwnProposals) {
        query.status = "live";
      }
    } else if (!statusStr) {
      if (!isAuthenticatedUserQueryingOwnProposals) {
        query.status = "live";
      }
    }

    // Add filters for options that have optionsPath (e.g. category from vote.metaData.strategyFramework.pillars)
    for (const option of resolvedFilterOptions) {
      if (!option.optionsPath || option.param === "status" || option.param === "proposer") continue;
      const paramValue = req.query[option.param];
      if (!paramValue || typeof paramValue !== "string") continue;

      const ids = paramValue
        .split(",")
        .map((id) => id.trim())
        .filter((id) => id.length > 0);

      if (ids.length === 0) {
        return res.status(400).json({
          status: "error",
          message: `Invalid ${option.param} parameter. Must provide at least one value.`,
        });
      }

      const optionList = getByPath(voteDoc, option.optionsPath);
      if (!Array.isArray(optionList) || optionList.length === 0) {
        return res.status(400).json({
          status: "error",
          message: `Invalid ${option.param} parameter. This vote has no options defined at ${option.optionsPath}.`,
        });
      }

      const valueKey = option.optionValueKey ?? "_id";
      const validIds = new Set(
        optionList.map((item) => String(item[valueKey] ?? "")).filter(Boolean)
      );
      const missingIds = ids.filter((id) => !validIds.has(id));
      if (missingIds.length > 0) {
        return res.status(400).json({
          status: "error",
          message: `Invalid ${option.param} parameter. The following values were not found for this vote: ${missingIds.join(", ")}.`,
        });
      }

      const condition = { [option.field]: option.multiple ? { $in: ids } : ids[0] };
      if (query.$or) {
        const existingOr = query.$or;
        delete query.$or;
        query.$and = query.$and || [];
        query.$and.push({ $or: existingOr }, condition);
      } else {
        query.$and = query.$and || [];
        query.$and.push(condition);
      }
    }

    // Apply proposer filter whenever proposer param is present (security: never return other users' drafts).
    // Supports both public "proposals by X" (live/withdrawn) and dashboard "my proposals" (incl. own drafts).
    // Does not depend on vote's filterOptions.
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

    // Add search from vote's searchOptions (like / exact / objectId)
    if (search) {
      const searchTerm = search.trim();
      if (searchTerm && resolvedSearchOptions.length > 0) {
        const searchConditions = [];
        const escapedTerm = escapeRegex(searchTerm);
        const isValidObjectId =
          mongoose.Types.ObjectId.isValid(searchTerm) && searchTerm.length === 24;
        for (const option of resolvedSearchOptions) {
          if (option.matchType === "like") {
            const opts = option.caseSensitive ? "" : "i";
            searchConditions.push({
              [option.field]: { $regex: escapedTerm, $options: opts },
            });
          } else if (option.matchType === "exact") {
            searchConditions.push({ [option.field]: searchTerm });
          } else if (option.matchType === "objectId" && isValidObjectId) {
            searchConditions.push({ _id: new mongoose.Types.ObjectId(searchTerm) });
          }
        }
        if (searchConditions.length > 0) {
          if (query.$or) {
            const existingOr = query.$or;
            delete query.$or;
            query.$and = query.$and || [];
            query.$and.push({ $or: existingOr }, { $or: searchConditions });
          } else {
            query.$or = searchConditions;
          }
        }
      }
    }

    const resolvedSortOptions = voteDoc.sortOptions ?? [];

    // Validate direction parameter
    const directionNorm = String(direction).trim().toLowerCase();
    if (directionNorm !== "asc" && directionNorm !== "desc") {
      return res.status(400).json({
        status: "error",
        message: "Invalid direction parameter. Must be asc or desc.",
      });
    }

    const sortDirection = directionNorm === "asc" ? 1 : -1;
    let sortField;

    if (!sortParam || String(sortParam).trim() === "") {
      // Default sort is always submittedAt desc, regardless of sortOptions
      sortField = "submittedAt";
    } else {
      const sortValue = String(sortParam).trim();
      const sortOptionDef = resolvedSortOptions.find(
        (o) => o.value === sortValue
      );
      if (!sortOptionDef) {
        return res.status(400).json({
          status: "error",
          message: `Invalid sort parameter. Must be one of: ${resolvedSortOptions.map((o) => o.value).join(", ")}.`,
        });
      }
      sortField = sortOptionDef.field;
    }

    const sortOption = { [sortField]: sortDirection };

    const skip = (pageNum - 1) * limitNum;
    const totalItems = await Proposal.countDocuments(query);

    let proposals;
    if (sortField === "commentCount") {
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

    // Apply exclude script: remove non-public fields unless proposer or vote admin (same as GET single).
    if (voteDoc.excludeScript) {
      const excludeMod = await loadExcludeScript(voteDoc.excludeScript);
      if (excludeMod?.excludeNonPublicFields) {
        proposals = proposals.map((proposal) => {
          try {
            const isProposer =
              String(proposal.proposerId ?? "").trim() === authenticatedUserId;
            return excludeMod.excludeNonPublicFields(proposal, {
              isProposer,
              isAdmin: isVoteAdmin,
            });
          } catch (err) {
            console.warn("excludeNonPublicFields failed for proposal", proposal?._id, err.message);
            return proposal;
          }
        });
      }
    }

    const formattedProposals = proposals.map((proposal) => {
      const { metaData, withdrawalReason, versions, signature, userId, commentCount, ...rest } = proposal;
      const shortenedMetaData = metaData
        ? {
          proposerDetails: metaData.proposerDetails ? { name: metaData.proposerDetails.name } : undefined,
          contractingParty: metaData.contractingParty ? { legalEntityType: metaData.contractingParty.legalEntityType } : undefined,
          strategyFramework: metaData.strategyFramework ? { pillars: metaData.strategyFramework.pillars } : undefined,
          conversionRate: metaData.proposalDetails?.conversionRate ?? metaData.financialAndAdministrative?.conversionRate,
          totalBudget: metaData.totalBudget,
        }
        : null;
      return { ...rest, metaData: shortenedMetaData, versions, commentCount: commentCount ?? 0 };
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
