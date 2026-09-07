/**
 * F-006 ratchet — live proposal versioning must use optimistic CAS.
 *
 * Live → live updates must archive then apply via findOneAndUpdate filtered
 * on version (not a plain proposal.save() after archive).
 */
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const proposalsPath = path.resolve(__dirname, "../../routes/api/v0/proposals.js");
const source = await fs.readFile(proposalsPath, "utf8");

const checks = [
  {
    ok: source.includes("Proposal.findOneAndUpdate("),
    message: "Missing Proposal.findOneAndUpdate for live version CAS (F-006).",
  },
  {
    ok: source.includes('status: "live"') && source.includes("version: expectedVersion"),
    message:
      'findOneAndUpdate filter must include status: "live" and version: expectedVersion (F-006).',
  },
  {
    ok: source.includes("$inc: { version: 1 }"),
    message: "Missing atomic version increment via $inc (F-006).",
  },
  {
    ok:
      source.includes("Proposal.deleteOne({ _id: archivedDoc._id })") &&
      source.includes("status(409)"),
    message: "CAS miss must delete orphan archive and return 409 (F-006).",
  },
];

for (const check of checks) {
  if (!check.ok) {
    console.error(check.message);
    process.exit(1);
  }
}

console.log("Live proposal versioning CAS guard check passed (F-006).");
