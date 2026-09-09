/**
 * F-005 ratchet — Vote.slug must stay uniquely indexed with deploy preflight.
 */
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, "../..");

const voteSchemaPath = path.join(root, "schema/Vote.js");
const preflightPath = path.join(root, "__scripts/admin/ensure-vote-slug-unique-index.mjs");
const budgetSetupPath = path.join(root, "__scripts/setup-budget2026.js");
const ccSetupPath = path.join(root, "__scripts/setup-cc-vote2026.js");

const [voteSource, preflightSource, budgetSource, ccSource] = await Promise.all([
  fs.readFile(voteSchemaPath, "utf8"),
  fs.readFile(preflightPath, "utf8"),
  fs.readFile(budgetSetupPath, "utf8"),
  fs.readFile(ccSetupPath, "utf8"),
]);

const checks = [
  {
    ok: voteSource.includes("voteSchema.index({ slug: 1 }, { unique: true })"),
    message: "schema/Vote.js must declare a unique index on slug (F-005).",
  },
  {
    ok:
      preflightSource.includes("findDuplicateSlugs") &&
      preflightSource.includes("Vote.syncIndexes()"),
    message: "ensure-vote-slug-unique-index.mjs must report duplicates and syncIndexes (F-005).",
  },
  {
    ok: budgetSource.includes("isDuplicateKeyError") && ccSource.includes("isDuplicateKeyError"),
    message: "Vote setup scripts must handle duplicate-key errors on slug upsert (F-005).",
  },
];

for (const check of checks) {
  if (!check.ok) {
    console.error(check.message);
    process.exit(1);
  }
}

console.log("Vote slug unique-index guard check passed (F-005).");
