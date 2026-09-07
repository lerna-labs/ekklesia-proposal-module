/**
 * Create or update Constitutional Committee Election 2026 (slug: cc-vote-2026) with fixed UTC phase windows.
 *
 * Fill ADMINS with Bech32 stake addresses before running.
 *
 * Usage (repo root): node __scripts/setup-cc-vote2026.js
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
const TITLE = "Constitutional Committee Election 2026";
const DESCRIPTION = "Constitutional Committee Election 2026.";

/** Bech32 stake addresses with vote admin rights. Fill before running. */
const ADMINS = [];

/** CC vote: no treasury minimum and no wallet deposit (amounts in lovelace). */
const DEPOSIT_OPTIONS = {
  treasuryDonation: 0,
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
  const submissionStartDate = new Date("2026-05-08T21:45:00.000Z");
  const submissionEndDate = new Date("2026-06-07T21:45:00.000Z");
  const feedbackStartDate = new Date("2026-05-08T21:45:00.000Z");
  const feedbackEndDate = new Date("2026-06-13T21:45:00.000Z");
  const reviewStartDate = new Date("2026-05-08T21:45:00.000Z");
  const reviewEndDate = new Date("2026-06-07T21:45:00.000Z");
  const votingStartDate = new Date("2026-06-13T21:45:00.000Z");
  const votingEndDate = new Date("2026-07-13T21:45:00.000Z");

  return {
    submissionStartDate,
    submissionEndDate,
    feedbackStartDate,
    feedbackEndDate,
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
    console.log(
      `   submission: ${dates.submissionStartDate.toISOString()} → ${dates.submissionEndDate.toISOString()}`,
    );
    console.log(
      `   feedback:   ${dates.feedbackStartDate.toISOString()} → ${dates.feedbackEndDate.toISOString()}`,
    );
    console.log(
      `   review:     ${dates.reviewStartDate.toISOString()} → ${dates.reviewEndDate.toISOString()}`,
    );
    console.log(
      `   voting:     ${dates.votingStartDate.toISOString()} → ${dates.votingEndDate.toISOString()}`,
    );
  } catch (e) {
    console.error(e);
    exitCode = 1;
  } finally {
    await disconnectFromDatabase();
    process.exit(exitCode);
  }
}

main();
