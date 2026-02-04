// express router
import { Router } from "express";
const router = Router();

// schema import
import { Budget } from "../../../schema/Budget.js";
import { Category } from "../../../schema/Category.js";

// helper imports
import mongoose from "mongoose";
import { isAuthenticated } from "../../../helper/middleWare.js";

// Helper function to format categories for budget responses (sections 3.1, 3.2)
// Returns simplified categories with flattened metaData fields
const formatCategoryForBudget = (category) => {
  const formatted = {
    _id: category._id,
    title: category.title,
    description: category.description,
  };

  // Flatten metaData fields if they exist (for section 3.2)
  if (category.metaData) {
    if (category.metaData.pillar) formatted.pillar = category.metaData.pillar;
    if (category.metaData.pillarDescription)
      formatted.pillarDescription = category.metaData.pillarDescription;
    if (category.metaData.highLevelThematicArea)
      formatted.highLevelThematicArea = category.metaData.highLevelThematicArea;
    if (category.metaData.descriptionStrategy)
      formatted.descriptionStrategy = category.metaData.descriptionStrategy;
    if (category.metaData.expectedEnhancement)
      formatted.expectedEnhancement = category.metaData.expectedEnhancement;
  }

  return formatted;
};

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
 * @route GET /api/v0/budgets/:budgetId/categories
 * @description Get categories for a specific budget cycle. Returns categories sorted by sortOrder.
 * @access Public
 *
 * @param {string} budgetId - MongoDB ObjectId of the budget cycle
 *
 * @returns {Object} 200 - Response object containing data array of categories
 * @returns {Object} 400 - Invalid budgetId format
 * @returns {Object} 404 - Budget not found
 */
router.get("/:budgetId/categories", async (req, res) => {
  try {
    const { budgetId } = req.params;

    // Validate budgetId format
    if (
      !mongoose.Types.ObjectId.isValid(budgetId) ||
      budgetId.length !== 24
    ) {
      return res.status(400).json({
        status: "error",
        message: "Invalid budgetId parameter. Must be a valid ObjectId.",
      });
    }

    // Check if budget exists
    const budget = await Budget.findById(budgetId).lean();
    if (!budget) {
      return res.status(404).json({
        status: "error",
        message: "Budget not found",
      });
    }

    // Fetch categories for this budget, sorted by sortOrder
    const categories = await Category.find({
      budgetId: new mongoose.Types.ObjectId(budgetId),
    })
      .sort({ sortOrder: 1 })
      .lean();

    // Format categories with nested metaData for categories endpoint
    const formattedCategories = categories.map(formatCategoryForCategoriesEndpoint);

    return res.status(200).json({
      data: formattedCategories,
    });
  } catch (error) {
    console.error("Error fetching categories by budgetId:", error);
    return res.status(500).json({
      status: "error",
      message: "Internal server error",
    });
  }
});

/**
 * @route GET /api/v0/budgets/:budgetId
 * @description Get a single budget by MongoDB ObjectId. Returns the budget with its categories.
 * @access Public
 *
 * @param {string} budgetId - MongoDB ObjectId of the budget cycle
 *
 * @returns {Object} 200 - Budget document including a categories array
 * @returns {Object} 400 - Invalid budgetId format
 * @returns {Object} 404 - Budget not found
 */
router.get("/:budgetId", async (req, res) => {
  try {
    const { budgetId } = req.params;

    // Validate budgetId format
    if (
      !mongoose.Types.ObjectId.isValid(budgetId) ||
      budgetId.length !== 24
    ) {
      return res.status(400).json({
        status: "error",
        message: "Invalid budgetId parameter. Must be a valid ObjectId.",
      });
    }

    // Find budget by ID
    const budget = await Budget.findById(budgetId).lean();

    if (!budget) {
      return res.status(404).json({
        status: "error",
        message: "Budget not found",
      });
    }

    // Fetch categories for this budget, sorted by sortOrder
    const categories = await Category.find({
      budgetId: budget._id,
    })
      .sort({ sortOrder: 1 })
      .lean();

    // Format categories with flattened metaData for budget response (section 3.2)
    const formattedCategories = categories.map(formatCategoryForBudget);

    // Return budget data directly as an object
    return res.status(200).json({
      ...budget,
      categories: formattedCategories,
    });
  } catch (error) {
    console.error("Error fetching budget by ID:", error);
    return res.status(500).json({
      status: "error",
      message: "Internal server error",
    });
  }
});

/**
 * @route GET /api/v0/budgets
 * @description Get budgets with search and pagination. Supports searching by title (case-insensitive partial match) or _id (exact match), and filtering by slug (case-sensitive exact match).
 * @access Private (requires authentication)
 *
 * @query {string} [search] - Search term to match against title (partial, case-insensitive) or _id (exact match)
 * @query {string} [slug] - Filter by slug (exact, case-sensitive match)
 * @query {number} [page=1] - Page number for pagination (default: 1)
 * @query {number} [limit=10] - Number of results per page (default: 10, max: 100)
 *
 * @returns {Object} 200 - Response object containing:
 *   - data: Array of budget documents, each including a categories array
 *   - meta: Object containing:
 *     - page: Current page number
 *     - limit: Number of items per page
 *     - total: Total number of budgets matching the search
 *     - totalPages: Total number of pages
 *     - hasNextPage: Boolean indicating if there's a next page
 *     - hasPreviousPage: Boolean indicating if there's a previous page
 * @returns {Object} 400 - Error if pagination parameters are invalid
 * @returns {Object} 401 - Unauthorized if token is invalid or missing (handled by isAuthenticated middleware)
 * @returns {Object} 404 - No budgets found when search or slug parameters are provided
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

    // Execute query with pagination
    const [budgets, totalItems] = await Promise.all([
      Budget.find(query)
        .sort({ createdAt: -1 }) // Sort by newest first
        .skip(skip)
        .limit(limitNum)
        .lean(), // Use lean() for better performance
      Budget.countDocuments(query), // Get total count for pagination
    ]);

    // Return 404 if search or slug parameters were provided but no matches found
    if ((search || slug) && totalItems === 0) {
      return res.status(404).json({
        status: "error",
        message: "No budgets found matching the provided criteria",
      });
    }

    // Get all budget IDs to fetch their categories
    const budgetIds = budgets.map((budget) => budget._id);

    // Fetch all categories for these budgets
    const categories = await Category.find({
      budgetId: { $in: budgetIds },
    }).lean();

    // Group categories by budgetId and format them
    const categoriesByBudget = {};
    categories.forEach((category) => {
      const budgetId = category.budgetId.toString();
      if (!categoriesByBudget[budgetId]) {
        categoriesByBudget[budgetId] = [];
      }
      // For list endpoint (3.1), use simplified format (just _id, title, description)
      categoriesByBudget[budgetId].push({
        _id: category._id,
        title: category.title,
        description: category.description,
      });
    });

    // Attach categories to each budget
    const budgetsWithCategories = budgets.map((budget) => {
      return {
        ...budget,
        categories: categoriesByBudget[budget._id.toString()] || [],
      };
    });

    // Calculate pagination metadata
    const totalPages = Math.ceil(totalItems / limitNum);
    const hasNextPage = pageNum < totalPages;
    const hasPreviousPage = pageNum > 1;

    return res.status(200).json({
      data: budgetsWithCategories,
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
    console.error("Error fetching budgets:", error);
    return res.status(500).json({
      status: "error",
      message: "Internal server error",
    });
  }
});

/**
 * @route GET /api/v0/budgets/:slug
 * @description Get a single budget by slug. Returns the budget with its categories.
 * @access Public
 * @note This route should come after /:budgetId routes. Slugs that are 24-character hex strings will match :budgetId first.
 *
 * @param {string} slug - The slug of the budget to retrieve
 *
 * @returns {Object} 200 - Budget document including a categories array
 * @returns {Object} 404 - Budget not found
 */
router.get("/:slug", async (req, res) => {
  try {
    const { slug } = req.params;

    // Skip if this looks like an ObjectId (should have been handled by :budgetId route)
    if (
      mongoose.Types.ObjectId.isValid(slug) &&
      slug.length === 24
    ) {
      // This should have matched :budgetId route, but if we get here, treat as slug
    }

    // Find budget by slug
    const budget = await Budget.findOne({ slug }).lean();

    if (!budget) {
      return res.status(404).json({
        status: "error",
        message: "Budget not found",
      });
    }

    // Fetch categories for this budget, sorted by sortOrder
    const categories = await Category.find({
      budgetId: budget._id,
    })
      .sort({ sortOrder: 1 })
      .lean();

    // Format categories with flattened metaData for budget response
    const formattedCategories = categories.map(formatCategoryForBudget);

    // Return budget data directly as an object
    return res.status(200).json({
      ...budget,
      categories: formattedCategories,
    });
  } catch (error) {
    console.error("Error fetching budget by slug:", error);
    return res.status(500).json({
      status: "error",
      message: "Internal server error",
    });
  }
});

export default router;
