/**
 * Vote timing/window rules test suite.
 *
 * Covers:
 * 1) Submit draft->live before submission window opens.
 * 2) Submit draft->live after submission window closes.
 * 3) Re-submit live proposal during review window.
 * 4) Re-submit live proposal after review window.
 * 5) Post comment outside feedback window.
 *
 * Additional sensible window checks:
 * - Create draft after submission window closes.
 * - Update draft after submission window closes.
 * - Like comment after feedback window closes.
 * - Admin withdraw comment after feedback window closes.
 *
 * Treasury hash strategy:
 * - Reuse one hash for all live transitions via TESTKIT_TREASURY_HASH
 *   (fallback: TESTKIT_TREASURY_DONATION_TX_HASH).
 */
import path from "path";
import { fileURLToPath } from "url";
import { login, readDrepId } from "../helpers/session.js";
import { resolveVoteAndLiveProposal } from "../helpers/testProposal.js";
import { connect, disconnect } from "../helpers/testkitMongo.js";
import { Vote } from "../../schema/Vote.js";
import { Proposal } from "../../schema/Proposal.js";
import { Comment } from "../../schema/Comment.js";

const API_BASE_URL = process.env.API_BASE_URL || "http://localhost:3000/api/v0";
const LOG = process.env.TESTKIT_LOG !== "0" && process.env.TESTKIT_LOG !== "false";
const TREASURY_HASH =
  process.env.TESTKIT_TREASURY_HASH?.trim() ||
  process.env.TESTKIT_TREASURY_DONATION_TX_HASH?.trim() ||
  "";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TESTKIT_ROOT = path.resolve(__dirname, "..");
const KEYS_DREP01 = path.join(TESTKIT_ROOT, "keys", "drep01_jag");
const KEYS_DREP02 = path.join(TESTKIT_ROOT, "keys", "drep02_w9c");

const createdVoteIds = [];
const createdProposalIds = [];
const createdCommentIds = [];

function log(step, message, detail) {
  if (!LOG) return;
  const prefix = `[window-rules:${step}]`;
  console.log(prefix, message);
  if (detail !== undefined) console.log(prefix, " ", detail);
}

function assertWindowError(status, bodyText, expectedRegex) {
  expect(status).toBe(400);
  expect((bodyText || "").toLowerCase()).toMatch(expectedRegex);
}

function cloneWithoutMongoMeta(doc) {
  const obj = doc.toObject ? doc.toObject() : { ...doc };
  delete obj._id;
  delete obj.createdAt;
  delete obj.updatedAt;
  delete obj.__v;
  return obj;
}

function buildWindowDates(mode, now = Date.now()) {
  const day = 24 * 60 * 60 * 1000;
  if (mode === "submission_not_open") {
    return {
      submissionStartDate: new Date(now + day),
      submissionEndDate: new Date(now + 2 * day),
      feedbackStartDate: new Date(now + 2 * day),
      feedbackEndDate: new Date(now + 3 * day),
      reviewStartDate: new Date(now + 3 * day),
      reviewEndDate: new Date(now + 4 * day),
    };
  }
  if (mode === "submission_closed") {
    return {
      submissionStartDate: new Date(now - 4 * day),
      submissionEndDate: new Date(now - 3 * day),
      feedbackStartDate: new Date(now - 3 * day),
      feedbackEndDate: new Date(now - 2 * day),
      reviewStartDate: new Date(now - 2 * day),
      reviewEndDate: new Date(now - day),
    };
  }
  if (mode === "review_open") {
    return {
      submissionStartDate: new Date(now - 4 * day),
      submissionEndDate: new Date(now - 3 * day),
      feedbackStartDate: new Date(now - 2 * day),
      feedbackEndDate: new Date(now - day),
      reviewStartDate: new Date(now - 6 * 60 * 60 * 1000),
      reviewEndDate: new Date(now + 6 * 60 * 60 * 1000),
    };
  }
  if (mode === "review_closed") {
    return {
      submissionStartDate: new Date(now - 5 * day),
      submissionEndDate: new Date(now - 4 * day),
      feedbackStartDate: new Date(now - 3 * day),
      feedbackEndDate: new Date(now - 2 * day),
      reviewStartDate: new Date(now - day),
      reviewEndDate: new Date(now - 60 * 60 * 1000),
    };
  }
  // feedback_closed
  return {
    submissionStartDate: new Date(now - 4 * day),
    submissionEndDate: new Date(now - 3 * day),
    feedbackStartDate: new Date(now - 2 * day),
    feedbackEndDate: new Date(now - 60 * 60 * 1000),
    reviewStartDate: new Date(now - 30 * 60 * 1000),
    reviewEndDate: new Date(now + day),
  };
}

describe("Vote timing window rules", () => {
  let drepAId;
  let drepASession;
  let drepBSession;
  let sourceVote;
  let sourceProposal;

  const fixtures = {};

  beforeAll(async () => {
    if (!TREASURY_HASH) {
      throw new Error(
        "Missing TESTKIT_TREASURY_HASH (or TESTKIT_TREASURY_DONATION_TX_HASH). " +
          "This suite reuses a single hash; set one in __testkit/.env."
      );
    }

    drepAId = readDrepId(KEYS_DREP01);
    drepASession = await login(API_BASE_URL, { keysDir: KEYS_DREP01 });
    drepBSession = await login(API_BASE_URL, { keysDir: KEYS_DREP02 });

    await connect();

    const ids = await resolveVoteAndLiveProposal(API_BASE_URL);
    sourceVote = await Vote.findById(ids.voteId);
    sourceProposal = await Proposal.findById(ids.proposalId);

    if (!sourceVote || !sourceProposal) {
      throw new Error("Failed to load source vote/proposal for timing fixtures.");
    }

    const sourceVoteObj = cloneWithoutMongoMeta(sourceVote);
    const sourceProposalObj = cloneWithoutMongoMeta(sourceProposal);
    const runSuffix = Date.now().toString(36);

    const makeVote = async (name, mode) => {
      const w = buildWindowDates(mode);
      const vote = await Vote.create({
        ...sourceVoteObj,
        title: `[testkit window] ${name}`,
        slug: `testkit-window-${name}-${runSuffix}`,
        admins: [drepAId, readDrepId(KEYS_DREP02)],
        ...w,
      });
      createdVoteIds.push(vote._id);
      return vote;
    };

    fixtures.votePreOpen = await makeVote("preopen", "submission_not_open");
    fixtures.voteSubmissionClosed = await makeVote("subclosed", "submission_closed");
    fixtures.voteReviewOpen = await makeVote("reviewopen", "review_open");
    fixtures.voteReviewClosed = await makeVote("reviewclosed", "review_closed");
    fixtures.voteFeedbackClosed = await makeVote("feedbackclosed", "feedback_closed");

    const makeProposal = async (voteId, status, title) => {
      const proposal = await Proposal.create({
        ...sourceProposalObj,
        voteId,
        proposerId: drepAId,
        title: `[testkit window] ${title}`,
        status,
        submittedAt: status === "live" ? new Date() : undefined,
      });
      createdProposalIds.push(proposal._id);
      return proposal;
    };

    fixtures.draftPreOpen = await makeProposal(
      fixtures.votePreOpen._id,
      "draft",
      "draft-preopen"
    );
    fixtures.draftSubmissionClosed = await makeProposal(
      fixtures.voteSubmissionClosed._id,
      "draft",
      "draft-subclosed"
    );
    fixtures.liveReviewOpen = await makeProposal(
      fixtures.voteReviewOpen._id,
      "live",
      "live-review-open"
    );
    fixtures.liveReviewClosed = await makeProposal(
      fixtures.voteReviewClosed._id,
      "live",
      "live-review-closed"
    );
    fixtures.liveFeedbackClosed = await makeProposal(
      fixtures.voteFeedbackClosed._id,
      "live",
      "live-feedback-closed"
    );

    const comment = await Comment.create({
      proposalId: fixtures.liveFeedbackClosed._id,
      userId: drepAId,
      content: `testkit timing comment ${Date.now()}`,
      status: "live",
    });
    fixtures.feedbackClosedComment = comment;
    createdCommentIds.push(comment._id);

    log("setup", "Created timing fixtures", {
      votes: createdVoteIds.length,
      proposals: createdProposalIds.length,
      comments: createdCommentIds.length,
    });
  }, 180000);

  afterAll(async () => {
    if (createdCommentIds.length) {
      await Comment.deleteMany({ _id: { $in: createdCommentIds } });
    }
    if (createdProposalIds.length) {
      await Proposal.deleteMany({ _id: { $in: createdProposalIds } });
    }
    if (createdVoteIds.length) {
      await Vote.deleteMany({ _id: { $in: createdVoteIds } });
    }
    await disconnect();
  }, 60000);

  function buildLiveBodyFromStored(proposalDoc, voteId) {
    const liveMeta = { ...(proposalDoc.metaData || {}) };
    liveMeta.treasuryDonationTxHash = TREASURY_HASH;
    liveMeta.treasuryDonationConfirmed = true;
    return {
      voteId: String(voteId),
      title: proposalDoc.title,
      summary: proposalDoc.summary ?? "",
      status: "live",
      metaData: liveMeta,
    };
  }

  it("1) rejects draft->live when submission window is not yet open", async () => {
    const body = buildLiveBodyFromStored(fixtures.draftPreOpen, fixtures.votePreOpen._id);
    const res = await fetch(`${API_BASE_URL}/proposals/${fixtures.draftPreOpen._id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Cookie: drepASession.cookieHeader,
      },
      body: JSON.stringify(body),
    });
    const text = await res.text();
    assertWindowError(res.status, text, /submission|window|start|not yet open|validation failed/);
  });

  it("2) rejects draft->live when submission window is closed", async () => {
    const body = buildLiveBodyFromStored(
      fixtures.draftSubmissionClosed,
      fixtures.voteSubmissionClosed._id
    );
    const res = await fetch(
      `${API_BASE_URL}/proposals/${fixtures.draftSubmissionClosed._id}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Cookie: drepASession.cookieHeader,
        },
        body: JSON.stringify(body),
      }
    );
    const text = await res.text();
    assertWindowError(res.status, text, /submission|window|end|closed|validation failed/);
  });

  it("3) allows re-submit during review window", async () => {
    const body = {
      voteId: String(fixtures.voteReviewOpen._id),
      title: `${fixtures.liveReviewOpen.title} updated`,
      summary: fixtures.liveReviewOpen.summary ?? "",
      status: "live",
      metaData: fixtures.liveReviewOpen.metaData,
    };
    const res = await fetch(`${API_BASE_URL}/proposals/${fixtures.liveReviewOpen._id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Cookie: drepASession.cookieHeader,
      },
      body: JSON.stringify(body),
    });
    expect(res.status).toBe(200);
  });

  it("4) rejects re-submit after review window", async () => {
    const body = {
      voteId: String(fixtures.voteReviewClosed._id),
      title: `${fixtures.liveReviewClosed.title} updated`,
      summary: fixtures.liveReviewClosed.summary ?? "",
      status: "live",
      metaData: fixtures.liveReviewClosed.metaData,
    };
    const res = await fetch(`${API_BASE_URL}/proposals/${fixtures.liveReviewClosed._id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Cookie: drepASession.cookieHeader,
      },
      body: JSON.stringify(body),
    });
    const text = await res.text();
    assertWindowError(res.status, text, /reviewenddate|review period|after the vote review/i);
  });

  it("5) rejects posting comment outside feedback window", async () => {
    const res = await fetch(`${API_BASE_URL}/comments`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: drepASession.cookieHeader,
      },
      body: JSON.stringify({
        proposalId: String(fixtures.liveFeedbackClosed._id),
        content: `outside feedback test ${Date.now()}`,
      }),
    });
    const text = await res.text();
    assertWindowError(res.status, text, /feedbackenddate|feedback period|can only be added/i);
  });

  it("extra: rejects creating draft after submission window closes", async () => {
    const res = await fetch(`${API_BASE_URL}/proposals`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: drepASession.cookieHeader,
      },
      body: JSON.stringify({
        voteId: String(fixtures.voteSubmissionClosed._id),
        title: `late draft ${Date.now()}`,
        status: "draft",
      }),
    });
    const text = await res.text();
    assertWindowError(res.status, text, /submission|end|closed|window|validation failed/);
  });

  it("extra: rejects updating draft after submission window closes", async () => {
    const res = await fetch(
      `${API_BASE_URL}/proposals/${fixtures.draftSubmissionClosed._id}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Cookie: drepASession.cookieHeader,
        },
        body: JSON.stringify({
          voteId: String(fixtures.voteSubmissionClosed._id),
          title: `late draft update ${Date.now()}`,
          status: "draft",
        }),
      }
    );
    const text = await res.text();
    assertWindowError(res.status, text, /submission|end|closed|window|validation failed/);
  });

  it("extra: rejects liking comment after feedback window closes", async () => {
    const res = await fetch(
      `${API_BASE_URL}/comments/${fixtures.feedbackClosedComment._id}/like`,
      {
        method: "POST",
        headers: { Cookie: drepASession.cookieHeader },
      }
    );
    const text = await res.text();
    assertWindowError(res.status, text, /feedback period|no longer be liked|feedbackenddate/i);
  });

  it("extra: rejects admin comment withdraw after feedback window closes", async () => {
    const res = await fetch(
      `${API_BASE_URL}/comments/${fixtures.feedbackClosedComment._id}/withdraw`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Cookie: drepBSession.cookieHeader,
        },
        body: JSON.stringify({
          category: "Other",
          comment: "admin withdrawal after feedback window",
        }),
      }
    );
    const text = await res.text();
    assertWindowError(
      res.status,
      text,
      /cannot be withdrawn by an admin after the vote feedback period has ended|feedbackenddate/i
    );
  });
});
