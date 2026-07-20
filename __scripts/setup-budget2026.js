/**
 * Create or update the Cardano Budget 2026 vote (slug: cardano-budget-2026) with
 * official 2026 UTC windows, deposit options, and pillar metadata from categories.csv.
 *
 * Fill ADMINS with Bech32 stake addresses before running.
 *
 * Usage (repo root): node __scripts/setup-budget2026.js
 */

import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import path from "path";
import dotenv from "dotenv";
import mongoose from "mongoose";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "..", ".env.development") });

import { loadEnvironmentVariables } from "../helper/envLoader.js";
loadEnvironmentVariables(path.join(__dirname, ".."));

import { connectToDatabase, disconnectFromDatabase } from "../helper/dbManager.js";
import { Vote } from "../schema/Vote.js";

const CSV_PATH = path.join(__dirname, "categories.csv");

const SLUG = "cardano-budget-2026";
const TITLE = "Cardano Budget Process 2026";

/** Bech32 stake addresses with vote admin rights. Fill before running. */
const ADMINS = [];

const DEPOSIT_OPTIONS = {
  treasuryDonation: 1_000_000_000,
  depositAddress: "",
  depositAmount: 0,
};

const SORT_OPTIONS = [
  { value: "submittedAt", label: "Submission Date", field: "submittedAt" },
  { value: "title", label: "Proposal Title", field: "title" },
  { value: "totalBudget", label: "Total Budget", field: "metaData.totalBudget" },
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
    param: "category",
    label: "Category",
    field: "metaData.strategyFramework.pillars",
    allowedValues: [],
    multiple: true,
    optionsPath: "metaData.strategyFramework.pillars",
  },
];

const SEARCH_OPTIONS = [
  { field: "title", matchType: "like", caseSensitive: false },
  { field: "summary", matchType: "like", caseSensitive: false },
  { field: "proposerId", matchType: "like", caseSensitive: false },
  { field: "metaData.proposerDetails.name", matchType: "like", caseSensitive: false },
  { field: "_id", matchType: "objectId" },
];

function parseCsvLine(line) {
  const fields = [];
  let i = 0;
  while (i < line.length) {
    if (line[i] === '"') {
      let searchStart = i + 1;
      while (searchStart < line.length) {
        const next = line.indexOf('"', searchStart);
        if (next === -1) {
          fields.push(line.slice(i + 1).replace(/""/g, '"'));
          i = line.length;
          break;
        }
        if (line[next + 1] === '"') {
          searchStart = next + 2;
          continue;
        }
        fields.push(line.slice(i + 1, next).replace(/""/g, '"'));
        i = next + 1;
        if (line[i] === ";") i++;
        break;
      }
      continue;
    }
    const sep = line.indexOf(";", i);
    if (sep === -1) {
      fields.push(line.slice(i).trim());
      break;
    }
    fields.push(line.slice(i, sep).trim());
    i = sep + 1;
  }
  return fields;
}

/**
 * Parse categories.csv and return pillars array { _id, title, description, sortOrder } (deduplicated by pillar title).
 */
function buildPillarsFromCsv() {
  const raw = readFileSync(CSV_PATH, "utf8");
  const lines = raw.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) {
    throw new Error("categories.csv must have a header row and at least one data row.");
  }
  const header = parseCsvLine(lines[0]);
  const dataRows = lines.slice(1);
  const rows = dataRows.map((line) => {
    const values = parseCsvLine(line);
    const row = {};
    header.forEach((h, i) => {
      row[h] = values[i] ?? "";
    });
    return row;
  });
  const seen = new Map();
  for (const row of rows) {
    const pillar = (row["Pillar"] ?? "").trim();
    if (!pillar) continue;
    if (seen.has(pillar)) continue;
    const pillarDesc = (row["Pillar description"] ?? "").trim();
    seen.set(pillar, { title: pillar, description: pillarDesc || "" });
  }
  const pillars = [];
  let sortOrder = 0;
  for (const { title, description } of seen.values()) {
    sortOrder += 1;
    pillars.push({
      _id: new mongoose.Types.ObjectId().toString(),
      title,
      description: description ?? "",
      sortOrder,
    });
  }
  return pillars;
}

/**
 * Official Cardano Budget Process 2026 windows (UTC).
 * Proposal Submission: Apr 16 12:00 – May 8 12:00
 * Feedback: Apr 16 12:00 – May 22 12:00
 * Review: May 8 12:00 – May 22 12:00
 * Hydra voting: May 26 12:00 – Jun 12 12:00
 */
function budget2026VoteDates() {
  return {
    submissionStartDate: new Date(Date.UTC(2026, 3, 16, 12, 0, 0)),
    submissionEndDate: new Date(Date.UTC(2026, 4, 8, 12, 0, 0)),
    feedbackStartDate: new Date(Date.UTC(2026, 3, 16, 12, 0, 0)),
    feedbackEndDate: new Date(Date.UTC(2026, 4, 22, 12, 0, 0)),
    reviewStartDate: new Date(Date.UTC(2026, 4, 8, 12, 0, 0)),
    reviewEndDate: new Date(Date.UTC(2026, 4, 22, 12, 0, 0)),
    votingStartDate: new Date(Date.UTC(2026, 4, 26, 12, 0, 0)),
    votingEndDate: new Date(Date.UTC(2026, 5, 12, 12, 0, 0)),
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

    const dates = budget2026VoteDates();
    assertChronology(dates);

    const existing = await Vote.findOne({ slug: SLUG }).lean();

    /** Keep existing pillar ids on re-run so proposal category refs stay valid; seed from CSV on first insert. */
    let pillars;
    if (existing?.metaData?.strategyFramework?.pillars?.length) {
      pillars = existing.metaData.strategyFramework.pillars;
      console.log(`Keeping ${pillars.length} existing pillar(s) on vote (re-run safe).`);
    } else {
      console.log("Building pillars from categories.csv...");
      pillars = buildPillarsFromCsv();
      if (pillars.length === 0) {
        throw new Error("No pillars from categories.csv. Check categories.csv.");
      }
      console.log(`Built ${pillars.length} pillars.`);
    }

    const $set = {
      title: TITLE,
      description: "Cardano Budget Process 2026 facilitated by Intersect.",
      slug: SLUG,
      admins: ADMINS,
      ...dates,
      validationScript: "budget2026/validationScript.js",
      excludeScript: "budget2026/excludeScript.js",
      listProjectionScript: "budget2026/listProjection.js",
      form: "budget2026",
      commentsEnabled: true,
      depositOptions: DEPOSIT_OPTIONS,
      sortOptions: SORT_OPTIONS,
      filterOptions: FILTER_OPTIONS,
      searchOptions: SEARCH_OPTIONS,
      metaData: { strategyFramework: { pillars } },
    };

    const vote = await Vote.findOneAndUpdate(
      { slug: SLUG },
      { $set },
      { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true },
    );

    const action = existing ? "updated" : "created";
    console.log(`\n✅ Vote ${action}: ${vote._id}`);
    console.log(`   slug: ${vote.slug}`);
    console.log(`   submission: ${dates.submissionStartDate.toISOString()} → ${dates.submissionEndDate.toISOString()}`);
    console.log(`   feedback:   ${dates.feedbackStartDate.toISOString()} → ${dates.feedbackEndDate.toISOString()}`);
    console.log(`   review:     ${dates.reviewStartDate.toISOString()} → ${dates.reviewEndDate.toISOString()}`);
    console.log(`   voting:     ${dates.votingStartDate.toISOString()} → ${dates.votingEndDate.toISOString()}`);
  } catch (e) {
    console.error(e);
    exitCode = 1;
  } finally {
    await disconnectFromDatabase();
    process.exit(exitCode);
  }
}

main();
