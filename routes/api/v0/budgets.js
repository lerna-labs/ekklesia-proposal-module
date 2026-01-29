// express router
import { Router } from "express";
const router = Router();

// schema import
import { Budget } from "../../../schema/Budget.js";
import { Category } from "../../../schema/Category.js";

// helper imports
import mongoose from "mongoose";
import { isAuthenticated } from "../../../helper/middleWare.js";

/**
 * @route GET /api/v0/budgets/:slug
 * @description Get a single budget by slug. Returns the budget with its categories.
 * @access Public
 *
 * @param {string} slug - The slug of the budget to retrieve
 *
 * @returns {Object} 200 - Budget document including a categories array
 * @returns {Object} 404 - Budget not found
 */
router.get("/:slug", async (req, res) => {
  try {
    const { slug } = req.params;

    // Find budget by slug
    const budget = await Budget.findOne({ slug }).lean();

    if (!budget) {
      return res.status(404).json({
        status: "error",
        message: "Budget not found",
      });
    }

    // Fetch categories for this budget
    const categories = await Category.find({
      budgetId: budget._id,
    }).lean();

    // Format categories, including _id, title and description
    const formattedCategories = categories.map((category) => ({
      _id: category._id,
      title: category.title,
      description: category.description,
      pillar: category.pillar,
      pillarDescription: category.pillarDescription,
      highLevelThematicArea: category.highLevelThematicArea,
      descriptionStrategy: category.descriptionStrategy,
      expectedEnhancement: category.expectedEnhancement,
    }));

    // Exclude admins and timestamps from budget response
    const { admins, createdAt, updatedAt, ...budgetWithoutExcluded } = budget;

    // Return budget data directly as an object
    return res.status(200).json({
      ...budgetWithoutExcluded,
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

/**
 * @route GET /api/v0/budgets
 * @description Get budgets with search and pagination. Supports searching by title (case-insensitive partial match) or _id (exact match).
 * @access Private (requires authentication)
 *
 * @query {string} [search] - Search term to match against title (partial, case-insensitive) or _id (exact match)
 * @query {number} [page=1] - Page number for pagination (default: 1)
 * @query {number} [limit=10] - Number of results per page (default: 10, max: 100)
 *
 * @returns {Object} 200 - Response object containing:
 *   - budgets: Array of budget documents, each including a categories array
 *   - pagination: Object containing:
 *     - currentPage: Current page number
 *     - totalPages: Total number of pages
 *     - totalItems: Total number of budgets matching the search
 *     - itemsPerPage: Number of items per page
 *     - hasNextPage: Boolean indicating if there's a next page
 *     - hasPreviousPage: Boolean indicating if there's a previous page
 * @returns {Object} 400 - Error if pagination parameters are invalid
 * @returns {Object} 401 - Unauthorized if token is invalid or missing (handled by isAuthenticated middleware)
 */
router.get("/", async (req, res) => {
  try {
    const { search, page = 1, limit = 10 } = req.query;

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

    // Get all budget IDs to fetch their categories
    const budgetIds = budgets.map((budget) => budget._id);

    // Fetch all categories for these budgets
    const categories = await Category.find({
      budgetId: { $in: budgetIds },
    }).lean();

    // Group categories by budgetId, including _id, title and description
    const categoriesByBudget = {};
    categories.forEach((category) => {
      const budgetId = category.budgetId.toString();
      if (!categoriesByBudget[budgetId]) {
        categoriesByBudget[budgetId] = [];
      }
      categoriesByBudget[budgetId].push({
        _id: category._id,
        title: category.title,
        description: category.description,
      });
    });

    // Attach categories to each budget, excluding admins and timestamps
    const budgetsWithCategories = budgets.map((budget) => {
      const { admins, createdAt, updatedAt, ...budgetWithoutExcluded } = budget;
      return {
        ...budgetWithoutExcluded,
        categories: categoriesByBudget[budget._id.toString()] || [],
      };
    });

    // Calculate pagination metadata
    const totalPages = Math.ceil(totalItems / limitNum);
    const hasNextPage = pageNum < totalPages;
    const hasPreviousPage = pageNum > 1;

    return res.status(200).json({
      budgets: budgetsWithCategories,
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
    console.error("Error fetching budgets:", error);
    return res.status(500).json({
      status: "error",
      message: "Internal server error",
    });
  }
});

export default router;
