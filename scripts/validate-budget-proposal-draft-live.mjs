#!/usr/bin/env node
/**
 * Run budget2026 validation on a proposal JSON twice: as draft, then as live.
 * Accepts a Mongo export (Extended JSON) or a plain object with title/summary/metaData/voteId.
 *
 * Usage:
 *   node scripts/validate-budget-proposal-draft-live.mjs <path-to.json>
 *   node scripts/validate-budget-proposal-draft-live.mjs <proposalId>
 *       (reads ./<proposalId>.json from the current working directory, same as import-proposal.mjs)
 */

import { existsSync, readFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { EJSON } from "bson";
import { z } from "zod";

import { validate } from "../validation/budget2026/validationScript.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function parseArgs(argv) {
  const args = argv.slice(2);
  const positional = [];
  for (const a of args) {
    if (a === "--help" || a === "-h") return { help: true, input: "" };
    if (a.startsWith("-")) {
      console.error(`Unknown option: ${a}`);
      process.exit(1);
    }
    positional.push(a);
  }
  return { help: false, input: positional[0] ?? "" };
}

function printHelp() {
  console.log(`Usage: node scripts/validate-budget-proposal-draft-live.mjs <json-path|proposalId>

Runs validation/budget2026 validate() with status "draft", then with status "live".

  <json-path>   Relative or absolute path to proposal JSON (Mongo Extended JSON OK).
  <proposalId>  24-char hex id → reads ./<proposalId>.json from the current working directory.
`);
}

function isProposalIdHex(s) {
  return typeof s === "string" && /^[a-fA-F0-9]{24}$/.test(s);
}

function resolveInputPath(raw) {
  if (!raw) return "";
  const tryAbs = path.isAbsolute(raw) ? raw : path.join(process.cwd(), raw);
  if (existsSync(tryAbs)) return tryAbs;
  if (isProposalIdHex(raw)) {
    const byId = path.join(process.cwd(), `${raw}.json`);
    if (existsSync(byId)) return byId;
  }
  return tryAbs;
}

/** @param {unknown} v */
function voteIdToString(v) {
  if (v == null) return "";
  if (typeof v === "string" && /^[a-fA-F0-9]{24}$/.test(v)) return v;
  if (typeof v === "object" && v !== null && "$oid" in v && typeof v.$oid === "string") return v.$oid;
  const s = String(v).trim();
  if (/^[a-fA-F0-9]{24}$/.test(s)) return s;
  return s;
}

/**
 * Map a stored proposal document to the API body shape expected by validate().
 * @param {Record<string, unknown>} doc
 */
function docToProposalBody(doc) {
  const voteId = voteIdToString(doc.voteId);
  const title = typeof doc.title === "string" ? doc.title : "";
  const summary = typeof doc.summary === "string" ? doc.summary : "";
  const metaData =
    doc.metaData != null && typeof doc.metaData === "object" && !Array.isArray(doc.metaData)
      ? /** @type {Record<string, unknown>} */ (doc.metaData)
      : {};
  return { voteId, title, summary, metaData };
}

function printPhase(label, result) {
  console.log(`\n--- ${label} ---`);
  if (result.success) {
    console.log("OK");
    return;
  }
  const tree = z.treeifyError(result.error);
  console.log(JSON.stringify(tree, null, 2));
}

function main() {
  const { help, input } = parseArgs(process.argv);
  if (help) {
    printHelp();
    process.exit(0);
  }
  if (!input) {
    console.error("Missing path or proposalId. Use --help for usage.");
    process.exit(1);
  }

  const jsonPath = resolveInputPath(input);
  if (!existsSync(jsonPath)) {
    console.error(`File not found: ${jsonPath}`);
    process.exit(1);
  }

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
    console.error(`Could not deserialize as Mongo Extended JSON (${jsonPath}):`, err.message);
    process.exit(1);
  }

  const base = docToProposalBody(doc);
  if (!base.voteId || !/^[a-fA-F0-9]{24}$/.test(base.voteId)) {
    console.error(
      `voteId must be a 24-char hex string after normalization (got: ${JSON.stringify(doc.voteId)}).`,
    );
    process.exit(1);
  }

  console.log(`File: ${jsonPath}`);
  console.log(`voteId: ${base.voteId}`);

  const draftBody = { ...base, status: "draft" };
  const liveBody = { ...base, status: "live" };

  const draftResult = validate(draftBody);
  const liveResult = validate(liveBody);

  printPhase('Draft (createDraftProposalBodySchema)', draftResult);
  printPhase('Live (createProposalBodySchema + live-only checks)', liveResult);

  const ok = draftResult.success && liveResult.success;
  process.exit(ok ? 0 : 1);
}

main();
