/**
 * Create or update CC Vote 2026 (slug: cc-vote-2026). Phases start at the instant this script runs.
 *
 * Usage (repo root): node __setup/setup-cc-vote2026.js
 */

import { fileURLToPath } from "url";
import path from "path";
import dotenv from "dotenv";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "..", ".env.development") });

import { loadEnvironmentVariables } from "../helper/envLoader.js";
loadEnvironmentVariables(path.join(__dirname, ".."));

import { connectToDatabase, disconnectFromDatabase } from "../helper/dbManager.js";
import { Vote } from "../schema/Vote.js";

const SLUG = "cc-vote-2026";
const TITLE = "CC Vote 2026";
const DESCRIPTION =
  "CC Vote 2026 proposal cycle. Submission and feedback run together, then review, then voting.";

/** Replace with a real Bech32 stake address before running against production. */
const ADMINS = ["REPLACE_WITH_STAKE_ADDRESS"];

const MS_PER_DAY = 86400000;
const DAYS_SUBMISSION_FEEDBACK = 14;
const DAYS_REVIEW = 14;
const DAYS_VOTING = 30;

const DEPOSIT_OPTIONS = {
  depositAddress: "",
  depositAmount: 0,
};

const SORT_OPTIONS = [
  { value: "title", label: "Applicant Name", field: "title" },
  { value: "submittedAt", label: "Submission Date", field: "submittedAt" },
  { value: "commentCount", label: "Comment Count", field: "commentCount" },
  { value: "updatedAt", label: "Last Updated", field: "updatedAt" },
];

const FILTER_OPTIONS = [
  {
    param: "status",
    label: "Status",
    field: "status",
    allowedValues: ["live", "withdrawn", "draft"],
    multiple: true,
  },
  {
    param: "track",
    label: "Applicant Type",
    field: "metaData.track",
    allowedValues: ["individual", "organisation", "consortium"],
    multiple: true,
  },
];

const SEARCH_OPTIONS = [
  { field: "title", matchType: "like", caseSensitive: false },
  { field: "proposerId", matchType: "like", caseSensitive: false },
  { field: "_id", matchType: "objectId" },
];

function ccVote2026Dates() {
  const start = new Date();
  const submissionEndFeedbackEnd = new Date(
    start.getTime() + DAYS_SUBMISSION_FEEDBACK * MS_PER_DAY,
  );
  const reviewStartDate = submissionEndFeedbackEnd;
  const reviewEndDate = new Date(reviewStartDate.getTime() + DAYS_REVIEW * MS_PER_DAY);
  const votingStartDate = reviewEndDate;
  const votingEndDate = new Date(votingStartDate.getTime() + DAYS_VOTING * MS_PER_DAY);

  return {
    submissionStartDate: start,
    submissionEndDate: submissionEndFeedbackEnd,
    feedbackStartDate: start,
    feedbackEndDate: submissionEndFeedbackEnd,
    reviewStartDate,
    reviewEndDate,
    votingStartDate,
    votingEndDate,
  };
}

function assertChronology(d) {
  const pairs = [
    ["submissionStartDate", "submissionEndDate"],
    ["feedbackStartDate", "feedbackEndDate"],
    ["reviewStartDate", "reviewEndDate"],
    ["votingStartDate", "votingEndDate"],
  ];
  for (const [a, b] of pairs) {
    if (d[a].getTime() >= d[b].getTime()) {
      throw new Error(`${a} must be before ${b}`);
    }
  }
}

async function main() {
  let exitCode = 0;
  try {
    console.log("Connecting to database...");
    const conn = await connectToDatabase();
    if (!conn) {
      throw new Error("Could not connect to MongoDB. Check MONGODB_* in .env");
    }

    const dates = ccVote2026Dates();
    assertChronology(dates);

    const existing = await Vote.findOne({ slug: SLUG }).lean();

    const $set = {
      title: TITLE,
      description: DESCRIPTION,
      slug: SLUG,
      admins: ADMINS,
      ...dates,
      validationScript: "cc-vote2026/validationScript.js",
      excludeScript: "cc-vote2026/excludeScript.js",
      listProjectionScript: "cc-vote2026/listProjection.js",
      form: "ccVote2026",
      commentsEnabled: true,
      depositOptions: DEPOSIT_OPTIONS,
      sortOptions: SORT_OPTIONS,
      filterOptions: FILTER_OPTIONS,
      searchOptions: SEARCH_OPTIONS,
    };

    const vote = await Vote.findOneAndUpdate(
      { slug: SLUG },
      { $set, $unset: { metaData: "" } },
      { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true },
    );

    const action = existing ? "updated" : "created";
    console.log(`\n✅ Vote ${action}: ${vote._id}`);
    console.log(`   slug: ${vote.slug}`);
    console.log(`   submission: ${dates.submissionStartDate.toISOString()} → ${dates.submissionEndDate.toISOString()}`);
    console.log(`   feedback:   ${dates.feedbackStartDate.toISOString()} → ${dates.feedbackEndDate.toISOString()}`);
    console.log(`   review:     ${dates.reviewStartDate.toISOString()} → ${dates.reviewEndDate.toISOString()}`);
    console.log(`   voting:     ${dates.votingStartDate.toISOString()} → ${dates.votingEndDate.toISOString()}`);
    if (ADMINS.length === 1 && ADMINS[0] === "REPLACE_WITH_STAKE_ADDRESS") {
      console.log("\n⚠️  Replace ADMINS in __setup/setup-cc-vote2026.js with a real stake address before production.");
    }
  } catch (e) {
    console.error(e);
    exitCode = 1;
  } finally {
    await disconnectFromDatabase();
    process.exit(exitCode);
  }
}

main();
