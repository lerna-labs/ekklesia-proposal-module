// express router
import { Router } from "express";
const router = Router();

// schema import
import { Proposal } from "../../../schema/Proposal.js";
import { Category } from "../../../schema/Category.js";
import { Budget } from "../../../schema/Budget.js";

// helper imports
import mongoose from "mongoose";
import { verifyToken } from "../../../helper/verifyToken.js";
import { validateAddress } from "../../../helper/validateAddress.js";
import { validateCreateProposalBody } from "../../../validation/proposalCreateSchema.js";

/**
 * Compute total budget (ADA) from metaData.executionRoadmap.workPackages, same logic as FormFinancialSummary.
 * Sums each budgetBreakdown row's total or quantity*unitPrice.
 * @param {Object} metaData - proposal metaData
 * @returns {number} grand total in ADA
 */
function computeTotalBudgetFromMetaData(metaData) {
  if (!metaData?.executionRoadmap?.workPackages || !Array.isArray(metaData.executionRoadmap.workPackages)) {
    return 0;
  }
  let total = 0;
  for (const pkg of metaData.executionRoadmap.workPackages) {
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
 * @body {string} budgetId - Valid MongoDB ObjectId for the budget cycle (required)
 * @body {string} title - Proposal title (2–100 chars)
 * @body {string} summary - Executive summary (2–2000 chars)
 * @body {string} status - "draft" or "live"
 * @body {Object} metaData - Full metaData object per proposal-schema-description.md
 *
 * @returns {Object} 201 - Created proposal document
 * @returns {Object} 400 - Validation error (Zod errors in body)
 * @returns {Object} 401 - Not authenticated
 * @returns {Object} 404 - Budget not found
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

    const validation = validateCreateProposalBody(req.body);
    if (!validation.success) {
      const errors = validation.error.flatten();
      return res.status(400).json({
        status: "error",
        message: "Validation failed",
        errors: errors.fieldErrors ?? {},
        formErrors: errors.formErrors ?? [],
      });
    }

    const { budgetId, title, summary, status, metaData } = validation.data;

    if (!mongoose.Types.ObjectId.isValid(budgetId) || budgetId.length !== 24) {
      return res.status(400).json({
        status: "error",
        message: "Invalid budgetId. Must be a valid ObjectId.",
      });
    }

    const budgetDoc = await Budget.findById(budgetId).lean();
    if (!budgetDoc) {
      return res.status(404).json({
        status: "error",
        message: "Budget not found",
      });
    }

    // For draft, merge with minimal defaults so Mongoose metaData subfields exist
    const defaultDraftMetaData =
      status === "draft"
        ? {
            trackRecord: "",
            strategicFocusArea: null,
            keyPerformanceIndicators: [],
            executionRoadmap: { projectStartDate: null, projectEndDate: null, workPackages: [] },
            financialAndAdministrative: {},
            contractingParty: {},
            primaryContact: {},
            signatoryContact: {},
            kycInfo: {},
          }
        : null;

    let rawMetaData = defaultDraftMetaData ? { ...defaultDraftMetaData, ...metaData } : metaData;

    // Draft: treat empty enum fields as unset so Mongoose optional + enum doesn't reject ""
    if (status === "draft") {
      if (rawMetaData.proposalType === "") rawMetaData.proposalType = undefined;
      if (rawMetaData.financialAndAdministrative?.initiativeType === "") {
        rawMetaData = {
          ...rawMetaData,
          financialAndAdministrative: { ...rawMetaData.financialAndAdministrative, initiativeType: undefined },
        };
      }
    }

    // Empty string strategicFocusArea is allowed for draft; store as null for Mongoose ObjectId
    const sanitizedMetaData = { ...rawMetaData };
    if (sanitizedMetaData.strategicFocusArea === "") {
      sanitizedMetaData.strategicFocusArea = null;
    } else if (sanitizedMetaData.strategicFocusArea) {
      sanitizedMetaData.strategicFocusArea = new mongoose.Types.ObjectId(sanitizedMetaData.strategicFocusArea);
    }

    const doc = {
      proposerId,
      budgetId: new mongoose.Types.ObjectId(budgetId),
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
 * @description Withdraw a live or draft proposal (proposer or budget admin). Request body: { category, comment } (both required).
 * @access Private (proposer or budget admin)
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

    if (proposal.status !== "live" && proposal.status !== "draft") {
      return res.status(400).json({
        status: "error",
        message: "Only live or draft proposals can be withdrawn.",
      });
    }

    const budgetDoc = await Budget.findById(proposal.budgetId).lean();
    if (!budgetDoc) {
      return res.status(400).json({
        status: "error",
        message: "Proposal budget not found.",
      });
    }

    // Require: authenticated user must be the proposer or a budget admin
    const authUserId = String(userId ?? "").trim();
    const proposerIdStr = proposal.proposerId ? String(proposal.proposerId).trim() : "";
    const isProposer = proposerIdStr && authUserId && proposerIdStr === authUserId;
    const isBudgetAdmin =
      Array.isArray(budgetDoc.admins) &&
      budgetDoc.admins.some((id) => String(id).trim() === authUserId);

    if (!isProposer && !isBudgetAdmin) {
      return res.status(403).json({
        status: "error",
        message: "Only the proposer or a budget admin can withdraw this proposal.",
      });
    }

    const now = new Date();
    // Date limits apply only to live proposals
    if (proposal.status === "live") {
      if (isProposer && budgetDoc.feedbackEndDate && now > new Date(budgetDoc.feedbackEndDate)) {
        return res.status(400).json({
          status: "error",
          message: "Proposer withdrawal is only allowed until the budget feedback end date.",
        });
      }
      if (isBudgetAdmin && budgetDoc.reviewEndDate && now > new Date(budgetDoc.reviewEndDate)) {
        return res.status(400).json({
          status: "error",
          message: "Admin withdrawal is only allowed until the budget review end date.",
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
 * @route PUT /api/v0/proposals/:proposalId
 * @description Update a proposal (same body as POST). Only proposer or budget admin (draft only). Computes totalBudget from work packages.
 * @access Private (proposer or budget admin for draft)
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

    const validation = validateCreateProposalBody(req.body);
    if (!validation.success) {
      const errors = validation.error.flatten();
      return res.status(400).json({
        status: "error",
        message: "Validation failed",
        errors: errors.fieldErrors ?? {},
        formErrors: errors.formErrors ?? [],
      });
    }

    const proposal = await Proposal.findById(proposalId);
    if (!proposal) {
      return res.status(404).json({
        status: "error",
        message: "Proposal not found",
      });
    }

    const isProposer = proposal.proposerId && String(proposal.proposerId).trim() === userId;
    let isBudgetAdmin = false;
    if (proposal.budgetId && proposal.status === "draft") {
      const budgetDoc = await Budget.findById(proposal.budgetId).lean();
      if (budgetDoc?.admins && Array.isArray(budgetDoc.admins)) {
        isBudgetAdmin = budgetDoc.admins.some((id) => String(id).trim() === userId);
      }
    }
    if (!isProposer && !isBudgetAdmin) {
      return res.status(403).json({
        status: "error",
        message: "Only the proposer or a budget admin can update this proposal.",
      });
    }

    const { budgetId, title, summary, status, metaData } = validation.data;

    let rawMetaData = metaData;
    if (status === "draft") {
      if (rawMetaData.proposalType === "") rawMetaData = { ...rawMetaData, proposalType: undefined };
      if (rawMetaData.financialAndAdministrative?.initiativeType === "") {
        rawMetaData = {
          ...rawMetaData,
          financialAndAdministrative: { ...rawMetaData.financialAndAdministrative, initiativeType: undefined },
        };
      }
    }

    const sanitizedMetaData = { ...rawMetaData };
    if (sanitizedMetaData.strategicFocusArea === "") {
      sanitizedMetaData.strategicFocusArea = null;
    } else if (sanitizedMetaData.strategicFocusArea) {
      sanitizedMetaData.strategicFocusArea = new mongoose.Types.ObjectId(sanitizedMetaData.strategicFocusArea);
    }

    const totalBudget = computeTotalBudgetFromMetaData(sanitizedMetaData);

    proposal.budgetId = new mongoose.Types.ObjectId(budgetId);
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
 * @description Get a single proposal by ID (full data). Same permission logic as GET /proposals: public can see live/withdrawn; authenticated proposer can see all; budget admin can see draft for their budget.
 * @access Public (visibility depends on proposal status and optional auth)
 *
 * @param {string} proposalId - The ID of the proposal to retrieve (must be valid ObjectId)
 *
 * @returns {Object} 200 - Full proposal document with category (when found)
 * @returns {Object} 400 - Invalid proposalId format
 * @returns {Object} 403 - Proposal exists but requester is not the proposer or a budget admin (draft/archived)
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

    if (!isLiveOrWithdrawn) {
      // Require auth: proposer or (draft and budget admin) can view
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

      let isBudgetAdmin = false;
      if (authenticatedUserId && proposal.budgetId && status === "draft") {
        const budgetDoc = await Budget.findById(proposal.budgetId).lean();
        if (
          budgetDoc?.admins &&
          Array.isArray(budgetDoc.admins) &&
          budgetDoc.admins.some((id) => String(id).trim() === authenticatedUserId)
        ) {
          isBudgetAdmin = true;
        }
      }

      const allowed =
        isProposer || (status === "draft" && isBudgetAdmin);
      if (!allowed) {
        return res.status(403).json({
          status: "error",
          message:
            "You do not have permission to view or edit this proposal.",
        });
      }
    }

    // Include category when returning a single proposal (omit budgetId and timestamps)
    const categoryDoc = await Category.findById(proposal.categoryId).lean();
    let payload = proposal;
    if (categoryDoc) {
      const { budgetId, createdAt, updatedAt, ...category } = categoryDoc;
      payload = { ...proposal, category };
    }

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
 * @description Get all Live proposals with pagination. Returns proposals from all budgets by default. Supports filtering by budget and searching by proposalId or title.
 * @access Public (Authentication optional - provides enhanced access when proposer matches authenticated user's ID)
 *
 * @query {string} [budget] - Filter by budget cycle (exact match, must be valid ObjectId). If provided, validates budget exists.
 * @query {string} [category] - Filter by category (exact match, accepts multiple comma-separated Category ObjectIds). Filters proposals where metaData.strategicFocusArea matches any of the provided Category ObjectIds. Valid values are MongoDB ObjectIds from the Category schema.
 * @query {string} [proposer] - Filter by proposer ID (exact match, must be valid User ObjectId). Returns all proposals for the specified proposer. When authenticated and proposer matches the authenticated user's ID, all proposal statuses are returned (including draft and archived).
 * @query {string} [status=live] - Filter by proposal status. Valid values: 'live' or 'withdrawn' (includes both withdrawnByProposer and withdrawnByAdmin). Defaults to 'live' if not provided. When authenticated and proposer matches authenticated user's ID, all statuses are allowed.
 * @query {string} [search] - Search term to match against proposal _id (exact match), title, description, or metaData.contractingParty.legalEntityName (partial, case-insensitive)
 * @query {string} [sort=date] - Sort field: title, status, date (submittedAt), or amount (totalBudget)
 * @query {string} [direction=desc] - Sort direction: asc or desc
 * @query {number} [page=1] - Page number for pagination (default: 1)
 * @query {number} [limit=10] - Number of results per page (default: 10, max: 100)
 *
 * @returns {Object} 200 - Response object containing:
 *   - data: Array of proposal documents (may include draft/archived when authenticated user queries own proposals)
 *   - meta: Object containing pagination metadata
 * @returns {Object} 400 - Error if query parameters are invalid
 * @returns {Object} 404 - Budget not found (when budget is provided)
 */
router.get("/", async (req, res) => {
  try {
    const {
      search,
      budget,
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
    let isBudgetAdmin = false;

    // Add budget filter (exact match, must be valid ObjectId)
    if (budget) {
      const budgetTerm = budget.trim();
      if (
        !mongoose.Types.ObjectId.isValid(budgetTerm) ||
        budgetTerm.length !== 24
      ) {
        return res.status(400).json({
          status: "error",
          message: "Invalid budget parameter. Must be a valid ObjectId.",
        });
      }

      // Validate that budget exists
      const budgetDoc = await Budget.findById(budgetTerm).lean();
      if (!budgetDoc) {
        return res.status(404).json({
          status: "error",
          message: "Budget not found",
        });
      }

      // Check if authenticated user is an admin of this budget
      if (
        authenticatedUserId &&
        budgetDoc.admins &&
        Array.isArray(budgetDoc.admins) &&
        budgetDoc.admins.includes(authenticatedUserId)
      ) {
        isBudgetAdmin = true;
      }

      query.budgetId = new mongoose.Types.ObjectId(budgetTerm);
    }

    // Handle status filter
    if (statusParam) {
      const statusTerm = statusParam.trim().toLowerCase();
      if (statusTerm === "live") {
        query.status = "live";
      } else if (statusTerm === "withdrawn") {
        // Include both withdrawn statuses
        query.status = { $in: ["withdrawnByProposer", "withdrawnByAdmin"] };
      } else if (statusTerm === "draft") {
        // Allow draft status if user is a budget admin or querying own proposals
        if (isBudgetAdmin || isAuthenticatedUserQueryingOwnProposals) {
          query.status = "draft";
        } else {
          return res.status(400).json({
            status: "error",
            message:
              "Invalid status parameter. Must be 'live' or 'withdrawn'. Draft proposals are only accessible to budget admins or the proposal owner.",
          });
        }
      } else {
        // If authenticated user is querying own proposals, allow all statuses
        if (isAuthenticatedUserQueryingOwnProposals) {
          query.status = statusTerm;
        } else {
          return res.status(400).json({
            status: "error",
            message: "Invalid status parameter. Must be 'live' or 'withdrawn'.",
          });
        }
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

      // Validate that all categories exist
      const categoryObjectIds = categoryIds.map(
        (id) => new mongoose.Types.ObjectId(id)
      );
      const existingCategories = await Category.find({
        _id: { $in: categoryObjectIds },
      }).lean();

      if (existingCategories.length !== categoryIds.length) {
        const existingIds = new Set(
          existingCategories.map((cat) => cat._id.toString())
        );
        const missingIds = categoryIds.filter(
          (id) => !existingIds.has(id)
        );
        return res.status(400).json({
          status: "error",
          message: `Invalid category parameter. The following categories were not found: ${missingIds.join(", ")}`,
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

    // Add search: match title, description, metaData.contractingParty.legalEntityName (partial, case-insensitive) or _id (exact match)
    if (search) {
      const searchTerm = search.trim();
      if (searchTerm) {
        const searchConditions = [
          { title: { $regex: searchTerm, $options: "i" } },
          { description: { $regex: searchTerm, $options: "i" } },
          {
            "metaData.contractingParty.legalEntityName": {
              $regex: searchTerm,
              $options: "i",
            },
          },
        ];
        // If search term is a valid ObjectId, also search by _id
        if (
          mongoose.Types.ObjectId.isValid(searchTerm) &&
          searchTerm.length === 24
        ) {
          searchConditions.push({
            _id: new mongoose.Types.ObjectId(searchTerm),
          });
        }
        query.$or = searchConditions;
      }
    }

    // Map sort parameter to schema field
    const sortFieldMap = {
      title: "title",
      status: "status",
      date: "submittedAt",
      amount: "totalBudget",
    };
    const sortField = sortParam ? sortParam.trim().toLowerCase() : "date";
    if (!Object.hasOwn(sortFieldMap, sortField)) {
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
    const sortOption = { [sortFieldMap[sortField]]: sortDirection };

    // Calculate skip value for pagination
    const skip = (pageNum - 1) * limitNum;

    // Execute query with pagination
    const [proposals, totalItems] = await Promise.all([
      Proposal.find(query)
        .sort(sortOption)
        .skip(skip)
        .limit(limitNum)
        .lean(), // Use lean() for better performance
      Proposal.countDocuments(query), // Get total count for pagination
    ]);

    // Format proposals - include all fields but shorten metaData
    const formattedProposals = proposals.map((proposal) => {
      const {
        metaData,
        withdrawalReason,
        versions,
        signature,
        userId,
        ...rest
      } = proposal;

      // Shorten metaData to only include key fields
      const shortenedMetaData = metaData
        ? {
            strategicFocusArea: metaData.strategicFocusArea,
            proposalType: metaData.proposalType,
            initiativeType: metaData.financialAndAdministrative?.initiativeType,
          }
        : null;

      return {
        ...rest,
        metaData: shortenedMetaData,
      };
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
