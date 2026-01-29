// express router
import { Router } from "express";
const router = Router();

// schema import
import { Proposal } from "../../../schema/Proposal.js";

// helper imports
import mongoose from "mongoose";

/**
 * @route GET /api/v0/proposals/:proposalId
 * @description Get a single proposal by ID. Returns the proposal as an object.
 * @access Public
 *
 * @param {string} proposalId - The ID of the proposal to retrieve (must be valid ObjectId)
 *
 * @returns {Object} 200 - Proposal document
 * @returns {Object} 400 - Invalid proposalId format
 * @returns {Object} 404 - Proposal not found
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

    // Find proposal by ID
    const proposal = await Proposal.findById(proposalId).lean();

    if (!proposal) {
      return res.status(404).json({
        status: "error",
        message: "Proposal not found",
      });
    }

    // Return proposal data directly as an object
    return res.status(200).json(proposal);
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
 * @description Get proposals with search and pagination. Supports search param (matches title, _id, or proposerName), categoryId (exact match), budgetId (exact match), or userId (exact match). Returns proposals with status = "live" by default.
 * @access Public
 *
 * @query {string} [search] - Search term to match against title, _id, or proposerName (partial, case-insensitive for text; exact for valid ObjectId)
 * @query {string} [categoryId] - Category ID to filter by (exact match, must be valid ObjectId)
 * @query {string} [budgetId] - Budget ID to filter by (exact match, must be valid ObjectId)
 * @query {string} [userId] - User ID to filter by (exact match)
 * @query {number} [page=1] - Page number for pagination (default: 1)
 * @query {number} [limit=10] - Number of results per page (default: 10, max: 100)
 * @query {string} [sort] - Sort field: title, budget (totalBudget), or date (submittedAt). Default: date
 * @query {string} [direction] - Sort direction: asc or desc. Default: desc
 *
 * @returns {Object} 200 - Response object containing:
 *   - data: Array of proposal documents (status = "live" by default)
 *   - pagination: Object containing:
 *     - currentPage: Current page number
 *     - totalPages: Total number of pages
 *     - totalItems: Total number of proposals matching the search
 *     - itemsPerPage: Number of items per page
 *     - hasNextPage: Boolean indicating if there's a next page
 *     - hasPreviousPage: Boolean indicating if there's a previous page
 * @returns {Object} 400 - Error if pagination parameters or search parameters are invalid
 */
router.get("/", async (req, res) => {
  try {
    const { search, categoryId, budgetId, userId, page = 1, limit = 10, sort: sortParam, direction = "desc" } = req.query;

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

    // Build search query
    let query = {};

    // Add userId filter if provided
    if (userId) {
      const userIdTerm = userId.trim();
      query.userId = userIdTerm;
    }

    // Only filter by status = "live" by default (if no userId filter or userId doesn't match)
    query.status = "live";

    // Add search: match title, _id, or proposerName (case-insensitive partial for text; exact for valid ObjectId)
    if (search) {
      const searchTerm = search.trim();
      if (searchTerm) {
        const searchConditions = [
          { title: { $regex: searchTerm, $options: "i" } },
          { proposerName: { $regex: searchTerm, $options: "i" } },
        ];
        if (
          mongoose.Types.ObjectId.isValid(searchTerm) &&
          searchTerm.length === 24
        ) {
          searchConditions.push({ _id: new mongoose.Types.ObjectId(searchTerm) });
        }
        query.$or = searchConditions;
      }
    }

    // Add categoryId filter (exact match, must be valid ObjectId)
    if (categoryId) {
      const categoryIdTerm = categoryId.trim();
      if (
        mongoose.Types.ObjectId.isValid(categoryIdTerm) &&
        categoryIdTerm.length === 24
      ) {
        query.categoryId = new mongoose.Types.ObjectId(categoryIdTerm);
      } else {
        return res.status(400).json({
          status: "error",
          message: "Invalid categoryId parameter. Must be a valid ObjectId.",
        });
      }
    }

    // Add budgetId filter (exact match, must be valid ObjectId)
    if (budgetId) {
      const budgetIdTerm = budgetId.trim();
      if (
        mongoose.Types.ObjectId.isValid(budgetIdTerm) &&
        budgetIdTerm.length === 24
      ) {
        query.budgetId = new mongoose.Types.ObjectId(budgetIdTerm);
      } else {
        return res.status(400).json({
          status: "error",
          message: "Invalid budgetId parameter. Must be a valid ObjectId.",
        });
      }
    }

    // Map sort URL param to schema field; valid: title, budget -> totalBudget, date -> submittedAt
    const sortFieldMap = {
      title: "title",
      budget: "totalBudget",
      date: "submittedAt",
    };
    const sortField = sortParam ? sortParam.trim().toLowerCase() : "date";
    if (!Object.hasOwn(sortFieldMap, sortField)) {
      return res.status(400).json({
        status: "error",
        message: `Invalid sort parameter. Must be one of: ${Object.keys(sortFieldMap).join(", ")}.`,
      });
    }
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

    // Calculate pagination metadata
    const totalPages = Math.ceil(totalItems / limitNum);
    const hasNextPage = pageNum < totalPages;
    const hasPreviousPage = pageNum > 1;

    return res.status(200).json({
      data: proposals,
      pagination: {
        currentPage: pageNum,
        totalPages,
        totalItems,
        itemsPerPage: limitNum,
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
