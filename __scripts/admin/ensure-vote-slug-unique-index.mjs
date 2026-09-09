#!/usr/bin/env node
/**
 * Ensure the unique index on Vote.slug (F-005).
 *
 * 1. Report duplicate slug values. Exit non-zero if any exist — resolve them
 *    before creating/syncing the index.
 * 2. Otherwise call Vote.syncIndexes() so the schema unique index is applied.
 *
 * Loads env from the repo root: `.env` (optional), then `.env.production`
 * when present (same pattern as other admin scripts).
 *
 * Usage (from repo root):
 *   node __scripts/admin/ensure-vote-slug-unique-index.mjs
 *   node __scripts/admin/ensure-vote-slug-unique-index.mjs --check-only
 */

import { existsSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import mongoose from "mongoose";

import { Vote } from "../../schema/Vote.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../..");

mongoose.set("strictQuery", true);

/** Same rules as helper/dbManager.js / MONGO_URI. */
function buildMongoUri() {
  if (process.env.MONGO_URI) return process.env.MONGO_URI;
  const host = process.env.MONGODB_HOST || "localhost";
  const port = process.env.MONGODB_PORT || "27017";
  const database = process.env.MONGODB_DATABASE;
  const username = process.env.MONGODB_USERNAME;
  const password = process.env.MONGODB_PASSWORD;
  const authSource = process.env.MONGODB_AUTH_SOURCE || "admin";
  if (!database) throw new Error("MONGODB_DATABASE or MONGO_URI must be set");
  let uri = "mongodb://";
  if (username && password) {
    uri += `${encodeURIComponent(username)}:${encodeURIComponent(password)}@`;
  }
  uri += `${host}:${port}/${database}`;
  if (username && password) uri += `?authSource=${authSource}`;
  return uri;
}

function loadEnv() {
  const envPath = path.join(repoRoot, ".env");
  const prodPath = path.join(repoRoot, ".env.production");
  if (existsSync(envPath)) dotenv.config({ path: envPath });
  if (existsSync(prodPath)) dotenv.config({ path: prodPath, override: true });
}

function parseArgs(argv) {
  const args = argv.slice(2);
  let checkOnly = false;
  for (const a of args) {
    if (a === "--help" || a === "-h") return { help: true };
    if (a === "--check-only") {
      checkOnly = true;
      continue;
    }
    console.error(`Unknown argument: ${a}`);
    process.exit(1);
  }
  return { checkOnly };
}

async function findDuplicateSlugs() {
  return Vote.aggregate([
    { $match: { slug: { $type: "string", $ne: "" } } },
    {
      $group: {
        _id: "$slug",
        ids: { $push: "$_id" },
        count: { $sum: 1 },
      },
    },
    { $match: { count: { $gt: 1 } } },
    { $sort: { count: -1 } },
  ]);
}

async function main() {
  const opts = parseArgs(process.argv);
  if (opts.help) {
    console.log(`Usage:
  node __scripts/admin/ensure-vote-slug-unique-index.mjs
  node __scripts/admin/ensure-vote-slug-unique-index.mjs --check-only

Reports duplicate Vote.slug values, then (unless --check-only) runs
Vote.syncIndexes() for the F-005 unique index.`);
    process.exit(0);
  }

  loadEnv();
  const uri = buildMongoUri();
  await mongoose.connect(uri);
  console.info("Connected to MongoDB");

  try {
    const duplicates = await findDuplicateSlugs();
    if (duplicates.length > 0) {
      console.error(`Found ${duplicates.length} duplicate Vote.slug value(s):`);
      for (const row of duplicates) {
        console.error(
          JSON.stringify(
            {
              slug: row._id,
              count: row.count,
              ids: row.ids,
            },
            null,
            2,
          ),
        );
      }
      console.error("Resolve duplicate slugs before creating the unique index. Aborting.");
      process.exit(1);
    }

    console.info("No duplicate Vote.slug values.");

    if (opts.checkOnly) {
      console.info("--check-only: skipping syncIndexes.");
      return;
    }

    const result = await Vote.syncIndexes();
    console.info("Vote.syncIndexes() completed.", result ?? "");
  } finally {
    await mongoose.disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
