#!/usr/bin/env node
/**
 * Import a proposal JSON (MongoDB Extended JSON from export-proposal.mjs) into MongoDB.
 * Root `proposerId` is always replaced with IMPORT_PROPOSER_ID below (edit before use).
 *
 * Prerequisites:
 * - Same MongoDB env as export-proposal.mjs / the API server.
 * - Base `.env`, then `.env.development` or `.env.production` (menu or `--env`).
 *
 * Reads ./<proposalId>.json in the current working directory (same convention as export).
 *
 * Usage (from repo root):
 *   node __scripts/admin/import-proposal.mjs <proposalId>
 *   node __scripts/admin/import-proposal.mjs <proposalId> --env production
 */

import { existsSync, readFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createInterface } from "node:readline/promises";
import dotenv from "dotenv";
import mongoose from "mongoose";
import { EJSON } from "bson";

import { Proposal } from "../../schema/Proposal.js";

/**
 * Set the proposer id (stake or DRep Bech32) used for every import.
 * Replace the placeholder before running.
 */
const IMPORT_PROPOSER_ID = "stake_test1uqwcrkr4chst8xnk5se4442fz5ku5ekql644zew5l5uwswgf643wf";

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

function isValidProposalId(id) {
  return typeof id === "string" && /^[a-fA-F0-9]{24}$/.test(id);
}

/** @typedef {"development"|"production"} EnvProfile */

function parseArgs(argv) {
  const args = argv.slice(2);
  /** @type {EnvProfile | null} */
  let env = null;
  const positional = [];

  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === "--help" || a === "-h") return { help: true };
    if (a === "--env" || a === "-e") {
      const v = args[++i];
      if (!v) {
        console.error("Missing value after --env / -e (development or production)");
        process.exit(1);
      }
      const n = normalizeEnvArg(v);
      if (!n) {
        console.error("--env must be development or production");
        process.exit(1);
      }
      env = n;
      continue;
    }
    if (a.startsWith("-")) {
      console.error(`Unknown option: ${a}`);
      process.exit(1);
    }
    positional.push(a);
  }

  return {
    help: false,
    proposalId: positional[0] ?? "",
    env,
  };
}

/** @param {string} v */
function normalizeEnvArg(v) {
  const s = String(v).trim().toLowerCase();
  if (s === "development" || s === "dev") return "development";
  if (s === "production" || s === "prod") return "production";
  return null;
}

/**
 * @param {EnvProfile} profile
 */
function loadEnvForProfile(profile) {
  dotenv.config({ path: path.join(repoRoot, ".env") });
  const overrideName = profile === "development" ? ".env.development" : ".env.production";
  const overridePath = path.join(repoRoot, overrideName);
  dotenv.config({ path: overridePath });
  if (!existsSync(overridePath)) {
    console.error(`Warning: ${overrideName} not found at ${overridePath}`);
  }
}

/**
 * @returns {Promise<EnvProfile>}
 */
async function resolveEnvProfile(parsedEnv) {
  if (parsedEnv) return parsedEnv;
  const fromEnv = normalizeEnvArg(process.env.IMPORT_PROPOSAL_ENV ?? "");
  if (fromEnv) return fromEnv;
  if (!process.stdin.isTTY) {
    console.error(
      "Non-interactive terminal: pass --env development|production or set IMPORT_PROPOSAL_ENV=development|production",
    );
    process.exit(1);
  }
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  try {
    /** @type {EnvProfile | null} */
    let picked = null;
    while (picked === null) {
      const line = await rl.question(
        "\nWhich env file should override .env?\n  1) .env.development\n  2) .env.production\nEnter 1 or 2: ",
      );
      const t = line.trim();
      if (t === "1") picked = "development";
      else if (t === "2") picked = "production";
      else console.error("Please enter 1 or 2.");
    }
    return picked;
  } finally {
    rl.close();
  }
}

function printHelp() {
  console.log(`Usage: node __scripts/admin/import-proposal.mjs <proposalId> [options]

Reads ./<proposalId>.json (current working directory), replaces proposerId with the
hardcoded IMPORT_PROPOSER_ID in this script, then upserts the proposal in MongoDB.

Options:
  -e, --env <name>      Override file: development → .env.development, production → .env.production
                        (skips the interactive menu)

Environment (same as the API server — see helper/dbManager.js):
  Load order: .env, then .env.development OR .env.production (menu or --env).
  Non-interactive: use --env or IMPORT_PROPOSAL_ENV=development|production.

  MONGO_URI             Full connection string (overrides MONGODB_* below)
  MONGODB_HOST          Default: localhost
  MONGODB_PORT          Default: 27017
  MONGODB_DATABASE      Required unless MONGO_URI is set
  MONGODB_USERNAME      Optional
  MONGODB_PASSWORD      Optional
  MONGODB_AUTH_SOURCE   Default: admin
`);
}

function assertProposerConfigured() {
  const id = typeof IMPORT_PROPOSER_ID === "string" ? IMPORT_PROPOSER_ID.trim() : "";
  if (!id || id === "REPLACE_ME_WITH_YOUR_STAKE_ID") {
    console.error(
      "Set IMPORT_PROPOSER_ID in __scripts/admin/import-proposal.mjs to your stake/dRep Bech32 id (replace the placeholder).",
    );
    process.exit(1);
  }
}

async function main() {
  const parsed = parseArgs(process.argv);
  if (parsed.help) {
    printHelp();
    process.exit(0);
  }

  assertProposerConfigured();

  const { proposalId, env: envFlag } = parsed;

  if (!proposalId) {
    console.error("Missing proposalId. Use --help for usage.");
    process.exit(1);
  }
  if (!isValidProposalId(proposalId)) {
    console.error("proposalId must be a 24-character hexadecimal ObjectId.");
    process.exit(1);
  }

  const jsonPath = path.join(process.cwd(), `${proposalId}.json`);
  if (!existsSync(jsonPath)) {
    console.error(`File not found: ${jsonPath}`);
    process.exit(1);
  }

  const profile = await resolveEnvProfile(envFlag);
  loadEnvForProfile(profile);

  let raw;
  try {
    raw = JSON.parse(readFileSync(jsonPath, "utf8"));
  } catch (err) {
    console.error(`Invalid JSON in ${jsonPath}:`, err.message);
    process.exit(1);
  }

  /** @type {Record<string, unknown>} */
  let doc;
  try {
    doc = EJSON.deserialize(raw);
  } catch (err) {
    console.error(`Invalid MongoDB Extended JSON in ${jsonPath}:`, err.message);
    process.exit(1);
  }

  const fileId = doc._id != null ? String(doc._id) : "";
  if (fileId !== proposalId) {
    console.error(
      `File _id (${fileId || "missing"}) does not match argument proposalId (${proposalId}).`,
    );
    process.exit(1);
  }

  doc.proposerId = IMPORT_PROPOSER_ID;

  const uri = buildMongoUri();
  await mongoose.connect(uri);

  try {
    const _id = doc._id;
    const result = await Proposal.replaceOne({ _id }, doc, { upsert: true });
    const matched = result.matchedCount ?? 0;
    const modified = result.modifiedCount ?? 0;
    const upserted = result.upsertedCount ?? 0;
    console.error(
      `Imported ${proposalId} (matched=${matched}, modified=${modified}, upserted=${upserted}). proposerId → ${IMPORT_PROPOSER_ID}`,
    );
  } finally {
    await mongoose.disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
