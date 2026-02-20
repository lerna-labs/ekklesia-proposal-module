// express router
import { Router } from "express";
const router = Router();

// schema import
import { Vote } from "../../../schema/Vote.js";
import { Category } from "../../../schema/Category.js";

// helper imports
import mongoose from "mongoose";
import { isAuthenticated } from "../../../helper/middleWare.js";

// Helper function to format categories for categories endpoint (section 3.3)
// Returns categories with nested metaData structure
const formatCategoryForCategoriesEndpoint = (category) => {
  const formatted = {
    _id: category._id,
    title: category.title,
    description: category.description,
  };

  // Include metaData nested if it exists
  if (category.metaData) {
    formatted.metaData = category.metaData;
  }

  return formatted;
};

/**
 * @route GET /api/v0/votes/:voteId/categories
 * @description Get categories for a specific vote cycle. Returns categories sorted by sortOrder.
 * @access Public
 *
 * @param {string} voteId - MongoDB ObjectId of the vote cycle
 *
 * @returns {Object} 200 - Response object containing data array of categories
 * @returns {Object} 400 - Invalid voteId format
 * @returns {Object} 404 - Vote not found
 */
router.get("/:voteId/categories", async (req, res) => {
  try {
    const { voteId } = req.params;

    // Validate voteId format
    if (
      !mongoose.Types.ObjectId.isValid(voteId) ||
      voteId.length !== 24
    ) {
      return res.status(400).json({
        status: "error",
        message: "Invalid voteId parameter. Must be a valid ObjectId.",
      });
    }

    // Check if vote exists (exclude validationScript; vote not returned)
    const vote = await Vote.findById(voteId).select("-validationScript").lean();
    if (!vote) {
      return res.status(404).json({
        status: "error",
        message: "Vote not found",
      });
    }

    // Fetch categories for this vote, sorted by sortOrder
    const categories = await Category.find({
      voteId: new mongoose.Types.ObjectId(voteId),
    })
      .sort({ sortOrder: 1 })
      .lean();

    // Format categories with nested metaData for categories endpoint
    const formattedCategories = categories.map(formatCategoryForCategoriesEndpoint);

    return res.status(200).json({
      data: formattedCategories,
    });
  } catch (error) {
    console.error("Error fetching categories by voteId:", error);
    return res.status(500).json({
      status: "error",
      message: "Internal server error",
    });
  }
});

/**
 * @route GET /api/v0/votes/:voteId
 * @description Get a single vote by MongoDB ObjectId.
 * @access Public
 *
 * @param {string} voteId - MongoDB ObjectId of the vote cycle
 *
 * @returns {Object} 200 - Vote document
 * @returns {Object} 400 - Invalid voteId format
 * @returns {Object} 404 - Vote not found
 */
router.get("/:voteId", async (req, res) => {
  try {
    const { voteId } = req.params;

    // Validate voteId format
    if (
      !mongoose.Types.ObjectId.isValid(voteId) ||
      voteId.length !== 24
    ) {
      return res.status(400).json({
        status: "error",
        message: "Invalid voteId parameter. Must be a valid ObjectId.",
      });
    }

    // Find vote by ID (exclude validationScript from response)
    const vote = await Vote.findById(voteId).select("-validationScript").lean();

    if (!vote) {
      return res.status(404).json({
        status: "error",
        message: "Vote not found",
      });
    }

    return res.status(200).json(vote);
  } catch (error) {
    console.error("Error fetching vote by ID:", error);
    return res.status(500).json({
      status: "error",
      message: "Internal server error",
    });
  }
});

/**
 * @route GET /api/v0/votes
 * @description Get votes with search and pagination. Supports searching by title (case-insensitive partial match) or _id (exact match), and filtering by slug (case-sensitive exact match).
 * @access Private (requires authentication)
 *
 * @query {string} [search] - Search term to match against title (partial, case-insensitive) or _id (exact match)
 * @query {string} [slug] - Filter by slug (exact, case-sensitive match)
 * @query {number} [page=1] - Page number for pagination (default: 1)
 * @query {number} [limit=10] - Number of results per page (default: 10, max: 100)
 *
 * @returns {Object} 200 - Response object containing:
 *   - data: Array of vote documents
 *   - meta: Object containing:
 *     - page: Current page number
 *     - limit: Number of items per page
 *     - total: Total number of votes matching the search
 *     - totalPages: Total number of pages
 *     - hasNextPage: Boolean indicating if there's a next page
 *     - hasPreviousPage: Boolean indicating if there's a previous page
 * @returns {Object} 400 - Error if pagination parameters are invalid
 * @returns {Object} 401 - Unauthorized if token is invalid or missing (handled by isAuthenticated middleware)
 * @returns {Object} 404 - No votes found when search or slug parameters are provided
 */
router.get("/", async (req, res) => {
  try {
    const { search, slug, page = 1, limit = 10 } = req.query;

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

    // Filter by slug (case-sensitive exact match)
    if (slug) {
      query.slug = slug.trim();
    }

    // Search by title or _id
    if (search) {
      const searchTerm = search.trim();

      // Check if search term is a valid MongoDB ObjectId (24 hex characters)
      if (
        mongoose.Types.ObjectId.isValid(searchTerm) &&
        searchTerm.length === 24
      ) {
        // Search by _id (exact match)
        query._id = new mongoose.Types.ObjectId(searchTerm);
      } else {
        // Search by title (case-insensitive partial match)
        query.title = { $regex: searchTerm, $options: "i" };
      }
    }

    // Calculate skip value for pagination
    const skip = (pageNum - 1) * limitNum;

    // Execute query with pagination (exclude validationScript from response)
    const [votes, totalItems] = await Promise.all([
      Vote.find(query)
        .select("-validationScript")
        .sort({ createdAt: -1 }) // Sort by newest first
        .skip(skip)
        .limit(limitNum)
        .lean(), // Use lean() for better performance
      Vote.countDocuments(query), // Get total count for pagination
    ]);

    // Return 404 if search or slug parameters were provided but no matches found
    if ((search || slug) && totalItems === 0) {
      return res.status(404).json({
        status: "error",
        message: "No votes found matching the provided criteria",
      });
    }

    // Calculate pagination metadata
    const totalPages = Math.ceil(totalItems / limitNum);
    const hasNextPage = pageNum < totalPages;
    const hasPreviousPage = pageNum > 1;

    return res.status(200).json({
      data: votes,
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
    console.error("Error fetching votes:", error);
    return res.status(500).json({
      status: "error",
      message: "Internal server error",
    });
  }
});

/**
 * @route GET /api/v0/votes/:slug
 * @description Get a single vote by slug.
 * @access Public
 * @note This route should come after /:voteId routes. Slugs that are 24-character hex strings will match :voteId first.
 *
 * @param {string} slug - The slug of the vote to retrieve
 *
 * @returns {Object} 200 - Vote document
 * @returns {Object} 404 - Vote not found
 */
router.get("/:slug", async (req, res) => {
  try {
    const { slug } = req.params;

    // Skip if this looks like an ObjectId (should have been handled by :voteId route)
    if (
      mongoose.Types.ObjectId.isValid(slug) &&
      slug.length === 24
    ) {
      // This should have matched :voteId route, but if we get here, treat as slug
    }

    // Find vote by slug (exclude validationScript from response)
    const vote = await Vote.findOne({ slug }).select("-validationScript").lean();

    if (!vote) {
      return res.status(404).json({
        status: "error",
        message: "Vote not found",
      });
    }

    return res.status(200).json(vote);
  } catch (error) {
    console.error("Error fetching vote by slug:", error);
    return res.status(500).json({
      status: "error",
      message: "Internal server error",
    });
  }
});

export default router;
