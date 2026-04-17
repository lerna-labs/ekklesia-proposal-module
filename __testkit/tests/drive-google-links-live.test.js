/**
 * Regression: draft → live with drive.google.com (subdomain) URLs in every budget2026 link field.
 * Link locations: proposerDetails.links, supportingInfoLinks, workPackages[].supportingDocuments.
 */
import { login, readDrepId } from "../helpers/session.js";
import { getTreasuryDonationKeysDir, getOtherStakeKeysDir } from "../helpers/stakeKeys.js";
import { sanitizeMetaDataForLiveSubmit } from "../helpers/sanitizeMetaDataForLiveSubmit.js";
import { expectHttpStatus } from "../helpers/httpAssert.js";
import { resolveVoteAndLiveProposal } from "../helpers/testProposal.js";
import { connect, disconnect } from "../helpers/testkitMongo.js";
import { Vote } from "../../schema/Vote.js";
import { Proposal } from "../../schema/Proposal.js";

const API_BASE_URL = process.env.API_BASE_URL || "http://localhost:3000/api/v0";
const TREASURY_HASH =
  process.env.TESTKIT_TREASURY_HASH?.trim() ||
  process.env.TESTKIT_TREASURY_DONATION_TX_HASH?.trim() ||
  "";

const KEYS_TREASURY_USER = getTreasuryDonationKeysDir();
const KEYS_OTHER_STAKE = getOtherStakeKeysDir();

function cloneWithoutMongoMeta(doc) {
  const obj = doc.toObject ? doc.toObject() : { ...doc };
  delete obj._id;
  delete obj.createdAt;
  delete obj.updatedAt;
  delete obj.__v;
  return obj;
}

/** Schedule voting to begin the day after review ends (+ 8d voting end). */
function withVotingDates(w) {
  const day = 24 * 60 * 60 * 1000;
  const re = w.reviewEndDate.getTime();
  return {
    ...w,
    votingStartDate: new Date(re + day),
    votingEndDate: new Date(re + 8 * day),
  };
}

/** Now is inside [submissionStartDate, submissionEndDate] (first-time publish allowed). */
function buildWindowDatesSubmissionOpen(now = Date.now()) {
  const day = 24 * 60 * 60 * 1000;
  return withVotingDates({
    submissionStartDate: new Date(now - 4 * day),
    submissionEndDate: new Date(now + 5 * day),
    feedbackStartDate: new Date(now + 6 * day),
    feedbackEndDate: new Date(now + 7 * day),
    reviewStartDate: new Date(now + 8 * day),
    reviewEndDate: new Date(now + 12 * day),
  });
}

/**
 * Set all link-shaped fields to https://drive.google.com/... URLs (distinct paths per field).
 * @param {object} meta
 */
function applyDriveGoogleLinksToMeta(meta) {
  const m = structuredClone(meta ?? {});
  const driveLink = (title, pathAndQuery) => ({
    title,
    url: `https://drive.google.com${pathAndQuery}`,
  });

  if (!m.proposerDetails || typeof m.proposerDetails !== "object") {
    m.proposerDetails = { name: "Test Proposer", email: "proposer@testkit.example", links: [] };
  }
  m.proposerDetails.links = [
    driveLink("Social / repo (Drive)", "/file/d/1proposerA/view"),
    driveLink("Updates (Drive open)", "/open?id=2proposerB"),
  ];

  m.supportingInfoLinks = [
    driveLink("Supporting doc 1", "/file/d/3supportA/view"),
    driveLink("Supporting doc 2", "/open?id=4supportB"),
  ];

  const wps = m.proposalDetails?.workPackages;
  if (Array.isArray(wps)) {
    for (let i = 0; i < wps.length; i++) {
      wps[i].supportingDocuments = [
        driveLink(`Work package ${i + 1} supporting document`, `/file/d/5wp${i}/view`),
      ];
    }
  }

  return m;
}

describe("Budget link fields: drive.google.com on draft → live", () => {
  let drepAId;
  let session;
  let createdVoteId;
  let createdProposalId;

  beforeAll(async () => {
    if (!TREASURY_HASH) {
      throw new Error(
        "Missing TESTKIT_TREASURY_HASH (or TESTKIT_TREASURY_DONATION_TX_HASH). " +
          "Set one in __testkit/.env."
      );
    }

    drepAId = readDrepId(KEYS_TREASURY_USER);
    session = await login(API_BASE_URL, { keysDir: KEYS_TREASURY_USER });

    await connect();

    const ids = await resolveVoteAndLiveProposal(API_BASE_URL);
    const sourceVote = await Vote.findById(ids.voteId);
    const sourceProposal = await Proposal.findById(ids.proposalId);
    if (!sourceVote || !sourceProposal) {
      throw new Error("Failed to load source vote/proposal for drive.google link test.");
    }

    const sourceVoteObj = cloneWithoutMongoMeta(sourceVote);
    const sourceProposalObj = cloneWithoutMongoMeta(sourceProposal);
    const runSuffix = Date.now().toString(36);

    const vote = await Vote.create({
      ...sourceVoteObj,
      title: `[testkit drive.google links] ${runSuffix}`,
      slug: `testkit-drive-google-${runSuffix}`,
      admins: [drepAId, readDrepId(KEYS_OTHER_STAKE)],
      ...buildWindowDatesSubmissionOpen(),
    });
    createdVoteId = vote._id;

    const metaData = applyDriveGoogleLinksToMeta(sourceProposalObj.metaData ?? {});

    const proposal = await Proposal.create({
      ...sourceProposalObj,
      voteId: vote._id,
      proposerId: drepAId,
      title: "Drive links draft",
      summary: "Executive summary for drive.google.com link regression test.",
      status: "draft",
      metaData,
    });
    createdProposalId = proposal._id;
  }, 180000);

  afterAll(async () => {
    if (createdProposalId) {
      await Proposal.deleteOne({ _id: createdProposalId });
    }
    if (createdVoteId) {
      await Vote.deleteOne({ _id: createdVoteId });
    }
    await disconnect();
  }, 60000);

  it("accepts PUT draft → live when all link fields use drive.google.com URLs", async () => {
    const proposalDoc = await Proposal.findById(createdProposalId);
    const liveMeta = sanitizeMetaDataForLiveSubmit(proposalDoc.metaData ?? {});
    liveMeta.treasuryDonationTxHash = TREASURY_HASH;
    liveMeta.treasuryDonationConfirmed = true;

    const body = {
      voteId: String(createdVoteId),
      title: proposalDoc.title,
      summary: proposalDoc.summary ?? "",
      status: "live",
      metaData: liveMeta,
    };

    const res = await fetch(`${API_BASE_URL}/proposals/${createdProposalId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Cookie: session.cookieHeader,
      },
      body: JSON.stringify(body),
    });
    const text = await res.text();
    expectHttpStatus(
      res.status,
      200,
      text,
      "draft → live with drive.google.com in all link fields"
    );
  });
});
