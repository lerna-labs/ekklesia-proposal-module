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
 * - Proposer / live-submit identity: TESTKIT_TREASURY_DONATION_USER (stake bech32) → keys dir via id.txt match.
 */
import { login, readDrepId } from "../helpers/session.js";
import { getTreasuryDonationKeysDir, getOtherStakeKeysDir } from "../helpers/stakeKeys.js";
import { sanitizeMetaDataForLiveSubmit } from "../helpers/sanitizeMetaDataForLiveSubmit.js";
import { expectHttpStatus, expectBodyMatches } from "../helpers/httpAssert.js";
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

const KEYS_TREASURY_USER = getTreasuryDonationKeysDir();
const KEYS_OTHER_STAKE = getOtherStakeKeysDir();

const createdVoteIds = [];
const createdProposalIds = [];
const createdCommentIds = [];

function log(step, message, detail) {
  if (!LOG) return;
  const prefix = `[window-rules:${step}]`;
  console.log(prefix, message);
  if (detail !== undefined) console.log(prefix, " ", detail);
}

function assertWindowError(status, bodyText, expectedRegex, context = "") {
  expectHttpStatus(status, 400, bodyText, context);
  expectBodyMatches(bodyText, expectedRegex, context);
}

function cloneWithoutMongoMeta(doc) {
  const obj = doc.toObject ? doc.toObject() : { ...doc };
  delete obj._id;
  delete obj.createdAt;
  delete obj.updatedAt;
  delete obj.__v;
  return obj;
}

/** Schedules voting to begin the day after review ends (+ 8d voting end), except `voting_started` / overrides. */
function withVotingDates(w) {
  const day = 24 * 60 * 60 * 1000;
  const re = w.reviewEndDate.getTime();
  return {
    ...w,
    votingStartDate: new Date(re + day),
    votingEndDate: new Date(re + 8 * day),
  };
}

function buildWindowDates(mode, now = Date.now()) {
  const day = 24 * 60 * 60 * 1000;
  if (mode === "submission_not_open") {
    return withVotingDates({
      submissionStartDate: new Date(now + day),
      submissionEndDate: new Date(now + 2 * day),
      feedbackStartDate: new Date(now + 2 * day),
      feedbackEndDate: new Date(now + 3 * day),
      reviewStartDate: new Date(now + 3 * day),
      reviewEndDate: new Date(now + 4 * day),
    });
  }
  if (mode === "submission_closed") {
    return withVotingDates({
      submissionStartDate: new Date(now - 4 * day),
      submissionEndDate: new Date(now - 3 * day),
      feedbackStartDate: new Date(now - 3 * day),
      feedbackEndDate: new Date(now - 2 * day),
      reviewStartDate: new Date(now - 2 * day),
      reviewEndDate: new Date(now - day),
    });
  }
  if (mode === "review_open") {
    return withVotingDates({
      submissionStartDate: new Date(now - 4 * day),
      submissionEndDate: new Date(now - 3 * day),
      feedbackStartDate: new Date(now - 2 * day),
      feedbackEndDate: new Date(now - day),
      reviewStartDate: new Date(now - 6 * 60 * 60 * 1000),
      reviewEndDate: new Date(now + 6 * 60 * 60 * 1000),
    });
  }
  if (mode === "review_closed") {
    return withVotingDates({
      submissionStartDate: new Date(now - 5 * day),
      submissionEndDate: new Date(now - 4 * day),
      feedbackStartDate: new Date(now - 3 * day),
      feedbackEndDate: new Date(now - 2 * day),
      reviewStartDate: new Date(now - day),
      reviewEndDate: new Date(now - 60 * 60 * 1000),
    });
  }
  if (mode === "voting_started") {
    return {
      submissionStartDate: new Date(now - 14 * day),
      submissionEndDate: new Date(now - 13 * day),
      feedbackStartDate: new Date(now - 12 * day),
      feedbackEndDate: new Date(now - 11 * day),
      reviewStartDate: new Date(now - 10 * day),
      reviewEndDate: new Date(now - 9 * day),
      votingStartDate: new Date(now - day),
      votingEndDate: new Date(now + 30 * day),
    };
  }
  if (mode === "feedback_not_yet") {
    return withVotingDates({
      submissionStartDate: new Date(now - 5 * day),
      submissionEndDate: new Date(now - 2 * day),
      feedbackStartDate: new Date(now + day),
      feedbackEndDate: new Date(now + 5 * day),
      reviewStartDate: new Date(now + 4 * day),
      reviewEndDate: new Date(now + 10 * day),
    });
  }
  // feedback_closed
  return withVotingDates({
    submissionStartDate: new Date(now - 4 * day),
    submissionEndDate: new Date(now - 3 * day),
    feedbackStartDate: new Date(now - 2 * day),
    feedbackEndDate: new Date(now - 60 * 60 * 1000),
    reviewStartDate: new Date(now - 30 * 60 * 1000),
    reviewEndDate: new Date(now + day),
  });
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

    drepAId = readDrepId(KEYS_TREASURY_USER);
    drepASession = await login(API_BASE_URL, { keysDir: KEYS_TREASURY_USER });
    drepBSession = await login(API_BASE_URL, { keysDir: KEYS_OTHER_STAKE });

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
        admins: [drepAId, readDrepId(KEYS_OTHER_STAKE)],
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

    fixtures.voteFeedbackNotYet = await makeVote("fbnotyet", "feedback_not_yet");
    fixtures.liveFeedbackNotYet = await makeProposal(
      fixtures.voteFeedbackNotYet._id,
      "live",
      "live-feedback-not-yet"
    );

    fixtures.voteVotingStarted = await makeVote("votingstarted", "voting_started");
    fixtures.liveVotingStarted = await makeProposal(
      fixtures.voteVotingStarted._id,
      "live",
      "live-voting-started"
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
    const liveMeta = sanitizeMetaDataForLiveSubmit(proposalDoc.metaData ?? {});
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
    assertWindowError(
      res.status,
      text,
      /submission|window|start|not yet open|validation failed/,
      "1) draft->live before submission window opens"
    );
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
    assertWindowError(
      res.status,
      text,
      /submission|window|end|closed|validation failed/,
      "2) draft->live after submission window closed"
    );
  });

  it("3) allows re-submit during review window", async () => {
    const body = {
      voteId: String(fixtures.voteReviewOpen._id),
      title: `${fixtures.liveReviewOpen.title} updated`,
      summary: fixtures.liveReviewOpen.summary ?? "",
      status: "live",
      metaData: sanitizeMetaDataForLiveSubmit(fixtures.liveReviewOpen.metaData),
    };
    const res = await fetch(`${API_BASE_URL}/proposals/${fixtures.liveReviewOpen._id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Cookie: drepASession.cookieHeader,
      },
      body: JSON.stringify(body),
    });
    const text = await res.text();
    expectHttpStatus(res.status, 200, text, "3) re-submit during review window");
  });

  it("4) rejects re-submit after review window", async () => {
    const body = {
      voteId: String(fixtures.voteReviewClosed._id),
      title: `${fixtures.liveReviewClosed.title} updated`,
      summary: fixtures.liveReviewClosed.summary ?? "",
      status: "live",
      metaData: sanitizeMetaDataForLiveSubmit(fixtures.liveReviewClosed.metaData),
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
    assertWindowError(
      res.status,
      text,
      /reviewenddate|review period|after the vote review/i,
      "4) re-submit after review window"
    );
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
    assertWindowError(
      res.status,
      text,
      /feedbackenddate|feedback period|can only be added/i,
      "5) comment outside feedback window"
    );
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
    assertWindowError(
      res.status,
      text,
      /submission|end|closed|window|validation failed/,
      "extra: POST draft after submission closed"
    );
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
    assertWindowError(
      res.status,
      text,
      /submission|end|closed|window|validation failed/,
      "extra: PUT draft after submission closed"
    );
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
    assertWindowError(
      res.status,
      text,
      /feedback period|no longer be liked|feedbackenddate/i,
      "extra: like comment after feedback closed"
    );
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
      /cannot be withdrawn by an admin after the vote feedback period has ended|feedbackenddate/i,
      "extra: admin withdraw comment after feedback closed"
    );
  });

  it("extra: rejects comment before feedback period starts", async () => {
    const res = await fetch(`${API_BASE_URL}/comments`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: drepASession.cookieHeader,
      },
      body: JSON.stringify({
        proposalId: String(fixtures.liveFeedbackNotYet._id),
        content: `before feedback ${Date.now()}`,
      }),
    });
    const text = await res.text();
    assertWindowError(
      res.status,
      text,
      /feedbackstartdate|feedback period has not started|not started yet/i,
      "extra: comment before feedback window"
    );
  });

  it("extra: allows POST draft before submission window opens", async () => {
    const res = await fetch(`${API_BASE_URL}/proposals`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: drepASession.cookieHeader,
      },
      body: JSON.stringify({
        voteId: String(fixtures.votePreOpen._id),
        title: `early draft ${Date.now()}`,
        status: "draft",
      }),
    });
    const text = await res.text();
    expectHttpStatus(res.status, 201, text, "extra: POST draft before submission opens");
  });

  it("extra: admin can withdraw live proposal before voting starts", async () => {
    const res = await fetch(
      `${API_BASE_URL}/proposals/${fixtures.liveReviewOpen._id}/withdraw`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Cookie: drepBSession.cookieHeader,
        },
        body: JSON.stringify({
          category: "Other",
          comment: "admin withdraw before voting",
        }),
      }
    );
    const text = await res.text();
    expectHttpStatus(res.status, 200, text, "extra: admin withdraw proposal before voting");
  });

  it("extra: admin cannot withdraw live proposal after voting has started", async () => {
    const res = await fetch(
      `${API_BASE_URL}/proposals/${fixtures.liveVotingStarted._id}/withdraw`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Cookie: drepBSession.cookieHeader,
        },
        body: JSON.stringify({
          category: "Other",
          comment: "admin withdraw after voting start",
        }),
      }
    );
    const text = await res.text();
    assertWindowError(
      res.status,
      text,
      /votingstartdate|before voting starts|voting has started/i,
      "extra: admin withdraw after voting started"
    );
  });
});
