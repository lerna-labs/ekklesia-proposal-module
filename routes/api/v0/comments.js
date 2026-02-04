import { Router } from "express";
import mongoose from "mongoose";
import { Comment } from "../../../schema/Comment.js";
import { CommentLike } from "../../../schema/CommentLike.js";
import { Proposal } from "../../../schema/Proposal.js";
import { User } from "../../../schema/User.js";
import { Budget } from "../../../schema/Budget.js";
import { verifyToken } from "../../../helper/verifyToken.js";

const router = Router();

const COMMENT_STATUSES = ["live", "withdrawnByAdmin"];

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
 * Only admins can pass status=live|withdrawn|withdrawnByAdmin. Returns { error, message } for invalid/unauthorized.
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
  if (s === "withdrawn") return { status: "withdrawnByAdmin" };
  if (COMMENT_STATUSES.includes(s)) return { status: s };
  return { error: true, message: "Invalid status parameter. Must be: live, withdrawn, or withdrawnByAdmin." };
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
    userType: type,
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
 * GET /comments
 * API spec §3.6 — Paginated top-level comments for a proposal. Query: proposal (required), status, sort, direction, page, limit.
 * Public: live only. Admins can filter by status (live, withdrawn, withdrawnByAdmin). Response excludes proposalId, status, parentId, userId.
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

    const matchCondition = { proposalId: proposalObjectId, parentId: null, ...statusFilter };

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

    const [result] = await Comment.aggregate(pipeline);
    const total = result?.total?.[0]?.n ?? 0;
    const items = result?.items ?? [];
    const data = await Promise.all(items.map((doc) => formatComment(doc, proposal, budget, userId)));

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

/**
 * POST /comments
 * API spec §5.5 — Create a comment on a live proposal. Auth required. Before budget feedbackEndDate. Body: proposalId, content, optional parentId.
 */
router.post("/", async (req, res) => {
  try {
    const tokenResult = verifyToken(req);
    if (tokenResult.status !== "success" || !tokenResult.userId) {
      return res.status(401).json({ status: "error", message: "No token provided" });
    }
    const userId = tokenResult.userId.toString();

    const { proposalId, content, parentId } = req.body ?? {};
    if (!proposalId || typeof proposalId !== "string") {
      return res.status(400).json({ status: "error", message: "proposalId is required." });
    }
    if (content === undefined || content === null || (typeof content === "string" && !content.trim())) {
      return res.status(400).json({ status: "error", message: "content is required." });
    }

    const proposalIdTrim = proposalId.trim();
    if (!mongoose.Types.ObjectId.isValid(proposalIdTrim) || proposalIdTrim.length !== 24) {
      return res.status(400).json({ status: "error", message: "Invalid proposalId. Must be a valid ObjectId." });
    }

    const proposal = await Proposal.findById(proposalIdTrim).select("status budgetId").lean();
    if (!proposal) {
      return res.status(404).json({ status: "error", message: "Proposal not found" });
    }
    if (proposal.status !== "live") {
      return res.status(400).json({
        status: "error",
        message: "Comments can only be added to live proposals before the budget feedback period ends (feedbackEndDate).",
      });
    }

    const budget = proposal.budgetId
      ? await Budget.findById(proposal.budgetId).select("feedbackEndDate").lean()
      : null;
    if (budget && budget.feedbackEndDate && new Date() > new Date(budget.feedbackEndDate)) {
      return res.status(400).json({
        status: "error",
        message: "Comments can only be added to live proposals before the budget feedback period ends (feedbackEndDate).",
      });
    }

    if (parentId != null) {
      const parentIdStr = typeof parentId === "string" ? parentId.trim() : String(parentId);
      if (!mongoose.Types.ObjectId.isValid(parentIdStr) || parentIdStr.length !== 24) {
        return res.status(400).json({ status: "error", message: "Invalid parentId. Must be a valid ObjectId." });
      }
      const parentComment = await Comment.findOne({
        _id: parentIdStr,
        proposalId: new mongoose.Types.ObjectId(proposalIdTrim),
      }).lean();
      if (!parentComment) {
        return res.status(404).json({ status: "error", message: "Parent comment not found" });
      }
    }

    const doc = {
      proposalId: new mongoose.Types.ObjectId(proposalIdTrim),
      userId,
      content: typeof content === "string" ? content.trim() : String(content),
      status: "live",
    };
    if (parentId != null && parentId !== "") {
      doc.parentId = new mongoose.Types.ObjectId(typeof parentId === "string" ? parentId.trim() : parentId);
    }

    const comment = await Comment.create(doc);
    return res.status(201).json({
      _id: comment._id,
      proposalId: comment.proposalId,
      parentId: comment.parentId ?? null,
      userId: comment.userId,
      content: comment.content,
      status: comment.status,
      createdAt: comment.createdAt,
      updatedAt: comment.updatedAt,
    });
  } catch (error) {
    console.error("Error creating comment:", error);
    return res.status(500).json({ status: "error", message: "Internal server error" });
  }
});

/**
 * GET /comments/:commentId/replies
 * API spec §3.8 — Paginated replies to a comment. Query: status, page, limit. Ordered by createdAt asc. Parent must exist and be live.
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
    const replyQuery = { parentId: commentObjectId, ...statusFilter };

    const [replies, total] = await Promise.all([
      Comment.find(replyQuery)
        .sort({ createdAt: 1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Comment.countDocuments(replyQuery),
    ]);

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
 * POST /comments/:commentId/like
 * API spec §5.7 — Toggle like. 201 when added, 200 when removed. Live comment only; before budget feedbackEndDate.
 */
router.post("/:commentId/like", async (req, res) => {
  try {
    const tokenResult = verifyToken(req);
    if (tokenResult.status !== "success" || !tokenResult.userId) {
      return res.status(401).json({ status: "error", message: "No token provided" });
    }
    const userId = tokenResult.userId.toString();
    const { commentId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(commentId) || commentId.length !== 24) {
      return res.status(400).json({ status: "error", message: "Invalid commentId parameter. Must be a valid ObjectId." });
    }

    const comment = await Comment.findById(commentId).select("status proposalId").lean();
    if (!comment) {
      return res.status(404).json({ status: "error", message: "Comment not found" });
    }
    if (comment.status !== "live") {
      return res.status(400).json({ status: "error", message: "Only live comments can be liked." });
    }

    const proposal = comment.proposalId
      ? await Proposal.findById(comment.proposalId).select("status budgetId").lean()
      : null;
    if (!proposal || proposal.status !== "live") {
      return res.status(400).json({ status: "error", message: "Only live comments can be liked." });
    }
    const budget = proposal.budgetId
      ? await Budget.findById(proposal.budgetId).select("feedbackEndDate").lean()
      : null;
    if (budget?.feedbackEndDate && new Date() > new Date(budget.feedbackEndDate)) {
      return res.status(400).json({
        status: "error",
        message: "Comments on this proposal can no longer be liked (feedback period has ended).",
      });
    }

    const commentObjId = new mongoose.Types.ObjectId(commentId);
    const existing = await CommentLike.findOne({ commentId: commentObjId, userId });
    if (existing) {
      await CommentLike.deleteOne({ _id: existing._id });
      const likeCount = await CommentLike.countDocuments({ commentId: commentObjId });
      return res.status(200).json({
        status: "success",
        message: "Like removed.",
        liked: false,
        likeCount,
      });
    }
    await CommentLike.create({ commentId: commentObjId, userId });
    const likeCount = await CommentLike.countDocuments({ commentId: commentObjId });
    return res.status(201).json({
      status: "success",
      message: "Comment liked.",
      liked: true,
      likeCount,
    });
  } catch (error) {
    console.error("Error toggling comment like:", error);
    return res.status(500).json({ status: "error", message: "Internal server error" });
  }
});

/**
 * PUT /comments/:commentId/withdraw
 * API spec §5.8 — Budget admin withdraws a live comment. Body: category (required), comment (optional). Until feedbackEndDate.
 */
router.put("/:commentId/withdraw", async (req, res) => {
  try {
    const tokenResult = verifyToken(req);
    if (tokenResult.status !== "success" || !tokenResult.userId) {
      return res.status(401).json({ status: "error", message: "No token provided" });
    }
    const userId = tokenResult.userId.toString();
    const { commentId } = req.params;
    const { category, comment: commentReason } = req.body ?? {};

    const WITHDRAWAL_CATEGORIES = ["Inappropriate content", "Spam", "Policy violation", "Duplicate", "Other"];
    if (!category || !WITHDRAWAL_CATEGORIES.includes(category)) {
      return res.status(400).json({
        status: "error",
        message: "category is required and must be one of: Inappropriate content, Spam, Policy violation, Duplicate, Other.",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(commentId) || commentId.length !== 24) {
      return res.status(400).json({ status: "error", message: "Invalid commentId parameter. Must be a valid ObjectId." });
    }

    const comment = await Comment.findById(commentId).lean();
    if (!comment) {
      return res.status(404).json({ status: "error", message: "Comment not found" });
    }
    if (comment.status !== "live") {
      return res.status(400).json({
        status: "error",
        message: "Only live comments can be withdrawn by an admin.",
      });
    }

    const proposal = comment.proposalId
      ? await Proposal.findById(comment.proposalId).select("budgetId").lean()
      : null;
    const budget = proposal?.budgetId
      ? await Budget.findById(proposal.budgetId).select("admins feedbackEndDate").lean()
      : null;
    if (!budget || !Array.isArray(budget.admins) || !budget.admins.includes(userId)) {
      return res.status(403).json({ status: "error", message: "You do not have permission to withdraw this comment." });
    }
    if (budget.feedbackEndDate && new Date() > new Date(budget.feedbackEndDate)) {
      return res.status(400).json({
        status: "error",
        message: "Comments cannot be withdrawn by an admin after the budget feedback period has ended (feedbackEndDate).",
      });
    }

    const updated = await Comment.findByIdAndUpdate(
      commentId,
      {
        status: "withdrawnByAdmin",
        withdrawalDetails: {
          category,
          userId,
          comment: commentReason != null ? String(commentReason) : undefined,
          date: new Date(),
        },
      },
      { new: true }
    ).lean();

    return res.status(200).json({
      _id: updated._id,
      proposalId: updated.proposalId,
      userId: updated.userId,
      content: updated.content,
      status: updated.status,
      withdrawalDetails: updated.withdrawalDetails,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
    });
  } catch (error) {
    console.error("Error withdrawing comment:", error);
    return res.status(500).json({ status: "error", message: "Internal server error" });
  }
});

/**
 * GET /comments/:commentId
 * API spec §3.7 — Single comment by ID. Public: live only. Author: own in any status + withdrawalDetails. Admin: any + optional status param.
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
 * PUT /comments/:commentId
 * API spec §5.6 — Update comment content. Author only; within 15 minutes of creation.
 */
router.put("/:commentId", async (req, res) => {
  try {
    const tokenResult = verifyToken(req);
    if (tokenResult.status !== "success" || !tokenResult.userId) {
      return res.status(401).json({ status: "error", message: "No token provided" });
    }
    const userId = tokenResult.userId.toString();
    const { commentId } = req.params;
    const { content } = req.body ?? {};

    if (content === undefined || content === null || (typeof content === "string" && !content.trim())) {
      return res.status(400).json({ status: "error", message: "content is required." });
    }

    if (!mongoose.Types.ObjectId.isValid(commentId) || commentId.length !== 24) {
      return res.status(400).json({ status: "error", message: "Invalid commentId parameter. Must be a valid ObjectId." });
    }

    const comment = await Comment.findById(commentId).lean();
    if (!comment) {
      return res.status(404).json({ status: "error", message: "Comment not found" });
    }
    if (String(comment.userId) !== userId) {
      return res.status(403).json({ status: "error", message: "You do not have permission to update this comment." });
    }

    const fifteenMinutesMs = 15 * 60 * 1000;
    const createdAt = comment.createdAt ? new Date(comment.createdAt).getTime() : 0;
    if (Date.now() - createdAt > fifteenMinutesMs) {
      return res.status(400).json({
        status: "error",
        message: "Comments can only be updated within 15 minutes of creation.",
      });
    }

    const updated = await Comment.findByIdAndUpdate(
      commentId,
      { content: typeof content === "string" ? content.trim() : String(content) },
      { new: true }
    ).lean();

    return res.status(200).json({
      _id: updated._id,
      proposalId: updated.proposalId,
      parentId: updated.parentId ?? null,
      userId: updated.userId,
      content: updated.content,
      status: updated.status,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
    });
  } catch (error) {
    console.error("Error updating comment:", error);
    return res.status(500).json({ status: "error", message: "Internal server error" });
  }
});

export default router;
