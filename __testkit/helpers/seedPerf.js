/**
 * Seed data for performance test: one Vote (slug perf-test-20k) and 20,000 Proposals.
 * Uses __setup/proposal1.json and proposal2.json. Requires mongoose and MONGODB_* or MONGO_URI in env.
 *
 * Uses the repo root's mongoose so connect() is the same instance that Vote/Proposal models use
 * (otherwise __testkit's mongoose would connect and the schemas would use root's mongoose, which never connects).
 */
import { createRequire } from "module";
import { readFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const require = createRequire(new URL("../../package.json", import.meta.url));
const mongoose = require("mongoose");

import { Vote } from "../../schema/Vote.js";
import { Proposal } from "../../schema/Proposal.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "../..");
const SETUP_DIR = path.join(REPO_ROOT, "__setup");
const PROPOSAL1_PATH = path.join(SETUP_DIR, "proposal1.json");
const PROPOSAL2_PATH = path.join(SETUP_DIR, "proposal2.json");

export const PERF_VOTE_SLUG = "perf-test-20k";
const PERF_VOTE_SLUG_INTERNAL = PERF_VOTE_SLUG;
const TARGET_PROPOSAL_COUNT = 20_000;
const BATCH_SIZE = 500;

function buildMongoUri() {
  if (process.env.MONGO_URI) return process.env.MONGO_URI;
  const host = process.env.MONGODB_HOST || "localhost";
  const port = process.env.MONGODB_PORT || "27017";
  const database = process.env.MONGODB_DATABASE;
  const username = process.env.MONGODB_USERNAME;
  const password = process.env.MONGODB_PASSWORD;
  const authSource = process.env.MONGODB_AUTH_SOURCE || "admin";
  if (!database) throw new Error("MONGODB_DATABASE or MONGO_URI must be set for performance test seed");
  let uri = "mongodb://";
  if (username && password) {
    uri += `${encodeURIComponent(username)}:${encodeURIComponent(password)}@`;
  }
  uri += `${host}:${port}/${database}`;
  if (username && password) uri += `?authSource=${authSource}`;
  return uri;
}

/**
 * Convert MongoDB extended JSON ($oid, $date) in parsed object to native types. Mutates in place.
 */
function convertExtendedJson(obj) {
  if (obj === null || typeof obj !== "object") return obj;
  if (Array.isArray(obj)) {
    obj.forEach((item, i) => { obj[i] = convertExtendedJson(item); });
    return obj;
  }
  if (Object.keys(obj).length === 1) {
    if ("$oid" in obj) return new mongoose.Types.ObjectId(obj.$oid);
    if ("$date" in obj) return new Date(obj.$date);
  }
  for (const key of Object.keys(obj)) {
    obj[key] = convertExtendedJson(obj[key]);
  }
  return obj;
}

/**
 * Connect to MongoDB. Uses MONGO_URI or MONGODB_* from env.
 */
export async function connect() {
  const uri = buildMongoUri();
  mongoose.set("strictQuery", true);
  await mongoose.connect(uri);
}

/**
 * Disconnect from MongoDB.
 */
export async function disconnect() {
  await mongoose.disconnect();
}

/**
 * Create or find the perf vote. Returns { vote, created }.
 * If a vote with slug PERF_VOTE_SLUG exists, return it and created=false.
 */
export async function ensureVote() {
  let vote = await Vote.findOne({ slug: PERF_VOTE_SLUG_INTERNAL }).lean();
  if (vote) return { vote: await Vote.findById(vote._id), created: false };
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
    title: `Perf category ${i + 1}`,
    description: "",
    sortOrder: i + 1,
  }));
  vote = await Vote.create({
    title: "Performance test vote (20k proposals)",
    description: "Created by __testkit performance test",
    slug: PERF_VOTE_SLUG_INTERNAL,
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
      { param: "category", label: "Category", field: "metaData.strategyFramework.pillars", allowedValues: [], multiple: true, optionsPath: "metaData.strategyFramework.pillars" },
    ],
    searchOptions: [
      { field: "title", matchType: "like", caseSensitive: false },
      { field: "summary", matchType: "like", caseSensitive: false },
      { field: "proposerId", matchType: "like", caseSensitive: false },
      { field: "_id", matchType: "objectId" },
    ],
    metaData: { strategyFramework: { pillars } },
  });
  return { vote, created: true };
}

/**
 * Load proposal1.json and proposal2.json, normalize for voteId and pillars, return array of plain docs (no _id yet).
 */
function loadTemplates(voteId, pillarIds) {
  const raw1 = JSON.parse(readFileSync(PROPOSAL1_PATH, "utf8"));
  const raw2 = JSON.parse(readFileSync(PROPOSAL2_PATH, "utf8"));
  convertExtendedJson(raw1);
  convertExtendedJson(raw2);
  const pillarIdStrs = pillarIds.map((id) => id.toString());
  function normalize(template) {
    const { _id, voteId: _v, ...rest } = template;
    const metaData = rest.metaData ? { ...rest.metaData } : {};
    if (metaData.strategyFramework && metaData.strategyFramework.pillars) {
      metaData.strategyFramework = {
        ...metaData.strategyFramework,
        pillars: pillarIdStrs.slice(0, metaData.strategyFramework.pillars.length || 1),
      };
    }
    return {
      ...rest,
      voteId,
      metaData,
      status: "live",
      proposerId: rest.proposerId || "stake_test1ur97k8x2dkedxscjls0z2leux34yuz30hngsg6nylyjs7fgkxjnv2",
    };
  }
  return [normalize(raw1), normalize(raw2)];
}

/**
 * Ensure TARGET_PROPOSAL_COUNT proposals exist for the vote. If count already >= TARGET_PROPOSAL_COUNT, skip insert.
 * Returns { proposalId: one id for GET /proposals/:id }.
 */
export async function ensureProposals(vote) {
  const voteId = vote._id;
  const existing = await Proposal.countDocuments({ voteId });
  if (existing >= TARGET_PROPOSAL_COUNT) {
    const one = await Proposal.findOne({ voteId }).select("_id").lean();
    return { proposalId: one._id.toString(), created: false };
  }
  const pillars = vote.metaData?.strategyFramework?.pillars || [];
  const pillarIds = pillars.map((p) => (p._id ? p._id : p));
  const [t1, t2] = loadTemplates(voteId, pillarIds);
  const now = Date.now();
  let firstId = null;
  const toInsert = [];
  for (let i = 0; i < TARGET_PROPOSAL_COUNT; i++) {
    const template = i % 2 === 0 ? t1 : t2;
    const doc = {
      ...structuredClone(template),
      _id: new mongoose.Types.ObjectId(),
      voteId,
      title: `${template.title} (${i + 1})`,
      submittedAt: new Date(now - (TARGET_PROPOSAL_COUNT - i) * 60 * 1000),
    };
    if (!firstId) firstId = doc._id;
    toInsert.push(doc);
  }
  for (let offset = 0; offset < toInsert.length; offset += BATCH_SIZE) {
    const batch = toInsert.slice(offset, offset + BATCH_SIZE);
    await Proposal.insertMany(batch);
    if (process.env.TESTKIT_LOG !== "0") {
      console.log(`[seedPerf] Inserted proposals ${offset + 1}-${offset + batch.length}`);
    }
  }
  return { proposalId: firstId.toString(), created: true };
}

/**
 * Return the perf vote's _id if it exists, else null. Use for teardown when you only need the id.
 */
export async function getPerfVoteId() {
  const v = await Vote.findOne({ slug: PERF_VOTE_SLUG_INTERNAL }).select("_id").lean();
  return v?._id?.toString() ?? null;
}

/**
 * Delete all proposals for the vote and then the vote.
 */
export async function teardown(voteId) {
  if (!voteId) return;
  const deletedProposals = await Proposal.deleteMany({ voteId });
  if (process.env.TESTKIT_LOG !== "0") {
    console.log(`[seedPerf] Deleted ${deletedProposals.deletedCount} proposals`);
  }
  await Vote.deleteOne({ _id: voteId });
  if (process.env.TESTKIT_LOG !== "0") {
    console.log("[seedPerf] Deleted vote");
  }
}
