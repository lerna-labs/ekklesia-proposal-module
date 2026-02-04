import { Router } from "express";
import mongoose from "mongoose";
import { Comment } from "../../../schema/Comment.js";
import { CommentLike } from "../../../schema/CommentLike.js";
import { Proposal } from "../../../schema/Proposal.js";
import { User } from "../../../schema/User.js";
import { Budget } from "../../../schema/Budget.js";
import { verifyToken } from "../../../helper/verifyToken.js";

const router = Router();

const COMMENT_STATUSES = ["live", "withdrawnByAuthor", "withdrawnByAdmin"];
const STATUS_WITHDRAWN = "withdrawn";

function getAuthenticatedUserId(req) {
  const tokenResult = verifyToken(req);
  if (tokenResult.status === "success" && tokenResult.userId) {
    return tokenResult.userId.toString();
  }
  return null;
}

function isBudgetAdmin(proposal, budget, userId) {
  return (
    !!userId &&
    proposal?.budgetId &&
    budget?.admins &&
    Array.isArray(budget.admins) &&
    budget.admins.includes(userId)
  );
}

/**
 * Returns MongoDB status condition for comment queries. Default (no param or non-admin) is { status: "live" }.
 * Only admins can pass status=live|withdrawn|withdrawnByAuthor|withdrawnByAdmin. Returns { error, message } for invalid/unauthorized.
 */
function getCommentStatusFilter(statusParam, isAdmin) {
  if (!statusParam || typeof statusParam !== "string") {
    return { status: "live" };
  }
  const s = statusParam.trim().toLowerCase();
  if (!isAdmin) {
    if (s !== "live") {
      return { error: true, message: "Only admins can filter comments by status other than live." };
    }
    return { status: "live" };
  }
  if (s === "live") return { status: "live" };
  if (s === STATUS_WITHDRAWN) return { status: { $in: ["withdrawnByAuthor", "withdrawnByAdmin"] } };
  if (COMMENT_STATUSES.includes(s)) return { status: s };
  return { error: true, message: `Invalid status parameter. Must be: live, ${STATUS_WITHDRAWN}, withdrawnByAuthor, or withdrawnByAdmin.` };
}

/** Build comment response shape: user with type, replyCount, likeCount; exclude proposalId, status, parentId, userId. Include withdrawalDetails if authenticatedUserId matches comment.userId. */
async function formatComment(comment, proposal, budget, authenticatedUserId = null) {
  // User._id is a String (bech32 address), and comment.userId is now also String
  const user = comment.userId
    ? await User.findById(comment.userId)
        .select("-lastLogin -createdAt -updatedAt")
        .lean()
    : null;
  let type = "user";
  if (proposal?.proposerId && comment.userId === proposal.proposerId) type = "proposer";
  else if (budget?.admins && Array.isArray(budget.admins) && user?._id != null && budget.admins.includes(String(user._id))) type = "admin";
  const replyCount = await Comment.countDocuments({ parentId: comment._id, status: "live" });
  const likeCount = await CommentLike.countDocuments({ commentId: comment._id });
  const userWithType = user ? { ...user, type } : null;
  const isAuthor = authenticatedUserId && user && user._id === authenticatedUserId;
  const result = {
    _id: comment._id,
    userType: comment.userType,
    content: comment.content,
    createdAt: comment.createdAt,
    updatedAt: comment.updatedAt,
    replyCount,
    likeCount,
    user: userWithType,
  };
  if (isAuthor && comment.withdrawalDetails) {
    result.withdrawalDetails = comment.withdrawalDetails;
  }
  return result;
}

/**
 * @route GET /api/v0/comments/:commentId/replies
 * @description Get paginated replies (parentId=commentId), ordered by createdAt ascending. Default status=live; admins can use status param to filter.
 */
router.get("/:commentId/replies", async (req, res) => {
  try {
    const { commentId } = req.params;
    const statusParam = req.query.status;
    const page = parseInt(req.query.page, 10) || 1;
    const limit = Math.min(parseInt(req.query.limit, 10) || 10, 100);

    if (!mongoose.Types.ObjectId.isValid(commentId) || commentId.length !== 24) {
      return res.status(400).json({ status: "error", message: "Invalid commentId parameter. Must be a valid ObjectId." });
    }
    if (page < 1 || isNaN(page)) {
      return res.status(400).json({ status: "error", message: "Invalid page parameter. Must be a positive integer." });
    }
    if (limit < 1 || isNaN(limit)) {
      return res.status(400).json({ status: "error", message: "Invalid limit parameter. Must be a positive integer between 1 and 100." });
    }

    const parentComment = await Comment.findById(commentId).lean();
    if (!parentComment || parentComment.status !== "live") {
      return res.status(404).json({ status: "error", message: "Comment not found" });
    }

    const proposal = parentComment.proposalId
      ? await Proposal.findById(parentComment.proposalId).select("proposerId budgetId").lean()
      : null;
    const budget = proposal?.budgetId ? await Budget.findById(proposal.budgetId).select("admins").lean() : null;
    const userId = getAuthenticatedUserId(req);
    const isAdmin = isBudgetAdmin(proposal, budget, userId);
    const statusFilter = getCommentStatusFilter(statusParam, isAdmin);
    if (statusFilter.error) {
      return res.status(400).json({ status: "error", message: statusFilter.message });
    }

    const commentObjectId = new mongoose.Types.ObjectId(commentId);
    let replyQuery = { parentId: commentObjectId, ...statusFilter };
    if (statusFilter.status === "live" && userId) {
      // Filter authors' own withdrawn comments after fetching
      // We'll filter in memory after the query since User._id (String) and comment.userId (ObjectId) don't match directly
      replyQuery = {
        parentId: commentObjectId,
        $or: [
          { status: "live" },
          { status: { $in: ["withdrawnByAuthor", "withdrawnByAdmin"] } },
        ],
      };
    }

    // If filtering for authors' withdrawn comments, we need to fetch all and filter in memory
    // because User._id (String/bech32) and comment.userId (ObjectId) don't match directly
    let replies, total;
    if (statusFilter.status === "live" && userId) {
      const allReplies = await Comment.find(replyQuery).sort({ createdAt: 1 }).lean();
      // Lookup users for all replies to check authorship
      const repliesWithUsers = await Promise.all(
        allReplies.map(async (r) => {
          // User._id is String (bech32), and comment.userId is now also String
          const commentUser = r.userId ? await User.findById(r.userId).select("_id").lean() : null;
          return { reply: r, user: commentUser };
        })
      );
      const filteredReplies = repliesWithUsers
        .filter(({ reply, user }) => {
          if (reply.status === "live") return true;
          // Only include if the comment's user _id matches the authenticated userId (bech32)
          return user && user._id === userId;
        })
        .map(({ reply }) => reply);
      total = filteredReplies.length;
      replies = filteredReplies.slice((page - 1) * limit, page * limit);
    } else {
      [replies, total] = await Promise.all([
        Comment.find(replyQuery)
          .sort({ createdAt: 1 })
          .skip((page - 1) * limit)
          .limit(limit)
          .lean(),
        Comment.countDocuments(replyQuery),
      ]);
    }

    const data = await Promise.all(replies.map((r) => formatComment(r, proposal, budget, userId)));
    const totalPages = Math.ceil(total / limit);
    return res.status(200).json({
      data,
      meta: { page, limit, total, totalPages, hasNextPage: page < totalPages, hasPreviousPage: page > 1 },
    });
  } catch (error) {
    console.error("Error fetching comment replies:", error);
    return res.status(500).json({ status: "error", message: "Internal server error" });
  }
});

/**
 * @route GET /api/v0/comments/:commentId
 * @description Get a single comment by id. Public: only live. Admins can pass status to retrieve non-live comments.
 */
router.get("/:commentId", async (req, res) => {
  try {
    const { commentId } = req.params;
    const statusParam = req.query.status;
    if (!mongoose.Types.ObjectId.isValid(commentId) || commentId.length !== 24) {
      return res.status(400).json({ status: "error", message: "Invalid commentId parameter. Must be a valid ObjectId." });
    }

    const comment = await Comment.findById(commentId).lean();
    if (!comment) {
      return res.status(404).json({ status: "error", message: "Comment not found" });
    }

    const proposal = comment.proposalId
      ? await Proposal.findById(comment.proposalId).select("proposerId budgetId").lean()
      : null;
    const budget = proposal?.budgetId ? await Budget.findById(proposal.budgetId).select("admins").lean() : null;
    const userId = getAuthenticatedUserId(req);
    const isAdmin = isBudgetAdmin(proposal, budget, userId);
    // User._id is String (bech32), and comment.userId is now also String
    const commentUser = comment.userId ? await User.findById(comment.userId).select("_id").lean() : null;
    const isAuthor = userId && commentUser && commentUser._id === userId;

    if (statusParam) {
      const statusFilter = getCommentStatusFilter(statusParam, isAdmin);
      if (statusFilter.error) {
        return res.status(400).json({ status: "error", message: statusFilter.message });
      }
      if (isAdmin) {
        if (comment.status === "live") {
          if (statusFilter.status !== "live") {
            return res.status(404).json({ status: "error", message: "Comment not found" });
          }
        } else {
          const matches = statusFilter.status === "live"
            ? comment.status === "live"
            : statusFilter.status?.$in
              ? statusFilter.status.$in.includes(comment.status)
              : comment.status === statusFilter.status;
          if (!matches) {
            return res.status(404).json({ status: "error", message: "Comment not found" });
          }
        }
      }
    }
    if (comment.status !== "live" && !isAdmin && !isAuthor) {
      return res.status(404).json({ status: "error", message: "Comment not found" });
    }

    const data = await formatComment(comment, proposal, budget, userId);
    return res.status(200).json(data);
  } catch (error) {
    console.error("Error fetching comment:", error);
    return res.status(500).json({ status: "error", message: "Internal server error" });
  }
});

/**
 * @route GET /api/v0/comments
 * @description Get paginated top-level comments (parentId = null) for a proposal. Query param proposal required. Optional sort (date = createdAt) and direction (asc/desc). Excludes proposalId, status from comments; user excludes lastLogin, createdAt, updatedAt.
 * @access Public
 *
 * @query {string} proposal - Proposal ID (required, valid ObjectId)
 * @query {string} [status] - Comment status filter. Default live. Admins only: live, withdrawn, withdrawnByAuthor, withdrawnByAdmin.
 * @query {string} [sort=date] - Sort field: date (createdAt), replyCount, or likeCount
 * @query {string} [direction=desc] - Sort direction: asc or desc
 * @query {number} [page=1] - Page number (1-based)
 * @query {number} [limit=10] - Items per page (max 100)
 *
 * @returns {Object} 200 - { data: comments, meta: pagination }
 * @returns {Object} 400 - Missing/invalid proposal, status, sort, direction or pagination params
 * @returns {Object} 404 - Proposal not found
 */
router.get("/", async (req, res) => {
  try {
    const proposalId = req.query.proposal;
    const statusParam = req.query.status;
    const sortParam = (req.query.sort || "date").toString().trim().toLowerCase();
    const direction = (req.query.direction || "desc").toString().trim().toLowerCase();
    const page = parseInt(req.query.page, 10) || 1;
    const limit = Math.min(parseInt(req.query.limit, 10) || 10, 100);

    if (!proposalId || typeof proposalId !== "string") {
      return res.status(400).json({
        status: "error",
        message: "Missing proposal parameter.",
      });
    }

    const proposalTerm = proposalId.trim();
    if (
      !mongoose.Types.ObjectId.isValid(proposalTerm) ||
      proposalTerm.length !== 24
    ) {
      return res.status(400).json({
        status: "error",
        message: "Invalid proposal parameter. Must be a valid ObjectId.",
      });
    }

    if (page < 1 || isNaN(page)) {
      return res.status(400).json({
        status: "error",
        message: "Invalid page parameter. Must be a positive integer.",
      });
    }

    if (limit < 1 || isNaN(limit)) {
      return res.status(400).json({
        status: "error",
        message:
          "Invalid limit parameter. Must be a positive integer between 1 and 100.",
      });
    }

    const sortFieldMap = { date: "createdAt", replycount: "replyCount", likecount: "likeCount" };
    const sortField = sortFieldMap[sortParam];
    if (!sortField) {
      return res.status(400).json({
        status: "error",
        message: "Invalid sort parameter. Must be: date, replyCount, or likeCount.",
      });
    }
    if (direction !== "asc" && direction !== "desc") {
      return res.status(400).json({
        status: "error",
        message: "Invalid direction parameter. Must be asc or desc.",
      });
    }

    const proposal = await Proposal.findById(proposalTerm).select("proposerId budgetId").lean();
    if (!proposal) {
      return res.status(404).json({
        status: "error",
        message: "Proposal not found",
      });
    }

    const budget = proposal.budgetId
      ? await Budget.findById(proposal.budgetId).select("admins").lean()
      : null;

    const userId = getAuthenticatedUserId(req);
    const isAdmin = isBudgetAdmin(proposal, budget, userId);
    const statusFilter = getCommentStatusFilter(statusParam, isAdmin);
    if (statusFilter.error) {
      return res.status(400).json({ status: "error", message: statusFilter.message });
    }

    const proposalObjectId = new mongoose.Types.ObjectId(proposalTerm);
    const sortDirection = direction === "asc" ? 1 : -1;
    const skip = (page - 1) * limit;

    let matchCondition = { proposalId: proposalObjectId, parentId: null, ...statusFilter };
    let filterAuthorWithdrawnAfterLookup = false;
    if (statusFilter.status === "live" && userId) {
      // We need to filter authors' withdrawn comments after User lookup
      // because User._id is String (bech32) but comment.userId is ObjectId
      filterAuthorWithdrawnAfterLookup = true;
      matchCondition = {
        proposalId: proposalObjectId,
        parentId: null,
        $or: [
          { status: "live" },
          { status: { $in: ["withdrawnByAuthor", "withdrawnByAdmin"] } },
        ],
      };
    }

    const pipeline = [
      { $match: matchCondition },
      {
        $lookup: {
          from: "comments",
          let: { cid: "$_id" },
          pipeline: [
            { $match: { $expr: { $eq: ["$parentId", "$$cid"] } } },
            { $count: "count" },
          ],
          as: "replyCountArr",
        },
      },
      {
        $addFields: {
          replyCount: {
            $ifNull: [{ $arrayElemAt: ["$replyCountArr.count", 0] }, 0],
          },
        },
      },
      {
        $lookup: {
          from: "commentlikes",
          let: { cid: "$_id" },
          pipeline: [
            { $match: { $expr: { $eq: ["$commentId", "$$cid"] } } },
            { $count: "count" },
          ],
          as: "likeCountArr",
        },
      },
      {
        $addFields: {
          likeCount: {
            $ifNull: [{ $arrayElemAt: ["$likeCountArr.count", 0] }, 0],
          },
        },
      },
      { $sort: { [sortField]: sortDirection } },
      {
        $facet: {
          total: [{ $count: "n" }],
          items: [
            { $skip: skip },
            { $limit: limit },
            {
              $lookup: {
                from: "users",
                localField: "userId",
                foreignField: "_id",
                as: "userArr",
              },
            },
            {
              $addFields: {
                user: {
                  $cond: {
                    if: { $gt: [{ $size: "$userArr" }, 0] },
                    then: {
                      $arrayToObject: {
                        $filter: {
                          input: { $objectToArray: { $arrayElemAt: ["$userArr", 0] } },
                          as: "kv",
                          cond: {
                            $notIn: [
                              "$$kv.k",
                              ["lastLogin", "createdAt", "updatedAt"],
                            ],
                          },
                        },
                      },
                    },
                    else: null,
                  },
                },
              },
            },
            ...(filterAuthorWithdrawnAfterLookup
              ? [
                  {
                    $match: {
                      $or: [
                        { status: "live" },
                        {
                          $and: [
                            { status: { $in: ["withdrawnByAuthor", "withdrawnByAdmin"] } },
                            { "user._id": userId },
                          ],
                        },
                      ],
                    },
                  },
                ]
              : []),
            {
              $project: {
                proposalId: 0,
                status: 0,
                parentId: 0,
                replyCountArr: 0,
                likeCountArr: 0,
                userArr: 0,
              },
            },
          ],
        },
      },
    ];

    // If filtering for authors' withdrawn comments, we need to filter before pagination
    // So we'll modify the pipeline to fetch all matching comments, filter, then paginate
    if (filterAuthorWithdrawnAfterLookup) {
      // Remove pagination from pipeline, filter after user lookup, then apply pagination
      const pipelineWithoutPagination = pipeline.slice(0, -1); // Remove $facet
      const sortStage = pipeline[pipeline.length - 2]; // Get $sort stage
      const facetStage = pipeline[pipeline.length - 1]; // Get $facet stage
      
      // Modify facet to not paginate yet
      const modifiedFacet = {
        ...facetStage.$facet,
        items: [
          ...facetStage.$facet.items.slice(0, -3), // Remove $skip, $limit, and keep user lookup
          {
            $match: {
              $or: [
                { status: "live" },
                {
                  $and: [
                    { status: { $in: ["withdrawnByAuthor", "withdrawnByAdmin"] } },
                    { "user._id": userId },
                  ],
                },
              ],
            },
          },
          ...facetStage.$facet.items.slice(-3), // Add back $skip, $limit after filtering
        ],
      };
      
      pipeline[pipeline.length - 1] = { $facet: modifiedFacet };
    }
    
    const [result] = await Comment.aggregate(pipeline);
    let total = result?.total?.[0]?.n ?? 0;
    let items = result?.items ?? [];

    // Format all comments first
    let formattedItems = await Promise.all(items.map((doc) => formatComment(doc, proposal, budget, userId)));
    
    // If filtering for authors' withdrawn comments, filter after formatting
    // This is necessary because User._id (String/bech32) and comment.userId (ObjectId) 
    // don't match directly, so the aggregation $lookup may not work correctly
    if (filterAuthorWithdrawnAfterLookup) {
      // Keep track of original items to check status
      const itemsMap = new Map(items.map((item) => [item._id.toString(), item]));
      
      formattedItems = formattedItems.filter((item) => {
        const originalComment = itemsMap.get(item._id.toString());
        if (!originalComment) return false;
        // Include all live comments
        if (originalComment.status === "live") return true;
        // Only include withdrawn comments if user._id matches authenticated userId (bech32)
        return item.user && item.user._id === userId;
      });
      
      // Recalculate total by counting all matching comments (not just paginated ones)
      // Note: This is approximate since we'd need to format all comments to get exact count
      // For better accuracy, we could fetch all matching comments, format, filter, and count
      // But that's expensive. For now, use a separate count query.
      const allMatchingComments = await Comment.find(matchCondition).lean();
      const allFormatted = await Promise.all(
        allMatchingComments.map((doc) => formatComment(doc, proposal, budget, userId))
      );
      const filteredCount = allFormatted.filter((item) => {
        const originalComment = allMatchingComments.find(
          (c) => c._id.toString() === item._id.toString()
        );
        if (!originalComment) return false;
        if (originalComment.status === "live") return true;
        return item.user && item.user._id === userId;
      }).length;
      total = filteredCount;
    }
    
    const data = formattedItems;

    const totalPages = Math.ceil(total / limit);
    return res.status(200).json({
      data,
      meta: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    });
  } catch (error) {
    console.error("Error fetching comments:", error);
    return res.status(500).json({
      status: "error",
      message: "Internal server error",
    });
  }
});

export default router;
