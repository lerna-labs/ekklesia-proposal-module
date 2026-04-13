/**
 * Ensure a single Vote exists for integration tests and perf seed (slug TESTKIT_VOTE_SLUG).
 * Call connect() from testkitMongo first.
 */
import { createRequire } from "module";
import { TESTKIT_VOTE_SLUG } from "./testkitConstants.js";

const require = createRequire(new URL("../../package.json", import.meta.url));
const mongoose = require("mongoose");

import { Vote } from "../../schema/Vote.js";

/** @type {string | null} */
let cachedVoteId = null;

export function getTestVoteId() {
  if (!cachedVoteId) throw new Error("ensureTestkitVote() must run before getTestVoteId()");
  return cachedVoteId;
}

export function getTestVoteSlug() {
  return TESTKIT_VOTE_SLUG;
}

/**
 * Create or find the testkit vote. Returns { vote: mongoose doc, created }.
 */
export async function ensureTestkitVote() {
  let vote = await Vote.findOne({ slug: TESTKIT_VOTE_SLUG }).lean();
  if (vote) {
    cachedVoteId = vote._id.toString();
    return { vote: await Vote.findById(vote._id), created: false };
  }
  const now = new Date();
  const oneYearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
  const oneYearAhead = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);
  const pillarIds = [
    new mongoose.Types.ObjectId(),
    new mongoose.Types.ObjectId(),
    new mongoose.Types.ObjectId(),
  ];
  const pillars = pillarIds.map((id, i) => ({
    _id: id,
    title: `Testkit category ${i + 1}`,
    description: "",
    sortOrder: i + 1,
  }));
  vote = await Vote.create({
    title: "Ekklesia testkit vote",
    description: "Created by __testkit (integration + performance seed)",
    slug: TESTKIT_VOTE_SLUG,
    admins: ["stake_test1ur97k8x2dkedxscjls0z2leux34yuz30hngsg6nylyjs7fgkxjnv2"],
    submissionStartDate: oneYearAgo,
    submissionEndDate: oneYearAhead,
    feedbackStartDate: oneYearAgo,
    feedbackEndDate: oneYearAhead,
    reviewStartDate: oneYearAgo,
    reviewEndDate: oneYearAhead,
    validationScript: "budget2026/validationScript.js",
    excludeScript: "budget2026/excludeScript.js",
    form: "budget2026",
    depositOptions: {
      treasuryDonation: 0,
      depositAddress: "",
      depositAmount: 0,
    },
    sortOptions: [
      { value: "submittedAt", label: "Submission Date", field: "submittedAt" },
      { value: "title", label: "Proposal Title", field: "title" },
      { value: "updatedAt", label: "Last Updated", field: "updatedAt" },
    ],
    filterOptions: [
      { param: "status", label: "Status", field: "status", allowedValues: ["live", "withdrawn", "draft"], multiple: true },
      {
        param: "category",
        label: "Category",
        field: "metaData.strategyFramework.pillars",
        allowedValues: [],
        multiple: true,
        optionsPath: "metaData.strategyFramework.pillars",
      },
    ],
    searchOptions: [
      { field: "title", matchType: "like", caseSensitive: false },
      { field: "summary", matchType: "like", caseSensitive: false },
      { field: "proposerId", matchType: "like", caseSensitive: false },
      { field: "_id", matchType: "objectId" },
    ],
    metaData: { strategyFramework: { pillars } },
  });
  cachedVoteId = vote._id.toString();
  return { vote, created: true };
}

export function clearTestVoteCache() {
  cachedVoteId = null;
}
