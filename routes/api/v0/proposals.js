// express router
import { Router } from "express";
const router = Router();

// schema import
import { Proposal } from "../../../schema/Proposal.js";

// helper imports
import mongoose from "mongoose";
import { isAuthenticated } from "../../../helper/middleWare.js";

/**
 * @route GET /api/v0/proposals
 * @description Get proposals with search and pagination. Supports searching by title (case-insensitive partial match), categoryId (exact match), or userId (exact match). Returns proposals with status = "live" by default, but if the authenticated userId matches the userId query parameter, returns all proposals regardless of status.
 * @access Private (requires authentication)
 *
 * @query {string} [title] - Search term to match against title (partial, case-insensitive)
 * @query {string} [categoryId] - Category ID to filter by (exact match, must be valid ObjectId)
 * @query {string} [userId] - User ID to filter by (exact match). If this matches the authenticated user's ID, all proposals are returned regardless of status.
 * @query {number} [page=1] - Page number for pagination (default: 1)
 * @query {number} [limit=10] - Number of results per page (default: 10, max: 100)
 *
 * @returns {Object} 200 - Response object containing:
 *   - proposals: Array of proposal documents (status = "live" by default, or all statuses if userId matches authenticated user)
 *   - pagination: Object containing:
 *     - currentPage: Current page number
 *     - totalPages: Total number of pages
 *     - totalItems: Total number of proposals matching the search
 *     - itemsPerPage: Number of items per page
 *     - hasNextPage: Boolean indicating if there's a next page
 *     - hasPreviousPage: Boolean indicating if there's a previous page
 * @returns {Object} 400 - Error if pagination parameters or search parameters are invalid
 * @returns {Object} 401 - Unauthorized if token is invalid or missing (handled by isAuthenticated middleware)
 */
router.get("/", isAuthenticated, async (req, res) => {
  try {
    const { title, categoryId, userId, page = 1, limit = 10 } = req.query;
    const authenticatedUserId = req.userId; // Get authenticated user ID from middleware

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

    // Check if authenticated user is querying their own proposals
    let isOwnProposals = false;
    if (userId) {
      const userIdTerm = userId.trim();
      
      // Simple string comparison since userId is now a string
      if (authenticatedUserId && authenticatedUserId.toString() === userIdTerm) {
        isOwnProposals = true;
      }
      
      query.userId = userIdTerm;
    }

    // Only filter by status = "live" if not querying own proposals
    if (!isOwnProposals) {
      query.status = "live";
    }

    // Add title search (case-insensitive partial match)
    if (title) {
      const titleTerm = title.trim();
      if (titleTerm) {
        query.title = { $regex: titleTerm, $options: "i" };
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

    // Calculate skip value for pagination
    const skip = (pageNum - 1) * limitNum;

    // Execute query with pagination
    const [proposals, totalItems] = await Promise.all([
      Proposal.find(query)
        .sort({ createdAt: -1 }) // Sort by newest first
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
      proposals,
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
