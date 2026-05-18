#!/usr/bin/env node
/**
 * Export live proposals for the Cardano budget vote as CSV (admin / ops).
 *
 * Columns: _id, title, administrator, contact name, contact email, proposal_url
 * administrator is metaData.administrator, normalized to Intersect or Other (Yes/No legacy → Intersect/Other).
 * proposal_url uses https://hydra-voting.intersectmbo.org/votes/<voteSlug>/<proposalId>
 * (same path shape as the SvelteKit app: votes/[voteSlug]/[proposalId]).
 *
 * Contact fields come from metaData.proposerDetails (budget2026 form).
 *
 * Loads env from the repo root: `.env` (optional), then `.env.production` (required for MongoDB).
 *
 * Usage (from repo root):
 *   node __scripts/admin/export-budget-vote-proposals-csv.mjs
 *   node __scripts/admin/export-budget-vote-proposals-csv.mjs --vote-slug cardano-budget-2026 -o ./out.csv
 */

import { existsSync, writeFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import mongoose from "mongoose";

import { Proposal } from "../../schema/Proposal.js";
import { Vote } from "../../schema/Vote.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../..");

const DEFAULT_VOTE_SLUG = "cardano-budget-2026";
const PROPOSAL_HOST = "hydra-voting.intersectmbo.org";

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

function parseArgs(argv) {
  const args = argv.slice(2);
  /** @type {string | null} */
  let outPath = null;
  let voteSlug = DEFAULT_VOTE_SLUG;
  const positional = [];

  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === "--help" || a === "-h") return { help: true };
    if (a === "--vote-slug" || a === "-s") {
      const v = args[++i];
      if (!v?.trim()) {
        console.error("Missing value after --vote-slug / -s");
        process.exit(1);
      }
      voteSlug = v.trim();
      continue;
    }
    if (a === "--out" || a === "-o") {
      const v = args[++i];
      if (!v?.trim()) {
        console.error("Missing value after --out / -o");
        process.exit(1);
      }
      outPath = v.trim();
      continue;
    }
    if (a.startsWith("-")) {
      console.error(`Unknown option: ${a}`);
      process.exit(1);
    }
    positional.push(a);
  }

  return { help: false, voteSlug, outPath, positional };
}

/** Load `.env` then `.env.production` from repo root (production wins on duplicate keys). */
function loadProductionEnvFromRepoRoot() {
  const basePath = path.join(repoRoot, ".env");
  const prodPath = path.join(repoRoot, ".env.production");
  dotenv.config({ path: basePath });
  if (!existsSync(prodPath)) {
    console.error(`Missing required env file: ${prodPath}`);
    process.exit(1);
  }
  const result = dotenv.config({ path: prodPath, override: true });
  if (result.error) {
    console.error(`Failed to read ${prodPath}: ${result.error.message}`);
    process.exit(1);
  }
}

/** @param {unknown} v */
function stringField(v) {
  if (v == null) return "";
  if (typeof v === "string") return v;
  return String(v);
}

/**
 * metaData.administrator: Intersect | Other (legacy Yes | No), aligned with ProposalPageKeyDetails.svelte.
 * @param {Record<string, unknown>} meta
 */
function administratorExportLabel(meta) {
  const adm = stringField(meta?.administrator).trim();
  if (adm === "Intersect" || adm === "Yes") return "Intersect";
  if (adm === "Other" || adm === "No") return "Other";
  return adm;
}

/**
 * RFC 4180-style CSV cell: quote if needed.
 * @param {string} raw
 */
function csvCell(raw) {
  const s = raw.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

/**
 * @param {string} voteSlug
 * @param {string} proposalIdHex
 */
function proposalUrl(voteSlug, proposalIdHex) {
  return `https://${PROPOSAL_HOST}/votes/${encodeURIComponent(voteSlug)}/${proposalIdHex}`;
}

function printHelp() {
  console.log(`Usage: node __scripts/admin/export-budget-vote-proposals-csv.mjs [options]

Exports every live proposal for the vote (status === "live") with columns:
  _id, title, administrator, contact name, contact email, proposal_url

proposal_url host: ${PROPOSAL_HOST}

Options:
  -s, --vote-slug <slug>    Vote slug (default: ${DEFAULT_VOTE_SLUG})
  -o, --out <path>          Output CSV path (default: ./budget-vote-proposals-<slug>.csv in cwd)

Environment (repo root, always):
  .env (optional) then .env.production (required)
  MONGO_URI or MONGODB_* in those files.
`);
}

async function main() {
  const parsed = parseArgs(process.argv);
  if (parsed.help) {
    printHelp();
    process.exit(0);
  }

  if (parsed.positional.length > 0) {
    console.error("Unexpected arguments. Use --vote-slug for the slug. See --help.");
    process.exit(1);
  }

  loadProductionEnvFromRepoRoot();

  const voteSlug = parsed.voteSlug;
  const uri = buildMongoUri();
  await mongoose.connect(uri);

  try {
    const vote = await Vote.findOne({ slug: voteSlug }).select("_id slug").lean();
    if (!vote?._id) {
      console.error(`No vote found with slug: ${voteSlug}`);
      process.exit(1);
    }

    const proposals = await Proposal.find({ voteId: vote._id, status: "live" })
      .select("title metaData.administrator metaData.proposerDetails.name metaData.proposerDetails.email")
      .sort({ submittedAt: -1, _id: -1 })
      .lean();

    const header = ["_id", "title", "administrator", "contact name", "contact email", "proposal_url"];
    const lines = [header.map(csvCell).join(",")];

    for (const p of proposals) {
      const id = p._id?.toString?.() ?? String(p._id);
      const title = stringField(p.title);
      const meta = p.metaData && typeof p.metaData === "object" && !Array.isArray(p.metaData) ? p.metaData : {};
      const pd = meta.proposerDetails && typeof meta.proposerDetails === "object" ? meta.proposerDetails : {};
      const contactName = stringField(pd.name);
      const contactEmail = stringField(pd.email);
      const administrator = administratorExportLabel(meta);
      const url = proposalUrl(vote.slug ?? voteSlug, id);
      lines.push(
        [id, title, administrator, contactName, contactEmail, url].map((c) => csvCell(c)).join(","),
      );
    }

    const csv = `${lines.join("\n")}\n`;
    const defaultName = `budget-vote-proposals-${voteSlug.replace(/[^\w-]+/g, "_")}.csv`;
    const outPath = parsed.outPath
      ? path.isAbsolute(parsed.outPath)
        ? parsed.outPath
        : path.join(process.cwd(), parsed.outPath)
      : path.join(process.cwd(), defaultName);

    writeFileSync(outPath, csv, "utf8");
    console.error(`Wrote ${outPath} (${proposals.length} row(s) + header)`);
  } finally {
    await mongoose.disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
