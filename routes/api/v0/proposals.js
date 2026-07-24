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
import { isAuthenticated, rejectDuplicateParams, parsePagination } from "../../../helper/middleWare.js";
import { authenticatedWriteLimiter } from "../../../helper/rateLimiters.js";
import { verifyToken } from "../../../helper/verifyToken.js";
import { validateAddress } from "@lerna-labs/ekklesia-helpers/validation";
import { loadValidationScript } from "../../../validation/loadValidationScript.js";
import { applyPublicFieldExclusion } from "../../../validation/applyPublicFieldExclusion.js";
import { loadListProjectionScript } from "../../../validation/loadListProjectionScript.js";
import { verifyDeposit } from "@lerna-labs/ekklesia-helpers/cardano";
import {
  getDraftOnlySubmissionBlockMessage,
  getLiveSubmissionWindowBlockMessage,
} from "../../../helper/voteWindows.js";
import {
  sendProposalWithdrawnNotification,
  sendSubmissionConfirmedNotification,
} from "../../../mailer/notificationDispatch.js";
import { escapeRegex } from "../../../helper/escapeRegex.js";
import {
  TREASURY_VERIFY_UNAVAILABLE_MESSAGE,
  mapTreasuryProviderError,
  alertTreasuryProviderAuthFailure,
} from "../../../helper/mapTreasuryProviderError.js";

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

/** Build error tree for metaData.coldCredentialHash (matches Zod treeifyError shape for frontend). */
function coldCredentialHashErrorTree(message) {
  return {
    properties: {
      metaData: {
        properties: {
          coldCredentialHash: { errors: [message] },
        },
      },
    },
  };
}

/** Normalize CC cold credential hash for validation/lookup/storage. */
function normalizeCcColdCredentialHash(value) {
  return String(value ?? "").trim().toLowerCase();
}

function requiresTreasuryDonationValidation(voteDoc) {
  const amount = Number(voteDoc?.depositOptions?.treasuryDonation);
  return Number.isFinite(amount) && amount > 0;
}

/**
 * Respond for a failed treasury tx-hash validation: 503 when verification was
 * impossible (provider outage/throttle), else 400 for a genuine mismatch.
 * Never forwards provider error text to the client.
 * @param {import("express").Response} res
 * @param {{ unavailable?: boolean, retryAfterSeconds?: number, error?: string }} validationResult
 */
function sendTreasuryValidationFailure(res, validationResult) {
  if (validationResult.unavailable) {
    if (
      validationResult.retryAfterSeconds != null &&
      Number.isFinite(validationResult.retryAfterSeconds)
    ) {
      res.set(
        "Retry-After",
        String(Math.ceil(validationResult.retryAfterSeconds)),
      );
    }
    return res.status(503).json({
      status: "error",
      message: TREASURY_VERIFY_UNAVAILABLE_MESSAGE,
    });
  }
  return res.status(400).json({
    status: "error",
    message: "Validation failed",
    errors: treasuryTxHashErrorTree(validationResult.error),
  });
}

/**
 * Validate treasury donation tx hash: normalize, check uniqueness across proposals, call verifyDeposit.
 * @param {string} txHash - Raw tx hash from metaData.treasuryDonationTxHash
 * @param {string} proposerId - Proposer stake address
 * @param {import("mongoose").LeanDocument} voteDoc - Vote document (lean) with depositOptions.treasuryDonation
 * @param {{ excludeProposalIds?: import("mongoose").Types.ObjectId[] }} [options] - On PUT, exclude current proposal + versions
 * @returns {Promise<
 *   | { ok: true, normalizedHash: string }
 *   | { ok: false, error: string }
 *   | { ok: false, unavailable: true, retryAfterSeconds?: number, alert?: "auth" }
 * >}
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

  // Uniqueness: same hash not allowed on another non-draft proposal (case-insensitive).
  // Allow same proposal + its versions, and allow hash reuse while all matches are still drafts.
  const regex = new RegExp(`^${escapeRegex(normalizedHash)}$`, "i");
  const existing = await Proposal.findOne({
    "metaData.treasuryDonationTxHash": regex,
    status: { $ne: "draft" },
    _id: { $nin: excludeProposalIds },
  })
    .lean()
    .exec();
  if (existing) {
    return { ok: false, error: "This transaction hash is already used by another proposal" };
  }

  let result;
  try {
    result = await verifyDeposit(normalizedHash, proposerId, {
      treasuryDonation,
    });
  } catch (err) {
    const unavailable = mapTreasuryProviderError(err);
    if (unavailable) {
      if (unavailable.alert === "auth") {
        alertTreasuryProviderAuthFailure(err);
      }
      return unavailable;
    }
    throw err;
  }
  if (result !== true) {
    return { ok: false, error: result?.error ?? "Transaction verification failed" };
  }
  return { ok: true, normalizedHash };
}

/**
 * Whether another proposal on this vote is already live with the same cold credential hash
 * (case-insensitive). Draft / withdrawn / archived do not block.
 * @param {string} coldCredentialHash
 * @param {import("mongoose").Types.ObjectId | string} voteId
 * @param {{ excludeProposalIds?: import("mongoose").Types.ObjectId[] }} [options]
 */
async function isDuplicateCcColdCredentialHash(coldCredentialHash, voteId, options = {}) {
  const normalized = normalizeCcColdCredentialHash(coldCredentialHash);
  if (!normalized) return false;
  const excludeProposalIds = options.excludeProposalIds ?? [];
  const existing = await Proposal.findOne({
    voteId: new mongoose.Types.ObjectId(voteId),
    "metaData.coldCredentialHash": new RegExp(`^${escapeRegex(normalized)}$`, "i"),
    status: "live",
    _id: { $nin: excludeProposalIds },
  })
    .lean()
    .exec();
  return Boolean(existing);
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
    let coldCredentialHashDuplicate = false;
    if (
      req.body?.status === "live" &&
      voteDoc.validationScript === "cc-vote2026/validationScript.js"
    ) {
      coldCredentialHashDuplicate = await isDuplicateCcColdCredentialHash(
        req.body?.metaData?.coldCredentialHash,
        rawVoteId,
      );
    }
    const validation = script.validate(req.body, {
      voteDepositOptions: voteDoc.depositOptions ?? {},
      coldCredentialHashDuplicate,
    });

    if (!validation.success) {
      const errorTree = z.treeifyError(validation.error);
      return res.status(400).json({
        status: "error",
        message: "Validation failed",
        errors: errorTree,
      });
    }

    const { voteId, title, summary, status, metaData } = validation.data;

    const nowPost = new Date();
    if (status === "draft") {
      const draftMsg = getDraftOnlySubmissionBlockMessage(voteDoc, nowPost);
      if (draftMsg) {
        return res.status(400).json({ status: "error", message: draftMsg });
      }
    } else {
      const liveMsg = getLiveSubmissionWindowBlockMessage(voteDoc, nowPost);
      if (liveMsg) {
        return res.status(400).json({ status: "error", message: liveMsg });
      }
    }

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
    if (typeof sanitizedMetaData.coldCredentialHash === "string") {
      sanitizedMetaData.coldCredentialHash = normalizeCcColdCredentialHash(
        sanitizedMetaData.coldCredentialHash,
      );
    }

    if (status === "live" && requiresTreasuryDonationValidation(voteDoc)) {
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
        return sendTreasuryValidationFailure(res, validationResult);
      }
      sanitizedMetaData.treasuryDonationTxHash = validationResult.normalizedHash;
    }

    if (status === "live" && voteDoc.validationScript === "cc-vote2026/validationScript.js") {
      const dupCold = await isDuplicateCcColdCredentialHash(
        metaData?.coldCredentialHash,
        voteId,
        {},
      );
      if (dupCold) {
        return res.status(400).json({
          status: "error",
          message: "Validation failed",
          errors: coldCredentialHashErrorTree(
            "This cold credential hash is already used by another proposal",
          ),
        });
      }
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
    if (status === "live") {
      try {
        await sendSubmissionConfirmedNotification({
          proposerId,
          vote: {
            slug: voteDoc.slug,
            title: voteDoc.title,
          },
          proposal: {
            id: proposal._id,
            title: proposal.title,
          },
          timestamp: proposal.submittedAt ?? new Date(),
        });
      } catch (error) {
        console.error("Failed to send submission confirmed notification:", error);
      }
    }
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
      if (isProposer && voteDoc.reviewEndDate && now > new Date(voteDoc.reviewEndDate)) {
        return res.status(400).json({
          status: "error",
          message: "Proposer withdrawal is not allowed after the vote review period has ended (reviewEndDate).",
        });
      }
      if (
        isVoteAdmin &&
        voteDoc.votingStartDate &&
        now >= new Date(voteDoc.votingStartDate)
      ) {
        return res.status(400).json({
          status: "error",
          message: "Admin withdrawal is only allowed before voting starts (votingStartDate).",
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

    if (!isProposer) {
      try {
        await sendProposalWithdrawnNotification({
          proposerId: proposerIdStr,
          vote: {
            slug: voteDoc.slug,
            title: voteDoc.title,
          },
          proposal: {
            id: proposal._id,
            title: proposal.title,
          },
          reason: category,
          comment: commentStr,
          timestamp: now,
        });
      } catch (error) {
        console.error("Failed to send admin withdrawal notification:", error);
      }
    }

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
 * a reference is appended to versions via an optimistic version CAS (`findOneAndUpdate`) before
 * applying the update (409 on concurrent conflict).
 * @access Private (proposer only)
 * @returns {Object} 200 - Updated proposal (with versions array when previous version was archived)
 * @returns {Object} 400 - Invalid proposalId; validation error; archived (read-only); status change when live; or locked after reviewEndDate
 * @returns {Object} 403 - Not the proposer
 * @returns {Object} 404 - Proposal not found
 * @returns {Object} 409 - Live proposal was modified concurrently (optimistic lock conflict); retry
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

    let voteDepositOptionsForValidation = voteDoc.depositOptions ?? {};
    const rawBodyVoteId = req.body?.voteId;
    if (
      rawBodyVoteId &&
      mongoose.Types.ObjectId.isValid(rawBodyVoteId) &&
      String(rawBodyVoteId).length === 24
    ) {
      const voteForBody = await Vote.findById(rawBodyVoteId).lean();
      if (voteForBody) {
        voteDepositOptionsForValidation = voteForBody.depositOptions ?? {};
      }
    }

    // Draft → live (and other live submits): enforce at most one live proposal per cold credential on this vote.
    let coldCredentialHashDuplicate = false;
    if (
      req.body?.status === "live" &&
      voteDoc.validationScript === "cc-vote2026/validationScript.js"
    ) {
      const voteIdForCcColdDup =
        rawBodyVoteId &&
        mongoose.Types.ObjectId.isValid(rawBodyVoteId) &&
        String(rawBodyVoteId).length === 24
          ? String(rawBodyVoteId)
          : String(proposal.voteId);
      const excludeProposalIds = [
        proposal._id,
        ...(proposal.versions ?? []).map((v) => v._id),
      ];
      coldCredentialHashDuplicate = await isDuplicateCcColdCredentialHash(
        req.body?.metaData?.coldCredentialHash,
        voteIdForCcColdDup,
        { excludeProposalIds },
      );
    }

    validation = script.validate(req.body, {
      existingProposal: {
        status: proposal.status,
        metaData: proposal.metaData ?? {},
      },
      voteDepositOptions: voteDepositOptionsForValidation,
      coldCredentialHashDuplicate,
    });

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
    const targetVoteDoc = await Vote.findById(voteId).lean();
    if (!targetVoteDoc) {
      return res.status(400).json({
        status: "error",
        message: "Vote not found",
      });
    }

    const nowPut = new Date();
    if (proposal.status === "draft") {
      if (status === "draft") {
        const draftMsg = getDraftOnlySubmissionBlockMessage(targetVoteDoc, nowPut);
        if (draftMsg) {
          return res.status(400).json({ status: "error", message: draftMsg });
        }
      } else if (status === "live") {
        const liveMsg = getLiveSubmissionWindowBlockMessage(targetVoteDoc, nowPut);
        if (liveMsg) {
          return res.status(400).json({ status: "error", message: liveMsg });
        }
      }
    }

    const previousStatus = proposal.status;
    /** @type {number|null} Expected live version for optimistic CAS (F-006). */
    let expectedVersion = null;

    // When proposal is already live: reject status change; enforce reviewEndDate lock
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
      expectedVersion = proposal.version ?? 1;
    }

    const rawMetaData = metaData;
    const sanitizedMetaData = { ...rawMetaData };
    if (typeof sanitizedMetaData.coldCredentialHash === "string") {
      sanitizedMetaData.coldCredentialHash = normalizeCcColdCredentialHash(
        sanitizedMetaData.coldCredentialHash,
      );
    }

    if (proposal.status === "live") {
      sanitizedMetaData.treasuryDonationTxHash =
        proposal.metaData?.treasuryDonationTxHash ?? sanitizedMetaData.treasuryDonationTxHash;
    } else if (
      status === "live" &&
      requiresTreasuryDonationValidation(targetVoteDoc)
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
        targetVoteDoc,
        { excludeProposalIds },
      );
      if (!validationResult.ok) {
        return sendTreasuryValidationFailure(res, validationResult);
      }
      sanitizedMetaData.treasuryDonationTxHash = validationResult.normalizedHash;
    }

    if (
      status === "live" &&
      targetVoteDoc.validationScript === "cc-vote2026/validationScript.js"
    ) {
      const excludeProposalIds = [
        proposal._id,
        ...(proposal.versions ?? []).map((v) => v._id),
      ];
      const hasDuplicateColdCredential = await isDuplicateCcColdCredentialHash(
        metaData?.coldCredentialHash,
        voteId,
        { excludeProposalIds },
      );
      if (hasDuplicateColdCredential) {
        return res.status(400).json({
          status: "error",
          message: "Validation failed",
          errors: coldCredentialHashErrorTree(
            "This cold credential hash is already used by another proposal",
          ),
        });
      }
    }

    // Live → live: archive snapshot then atomic CAS on version (F-006)
    if (previousStatus === "live") {
      const currentState = proposal.toObject ? proposal.toObject() : { ...proposal };
      delete currentState._id;
      delete currentState.createdAt;
      delete currentState.updatedAt;
      currentState.status = "archived";
      currentState.versions = [];
      currentState.currentProposalId = proposal._id;
      const archivedDoc = new Proposal(currentState);
      await archivedDoc.save();

      const updated = await Proposal.findOneAndUpdate(
        {
          _id: proposal._id,
          status: "live",
          version: expectedVersion,
        },
        {
          $set: {
            voteId: new mongoose.Types.ObjectId(voteId),
            title,
            summary: summary ?? "",
            status: "live",
            metaData: sanitizedMetaData,
            submittedAt: proposal.submittedAt || new Date(),
          },
          $inc: { version: 1 },
          $push: {
            versions: {
              _id: archivedDoc._id,
              createdAt: archivedDoc.createdAt,
            },
          },
        },
        { new: true },
      );

      if (!updated) {
        await Proposal.deleteOne({ _id: archivedDoc._id });
        return res.status(409).json({
          status: "error",
          message: "Proposal was modified concurrently. Please retry.",
        });
      }

      return res.status(200).json(updated.toObject ? updated.toObject() : updated);
    }

    proposal.voteId = new mongoose.Types.ObjectId(voteId);
    proposal.title = title;
    proposal.summary = summary ?? "";
    proposal.status = status;
    proposal.metaData = sanitizedMetaData;
    if (status === "live") {
      proposal.submittedAt = proposal.submittedAt || new Date();
      // Version is set only by the backend, never from request body. 1 on first submit.
      if (previousStatus === "draft") {
        proposal.version = 1;
      }
    }
    await proposal.save();

    if (previousStatus === "draft" && status === "live") {
      try {
        await sendSubmissionConfirmedNotification({
          proposerId: userId,
          vote: {
            slug: targetVoteDoc.slug,
            title: targetVoteDoc.title,
          },
          proposal: {
            id: proposal._id,
            title: proposal.title,
          },
          timestamp: proposal.submittedAt ?? new Date(),
        });
      } catch (error) {
        console.error("Failed to send submission confirmed notification:", error);
      }
    }

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
    const tokenResult = await verifyToken(req);
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
    payload = await applyPublicFieldExclusion(payload, voteDoc, {
      isProposer,
      isAdmin: isVoteAdmin,
    });

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
router.get("/", rejectDuplicateParams("search", "vote", "proposer", "status", "sort", "direction"), parsePagination, async (req, res) => {
  try {
    const {
      search,
      vote: voteParam,
      proposer,
      status: statusParam,
      sort: sortParam,
      direction = "desc",
    } = req.query;
    const { page, limit } = req.pagination;

    // Require vote parameter
    if (!voteParam) {
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
    const tokenResult = await verifyToken(req);
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
    const statusStr = statusParam ?? "";
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

    // Add generic non-status filters defined on the vote.
    for (const option of resolvedFilterOptions) {
      if (option.param === "status" || option.param === "proposer") continue;
      const paramValue = req.query[option.param];
      if (!paramValue || typeof paramValue !== "string") continue;

      const values = paramValue
        .split(",")
        .map((value) => value.trim())
        .filter((value) => value.length > 0);

      if (values.length === 0) {
        return res.status(400).json({
          status: "error",
          message: `Invalid ${option.param} parameter. Must provide at least one value.`,
        });
      }

      if (!option.multiple && values.length > 1) {
        return res.status(400).json({
          status: "error",
          message: `Invalid ${option.param} parameter. Multiple values are not allowed.`,
        });
      }

      let validValues = new Set();
      if (option.optionsPath) {
        const optionList = getByPath(voteDoc, option.optionsPath);
        if (!Array.isArray(optionList) || optionList.length === 0) {
          return res.status(400).json({
            status: "error",
            message: `Invalid ${option.param} parameter. This vote has no options defined at ${option.optionsPath}.`,
          });
        }

        const valueKey = option.optionValueKey ?? "_id";
        validValues = new Set(
          optionList.map((item) => String(item[valueKey] ?? "")).filter(Boolean)
        );
      } else if (Array.isArray(option.allowedValues) && option.allowedValues.length > 0) {
        validValues = new Set(option.allowedValues.map((value) => String(value)));
      } else {
        // No optionsPath and no allowedValues means this filter is misconfigured.
        return res.status(400).json({
          status: "error",
          message: `Invalid ${option.param} filter configuration. Expected optionsPath or allowedValues.`,
        });
      }

      const invalidValues = values.filter((value) => !validValues.has(value));
      if (invalidValues.length > 0) {
        return res.status(400).json({
          status: "error",
          message: `Invalid ${option.param} parameter. Allowed values: ${Array.from(validValues).join(", ")}.`,
        });
      }

      const condition = {
        [option.field]: option.multiple ? { $in: values } : values[0],
      };
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

    const skip = (page - 1) * limit;
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
        { $limit: limit },
      ];
      proposals = await Proposal.aggregate(pipeline);
      proposals = proposals.map((p) => ({ ...p, commentCount: p.commentCount ?? 0 }));
    } else {
      proposals = await Proposal.find(query)
        .sort(sortOption)
        .skip(skip)
        .limit(limit)
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
    proposals = await Promise.all(
      proposals.map(async (proposal) => {
        const isProposer =
          String(proposal.proposerId ?? "").trim() === authenticatedUserId;
        return applyPublicFieldExclusion(proposal, voteDoc, {
          isProposer,
          isAdmin: isVoteAdmin,
        });
      }),
    );

    let projectProposalListItem = null;
    if (voteDoc.listProjectionScript) {
      const projectionMod = await loadListProjectionScript(
        voteDoc.listProjectionScript,
      );
      if (projectionMod?.projectProposalListItem) {
        projectProposalListItem = projectionMod.projectProposalListItem;
      }
    }

    const fallbackProjection = (proposal) => {
      const {
        metaData,
        withdrawalReason,
        signature,
        userId,
        commentCount,
        versions,
        ...rest
      } = proposal ?? {};
      return {
        ...rest,
        metaData: metaData ?? null,
        versions,
        commentCount: commentCount ?? 0,
      };
    };

    const formattedProposals = proposals.map((proposal) => {
      const isProposer =
        String(proposal?.proposerId ?? "").trim() === authenticatedUserId;
      if (!projectProposalListItem) {
        return fallbackProjection(proposal);
      }
      try {
        return projectProposalListItem(proposal, {
          vote: voteDoc,
          isProposer,
          isAdmin: isVoteAdmin,
        });
      } catch (err) {
        console.warn(
          "list projection failed for proposal",
          proposal?._id,
          err?.message ?? err,
        );
        return fallbackProjection(proposal);
      }
    });

    // Calculate pagination metadata
    const totalPages = Math.ceil(totalItems / limit);
    const hasNextPage = page < totalPages;
    const hasPreviousPage = page > 1;

    return res.status(200).json({
      data: formattedProposals,
      meta: {
        page: page,
        limit: limit,
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
