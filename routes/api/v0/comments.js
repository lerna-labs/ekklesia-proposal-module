import { Router } from "express";
import mongoose from "mongoose";
import { Comment } from "../../../schema/Comment.js";
import { CommentLike } from "../../../schema/CommentLike.js";
import { Proposal } from "../../../schema/Proposal.js";
import { User } from "../../../schema/User.js";
import { Vote } from "../../../schema/Vote.js";
import { verifyToken } from "../../../helper/verifyToken.js";
import {
  isAuthenticated,
  rejectDuplicateParams,
  parsePagination,
} from "../../../helper/middleWare.js";
import {
  authenticatedWriteLimiter,
  commentWritePerHourLimiter,
  commentWritePerMinuteLimiter,
} from "../../../helper/rateLimiters.js";
import { getFeedbackWindowBlockPhase } from "../../../helper/voteWindows.js";
import { queueCommentNotificationEvent } from "../../../mailer/notificationDispatch.js";

const router = Router();

const COMMENT_STATUSES = ["live", "withdrawnByAdmin"];

async function getAuthenticatedUserId(req) {
  const tokenResult = await verifyToken(req);
  if (tokenResult.status === "success" && tokenResult.userId) {
    return tokenResult.userId.toString();
  }
  return null;
}

function isVoteAdmin(proposal, vote, userId) {
  return (
    !!userId &&
    proposal?.voteId &&
    vote?.admins &&
    Array.isArray(vote.admins) &&
    vote.admins.includes(userId)
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
  const normalizedStatus = s === "withdrawnbyadmin" ? "withdrawnByAdmin" : s;
  if (!isAdmin) {
    if (normalizedStatus !== "live") {
      return { error: true, message: "Only admins can filter comments by status other than live." };
    }
    return { status: "live" };
  }
  if (normalizedStatus === "live") return { status: "live" };
  if (normalizedStatus === "withdrawn") return { status: "withdrawnByAdmin" };
  if (COMMENT_STATUSES.includes(normalizedStatus)) return { status: normalizedStatus };
  return {
    error: true,
    message: "Invalid status parameter. Must be: live, withdrawn, or withdrawnByAdmin.",
  };
}

/**
 * Status condition when no status param: include withdrawn comments for admin and for comment author.
 * Public: live only. Admin: live + withdrawn. Authenticated (not admin): live + own withdrawn.
 */
function getCommentStatusCondition(statusParam, isAdmin, userId) {
  if (statusParam && typeof statusParam === "string" && statusParam.trim()) {
    const result = getCommentStatusFilter(statusParam.trim(), isAdmin);
    if (result.error) return result;
    return result;
  }
  if (!userId) return { status: "live" };
  if (isAdmin) return { $or: [{ status: "live" }, { status: "withdrawnByAdmin" }] };
  return { $or: [{ status: "live" }, { status: "withdrawnByAdmin", userId }] };
}

/**
 * Visibility filter for *direct replies* to a comment, aligned with getCommentStatusCondition(null, …)
 * and formatComment reply counting. Used in GET /comments aggregation so sort-by-replyCount matches displayed counts.
 */
function getVisibleReplyStatusMatch(isAdmin, viewerUserId) {
  if (!viewerUserId) return { status: "live" };
  if (isAdmin) return { $or: [{ status: "live" }, { status: "withdrawnByAdmin" }] };
  return {
    $or: [
      { status: "live" },
      {
        status: "withdrawnByAdmin",
        userId: String(viewerUserId),
      },
    ],
  };
}

/** Build comment response shape: author with type, replyCount, likeCount; exclude proposalId, status, parentId, userId. Include withdrawalDetails if authenticatedUserId matches author or user is vote admin. */
async function formatComment(comment, proposal, vote, authenticatedUserId = null) {
  const userId = comment.userId;
  const userDoc = userId ? await User.findById(userId).select("_id name").lean() : null;
  let type = "user";
  if (proposal?.proposerId && userId === proposal.proposerId) type = "proposer";
  else if (
    vote?.admins &&
    Array.isArray(vote.admins) &&
    userDoc?._id != null &&
    vote.admins.includes(String(userDoc._id))
  )
    type = "admin";
  const isAdmin = isVoteAdmin(proposal, vote, authenticatedUserId);
  // Prefer precomputed replyCount from aggregation when present (used by GET /comments).
  const replyCountFromDoc = typeof comment?.replyCount === "number" ? comment.replyCount : null;
  // Fallback for endpoints that fetch single comments/replies without aggregation.
  const replyStatusCondition = getCommentStatusCondition(null, isAdmin, authenticatedUserId);
  const replyQuery =
    replyStatusCondition && !replyStatusCondition.error
      ? { parentId: comment._id, ...replyStatusCondition }
      : { parentId: comment._id, status: "live" };
  const replyCount =
    replyCountFromDoc != null ? replyCountFromDoc : await Comment.countDocuments(replyQuery);
  const likeCount = await CommentLike.countDocuments({ commentId: comment._id });
  const userLiked =
    authenticatedUserId &&
    (await CommentLike.exists({ commentId: comment._id, userId: authenticatedUserId }));
  const author = userDoc
    ? { _id: userDoc._id, name: userDoc.name ?? null, type }
    : userId
      ? { _id: userId, name: null, type }
      : null;
  const isAuthor = authenticatedUserId && author && author._id === authenticatedUserId;
  const result = {
    _id: comment._id,
    parentId: comment.parentId ?? null,
    content: comment.content,
    createdAt: comment.createdAt,
    updatedAt: comment.updatedAt,
    replyCount,
    likeCount,
    userLiked: !!userLiked,
    author,
  };
  if ((isAuthor || isAdmin) && comment.withdrawalDetails) {
    const { _id, ...wd } = comment.withdrawalDetails;
    result.withdrawalDetails = wd;
  }
  return result;
}

/**
 * GET /comments
 * API spec §3.6 — Paginated top-level comments for a proposal. Query: proposal (required), status, sort, direction, page, limit.
 * Public: live only. Admins can filter by status (live, withdrawn, withdrawnByAdmin). Response excludes proposalId, status, parentId, userId.
 */
router.get(
  "/",
  rejectDuplicateParams("proposal", "status", "sort", "direction", "userType"),
  parsePagination,
  async (req, res) => {
    try {
      const proposalId = req.query.proposal;
      const statusParam = req.query.status;
      const sortParam = (req.query.sort || "date").toString().trim().toLowerCase();
      const direction = (req.query.direction || "desc").toString().trim().toLowerCase();
      const userTypeParam = (req.query.userType || "").toString().trim().toLowerCase();
      const { page, limit } = req.pagination;

      if (!proposalId || typeof proposalId !== "string") {
        return res.status(400).json({
          status: "error",
          message: "Missing proposal parameter.",
        });
      }

      const proposalTerm = proposalId.trim();
      if (!mongoose.Types.ObjectId.isValid(proposalTerm) || proposalTerm.length !== 24) {
        return res.status(400).json({
          status: "error",
          message: "Invalid proposal parameter. Must be a valid ObjectId.",
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

      const proposal = await Proposal.findById(proposalTerm).select("proposerId voteId").lean();
      if (!proposal) {
        return res.status(404).json({
          status: "error",
          message: "Proposal not found",
        });
      }

      const vote = proposal.voteId
        ? await Vote.findById(proposal.voteId).select("admins").lean()
        : null;

      const userId = await getAuthenticatedUserId(req);
      const isAdmin = isVoteAdmin(proposal, vote, userId);
      const statusFilter = getCommentStatusCondition(statusParam, isAdmin, userId);
      if (statusFilter.error) {
        return res.status(400).json({ status: "error", message: statusFilter.message });
      }

      const proposalObjectId = new mongoose.Types.ObjectId(proposalTerm);
      const sortDirection = direction === "asc" ? 1 : -1;
      const skip = (page - 1) * limit;

      const VALID_USER_TYPES = ["proposer", "admin", "drep"];
      const userTypeFilter =
        userTypeParam.length > 0
          ? userTypeParam
              .split(",")
              .map((s) => s.trim().toLowerCase())
              .filter((s) => VALID_USER_TYPES.includes(s))
          : null;

      const proposalProposerId = proposal?.proposerId ? String(proposal.proposerId) : "";
      const voteAdmins = vote?.admins && Array.isArray(vote.admins) ? vote.admins.map(String) : [];

      const replyVisibilityMatch = getVisibleReplyStatusMatch(isAdmin, userId);

      const matchCondition = { proposalId: proposalObjectId, parentId: null, ...statusFilter };
      const threadMatchCondition = { proposalId: proposalObjectId, ...statusFilter };

      const userTypeExpr = {
        $cond: {
          if: {
            $and: [
              { $ne: [proposalProposerId, ""] },
              { $eq: [{ $toString: "$userId" }, proposalProposerId] },
            ],
          },
          then: "proposer",
          else: {
            $cond: {
              if: { $in: [{ $toString: "$userId" }, voteAdmins] },
              then: "admin",
              else: {
                $cond: {
                  if: { $regexMatch: { input: { $toString: "$userId" }, regex: "^drep" } },
                  then: "drep",
                  else: "user",
                },
              },
            },
          },
        },
      };

      const replyUserTypeExpr = {
        $cond: {
          if: {
            $and: [
              { $ne: [proposalProposerId, ""] },
              { $eq: [{ $toString: "$$reply.userId" }, proposalProposerId] },
            ],
          },
          then: "proposer",
          else: {
            $cond: {
              if: { $in: [{ $toString: "$$reply.userId" }, voteAdmins] },
              then: "admin",
              else: {
                $cond: {
                  if: { $regexMatch: { input: { $toString: "$$reply.userId" }, regex: "^drep" } },
                  then: "drep",
                  else: "user",
                },
              },
            },
          },
        },
      };

      const pipeline = [
        { $match: matchCondition },
        { $addFields: { userType: userTypeExpr } },
        {
          $graphLookup: {
            from: "comments",
            startWith: "$_id",
            connectFromField: "_id",
            connectToField: "parentId",
            as: "threadReplies",
            restrictSearchWithMatch: {
              proposalId: proposalObjectId,
              ...replyVisibilityMatch,
            },
          },
        },
        {
          $addFields: {
            replyCount: { $size: "$threadReplies" },
          },
        },
        ...(userTypeFilter && userTypeFilter.length > 0
          ? [
              {
                $addFields: {
                  userTypeMatch: { $in: ["$userType", userTypeFilter] },
                  replyUserTypeMatchCount: {
                    $size: {
                      $filter: {
                        input: "$threadReplies",
                        as: "reply",
                        cond: { $in: [replyUserTypeExpr, userTypeFilter] },
                      },
                    },
                  },
                },
              },
              {
                $match: {
                  $or: [{ userTypeMatch: true }, { replyUserTypeMatchCount: { $gt: 0 } }],
                },
              },
            ]
          : []),
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
                              $not: {
                                $in: ["$$kv.k", ["lastLogin", "createdAt", "updatedAt"]],
                              },
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
                  threadReplies: 0,
                  likeCountArr: 0,
                  userArr: 0,
                  user: 0,
                  userTypeMatch: 0,
                  replyUserTypeMatchCount: 0,
                },
              },
            ],
          },
        },
      ];

      const [aggregateResult, threadTotal] = await Promise.all([
        Comment.aggregate(pipeline),
        Comment.countDocuments(threadMatchCondition),
      ]);
      const result = aggregateResult?.[0] ?? null;
      const total = result?.total?.[0]?.n ?? 0;
      const items = result?.items ?? [];
      const data = await Promise.all(
        items.map((doc) => formatComment(doc, proposal, vote, userId)),
      );

      const totalPages = Math.ceil(total / limit);
      return res.status(200).json({
        data,
        meta: {
          page,
          limit,
          total,
          threadTotal,
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
  },
);

/**
 * POST /comments
 * API spec §5.5 — Create a comment on a live proposal. Auth required. Before vote feedbackEndDate. Body: proposalId, content, optional parentId.
 * Only authenticated users can create comments; userId is taken exclusively from the verified token, never from the request body.
 */
router.post(
  "/",
  isAuthenticated,
  commentWritePerMinuteLimiter,
  commentWritePerHourLimiter,
  async (req, res) => {
    try {
      const userId = req.userId.toString();

      const { proposalId, content, parentId } = req.body ?? {};
      if (!proposalId || typeof proposalId !== "string") {
        return res.status(400).json({ status: "error", message: "proposalId is required." });
      }
      if (
        content === undefined ||
        content === null ||
        (typeof content === "string" && !content.trim())
      ) {
        return res.status(400).json({ status: "error", message: "content is required." });
      }
      const contentStr = typeof content === "string" ? content.trim() : String(content).trim();
      if (!contentStr) {
        return res.status(400).json({ status: "error", message: "content is required." });
      }
      if (contentStr.length > 2000) {
        return res
          .status(400)
          .json({ status: "error", message: "Comment content must be at most 2000 characters." });
      }

      const proposalIdTrim = proposalId.trim();
      if (!mongoose.Types.ObjectId.isValid(proposalIdTrim) || proposalIdTrim.length !== 24) {
        return res
          .status(400)
          .json({ status: "error", message: "Invalid proposalId. Must be a valid ObjectId." });
      }

      const proposal = await Proposal.findById(proposalIdTrim)
        .select("status voteId proposerId title")
        .lean();
      if (!proposal) {
        return res.status(404).json({ status: "error", message: "Proposal not found" });
      }
      if (proposal.status !== "live") {
        return res.status(400).json({
          status: "error",
          message:
            "Comments can only be added to live proposals before the vote feedback period ends (feedbackEndDate).",
        });
      }

      const vote = proposal.voteId
        ? await Vote.findById(proposal.voteId).select("feedbackStartDate feedbackEndDate").lean()
        : null;
      const feedbackPhase = vote ? getFeedbackWindowBlockPhase(vote, new Date()) : null;
      if (feedbackPhase === "before_start") {
        return res.status(400).json({
          status: "error",
          message: "The vote feedback period has not started yet (feedbackStartDate).",
        });
      }
      if (feedbackPhase === "after_end") {
        return res.status(400).json({
          status: "error",
          message:
            "Comments can only be added to live proposals before the vote feedback period ends (feedbackEndDate).",
        });
      }

      if (parentId != null) {
        const parentIdStr = typeof parentId === "string" ? parentId.trim() : String(parentId);
        if (!mongoose.Types.ObjectId.isValid(parentIdStr) || parentIdStr.length !== 24) {
          return res
            .status(400)
            .json({ status: "error", message: "Invalid parentId. Must be a valid ObjectId." });
        }
        const parentComment = await Comment.findOne({
          _id: parentIdStr,
          proposalId: new mongoose.Types.ObjectId(proposalIdTrim),
        }).lean();
        if (!parentComment) {
          return res.status(404).json({ status: "error", message: "Parent comment not found" });
        }
        if (parentComment.status !== "live") {
          return res.status(400).json({
            status: "error",
            message: "Replies cannot be added to withdrawn comments.",
          });
        }
      }

      const doc = {
        proposalId: new mongoose.Types.ObjectId(proposalIdTrim),
        userId,
        content: contentStr,
        status: "live",
      };
      if (parentId != null && parentId !== "") {
        doc.parentId = new mongoose.Types.ObjectId(
          typeof parentId === "string" ? parentId.trim() : parentId,
        );
      }

      const duplicate = await Comment.exists({
        proposalId: doc.proposalId,
        userId,
        content: contentStr,
      });
      if (duplicate) {
        return res.status(400).json({
          status: "error",
          message: "You have already posted this same comment on this proposal.",
        });
      }

      const comment = await Comment.create(doc);
      if (String(proposal.proposerId ?? "") !== userId) {
        try {
          await queueCommentNotificationEvent({
            recipientUserId: proposal.proposerId,
            proposalId: proposal._id,
            commentId: comment._id,
          });
        } catch (error) {
          console.error("Failed to queue comment notification event:", error);
        }
      }
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
  },
);

/**
 * GET /comments/:commentId/replies
 * API spec §3.8 — Paginated replies to a comment. Query: status, page, limit. Ordered by createdAt asc. Parent must exist and be live.
 */
router.get(
  "/:commentId/replies",
  rejectDuplicateParams("status"),
  parsePagination,
  async (req, res) => {
    try {
      const { commentId } = req.params;
      const statusParam = req.query.status;
      const { page, limit } = req.pagination;

      if (!mongoose.Types.ObjectId.isValid(commentId) || commentId.length !== 24) {
        return res.status(400).json({
          status: "error",
          message: "Invalid commentId parameter. Must be a valid ObjectId.",
        });
      }

      const parentComment = await Comment.findById(commentId).lean();
      if (!parentComment || parentComment.status !== "live") {
        return res.status(404).json({ status: "error", message: "Comment not found" });
      }

      const proposal = parentComment.proposalId
        ? await Proposal.findById(parentComment.proposalId).select("proposerId voteId").lean()
        : null;
      const vote = proposal?.voteId
        ? await Vote.findById(proposal.voteId).select("admins").lean()
        : null;
      const userId = await getAuthenticatedUserId(req);
      const isAdmin = isVoteAdmin(proposal, vote, userId);
      const statusFilter = getCommentStatusCondition(statusParam, isAdmin, userId);
      if (statusFilter.error) {
        return res.status(400).json({ status: "error", message: statusFilter.message });
      }

      const commentObjectId = new mongoose.Types.ObjectId(commentId);
      const replyQuery = { parentId: commentObjectId, ...statusFilter };

      const [aggregateResult, total] = await Promise.all([
        Comment.aggregate([
          { $match: replyQuery },
          { $sort: { createdAt: 1 } },
          { $skip: (page - 1) * limit },
          { $limit: limit },
          {
            $graphLookup: {
              from: "comments",
              startWith: "$_id",
              connectFromField: "_id",
              connectToField: "parentId",
              as: "threadReplies",
              restrictSearchWithMatch: {
                proposalId: parentComment.proposalId,
                ...statusFilter,
              },
            },
          },
          {
            $addFields: {
              replyCount: { $size: "$threadReplies" },
            },
          },
          {
            $project: {
              threadReplies: 0,
            },
          },
        ]),
        Comment.countDocuments(replyQuery),
      ]);
      const replies = aggregateResult ?? [];

      const data = await Promise.all(replies.map((r) => formatComment(r, proposal, vote, userId)));
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
      console.error("Error fetching comment replies:", error);
      return res.status(500).json({ status: "error", message: "Internal server error" });
    }
  },
);

/**
 * POST /comments/:commentId/like
 * API spec §5.7 — Toggle like. 201 when added, 200 when removed. Live comment only; before vote feedbackEndDate.
 */
router.post("/:commentId/like", isAuthenticated, authenticatedWriteLimiter, async (req, res) => {
  try {
    const userId = req.userId.toString();
    const { commentId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(commentId) || commentId.length !== 24) {
      return res.status(400).json({
        status: "error",
        message: "Invalid commentId parameter. Must be a valid ObjectId.",
      });
    }

    const comment = await Comment.findById(commentId).select("status proposalId").lean();
    if (!comment) {
      return res.status(404).json({ status: "error", message: "Comment not found" });
    }
    if (comment.status !== "live") {
      return res.status(400).json({ status: "error", message: "Only live comments can be liked." });
    }

    const proposal = comment.proposalId
      ? await Proposal.findById(comment.proposalId).select("status voteId").lean()
      : null;
    if (!proposal || proposal.status !== "live") {
      return res.status(400).json({ status: "error", message: "Only live comments can be liked." });
    }
    const vote = proposal.voteId
      ? await Vote.findById(proposal.voteId).select("feedbackStartDate feedbackEndDate").lean()
      : null;
    const likePhase = vote ? getFeedbackWindowBlockPhase(vote, new Date()) : null;
    if (likePhase === "before_start") {
      return res.status(400).json({
        status: "error",
        message:
          "Comments on this proposal cannot be liked before the vote feedback period starts (feedbackStartDate).",
      });
    }
    if (likePhase === "after_end") {
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
 * API spec §5.8 — Vote admin withdraws a live comment. Body: category (required), comment (optional). Until feedbackEndDate.
 */
router.put("/:commentId/withdraw", isAuthenticated, authenticatedWriteLimiter, async (req, res) => {
  try {
    const userId = req.userId.toString();
    const { commentId } = req.params;
    const { category, comment: commentReason } = req.body ?? {};

    const WITHDRAWAL_CATEGORIES = [
      "Inappropriate content",
      "Spam",
      "Policy violation",
      "Duplicate",
      "Other",
    ];
    if (!category || !WITHDRAWAL_CATEGORIES.includes(category)) {
      return res.status(400).json({
        status: "error",
        message:
          "category is required and must be one of: Inappropriate content, Spam, Policy violation, Duplicate, Other.",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(commentId) || commentId.length !== 24) {
      return res.status(400).json({
        status: "error",
        message: "Invalid commentId parameter. Must be a valid ObjectId.",
      });
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
      ? await Proposal.findById(comment.proposalId).select("voteId").lean()
      : null;
    const vote = proposal?.voteId
      ? await Vote.findById(proposal.voteId)
          .select("admins feedbackStartDate feedbackEndDate")
          .lean()
      : null;
    if (!vote || !Array.isArray(vote.admins) || !vote.admins.includes(userId)) {
      return res
        .status(403)
        .json({ status: "error", message: "You do not have permission to withdraw this comment." });
    }
    const withdrawPhase = getFeedbackWindowBlockPhase(vote, new Date());
    if (withdrawPhase === "before_start") {
      return res.status(400).json({
        status: "error",
        message:
          "Comments cannot be withdrawn by an admin before the vote feedback period starts (feedbackStartDate).",
      });
    }
    if (withdrawPhase === "after_end") {
      return res.status(400).json({
        status: "error",
        message:
          "Comments cannot be withdrawn by an admin after the vote feedback period has ended (feedbackEndDate).",
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
      { returnDocument: "after" },
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
      return res.status(400).json({
        status: "error",
        message: "Invalid commentId parameter. Must be a valid ObjectId.",
      });
    }

    const comment = await Comment.findById(commentId).lean();
    if (!comment) {
      return res.status(404).json({ status: "error", message: "Comment not found" });
    }

    const proposal = comment.proposalId
      ? await Proposal.findById(comment.proposalId).select("proposerId voteId").lean()
      : null;
    const vote = proposal?.voteId
      ? await Vote.findById(proposal.voteId).select("admins").lean()
      : null;
    const userId = await getAuthenticatedUserId(req);
    const isAdmin = isVoteAdmin(proposal, vote, userId);
    // User._id is String (bech32), and comment.userId is now also String
    const commentUser = comment.userId
      ? await User.findById(comment.userId).select("_id").lean()
      : null;
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
          const matches =
            statusFilter.status === "live"
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

    const data = await formatComment(comment, proposal, vote, userId);
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
router.put(
  "/:commentId",
  isAuthenticated,
  commentWritePerMinuteLimiter,
  commentWritePerHourLimiter,
  async (req, res) => {
    try {
      const userId = req.userId.toString();
      const { commentId } = req.params;
      const { content } = req.body ?? {};

      if (
        content === undefined ||
        content === null ||
        (typeof content === "string" && !content.trim())
      ) {
        return res.status(400).json({ status: "error", message: "content is required." });
      }
      const contentStr = typeof content === "string" ? content.trim() : String(content).trim();
      if (!contentStr) {
        return res.status(400).json({ status: "error", message: "content is required." });
      }
      if (contentStr.length > 2000) {
        return res
          .status(400)
          .json({ status: "error", message: "Comment content must be at most 2000 characters." });
      }

      if (!mongoose.Types.ObjectId.isValid(commentId) || commentId.length !== 24) {
        return res.status(400).json({
          status: "error",
          message: "Invalid commentId parameter. Must be a valid ObjectId.",
        });
      }

      const comment = await Comment.findById(commentId).lean();
      if (!comment) {
        return res.status(404).json({ status: "error", message: "Comment not found" });
      }
      if (String(comment.userId) !== userId) {
        return res
          .status(403)
          .json({ status: "error", message: "You do not have permission to update this comment." });
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
        { content: contentStr },
        { returnDocument: "after" },
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
  },
);

export default router;
