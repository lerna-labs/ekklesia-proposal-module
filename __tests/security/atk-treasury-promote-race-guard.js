/**
 * #418 ratchet — treasury-donation hash promote race must be DB-enforced.
 *
 * Concurrent draft→live promotes with the same treasuryDonationTxHash must
 * hit a global partial unique index; route handlers must map E11000 to the
 * existing "already used" 400 error tree.
 */
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, "../..");

const schemaPath = path.join(root, "schema/Proposal.js");
const proposalsPath = path.join(root, "routes/api/v0/proposals.js");

const schema = await fs.readFile(schemaPath, "utf8");
const source = await fs.readFile(proposalsPath, "utf8");

const checks = [
  {
    ok: schema.includes('"metaData.treasuryDonationTxHash": 1'),
    message: "Missing unique index key on metaData.treasuryDonationTxHash (#418).",
  },
  {
    ok: !/index\(\s*\{\s*voteId:\s*1,\s*"metaData\.treasuryDonationTxHash"/.test(schema),
    message: "Treasury hash unique index must be global (no voteId in key) (#418).",
  },
  {
    ok:
      schema.includes("unique: true") &&
      schema.includes('status: { $nin: ["draft", "archived"] }') &&
      schema.includes('"metaData.treasuryDonationTxHash": { $type: "string", $ne: "" }'),
    message:
      "Treasury hash index must be unique with partialFilterExpression excluding draft/archived and empty hashes (#418).",
  },
  {
    ok:
      source.includes('from "../../../helper/mongoErrors.js"') &&
      source.includes("isDuplicateKeyError"),
    message: "proposals route must import isDuplicateKeyError (#418).",
  },
  {
    ok:
      source.includes("isTreasuryTxHashDuplicateKeyError") &&
      source.includes("sendTreasuryTxHashAlreadyUsed") &&
      source.includes("This transaction hash is already used by another proposal"),
    message: "POST/PUT must map treasury E11000 to the already-used 400 error tree (#418).",
  },
];

for (const check of checks) {
  if (!check.ok) {
    console.error(check.message);
    process.exit(1);
  }
}

console.log("Treasury promote race guard check passed (#418).");
