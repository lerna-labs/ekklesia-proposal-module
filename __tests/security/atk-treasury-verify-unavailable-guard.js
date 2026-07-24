/**
 * Ratchet — treasury deposit verification must separate provider outage (503)
 * from genuine validation failure (400). Provider error text must not reach clients.
 *
 * Covers:
 * - Source wiring in routes/api/v0/proposals.js (both call sites)
 * - Runtime mapping for ProviderError / rate-limit / auth / non-provider errors
 */
import assert from "node:assert/strict";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import {
  ProviderError,
  ProviderAuthError,
  ProviderRateLimitError,
} from "@lerna-labs/ekklesia-helpers/cardano";
import {
  TREASURY_VERIFY_UNAVAILABLE_MESSAGE,
  mapTreasuryProviderError,
  alertTreasuryProviderAuthFailure,
} from "../../helper/mapTreasuryProviderError.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const proposalsPath = path.resolve(__dirname, "../../routes/api/v0/proposals.js");
const source = await fs.readFile(proposalsPath, "utf8");

const sourceChecks = [
  {
    ok: source.includes('from "../../../helper/mapTreasuryProviderError.js"'),
    message: "proposals.js must import mapTreasuryProviderError helper.",
  },
  {
    ok: source.includes("mapTreasuryProviderError("),
    message: "validateProposalTreasuryTxHash must map ProviderError via mapTreasuryProviderError.",
  },
  {
    ok: source.includes("alertTreasuryProviderAuthFailure("),
    message: "Credential rejection must raise alertTreasuryProviderAuthFailure.",
  },
  {
    ok: source.includes("function sendTreasuryValidationFailure("),
    message: "Missing sendTreasuryValidationFailure for 503/400 mapping.",
  },
  {
    ok: source.includes("TREASURY_VERIFY_UNAVAILABLE_MESSAGE"),
    message: "503 responses must use TREASURY_VERIFY_UNAVAILABLE_MESSAGE (not provider text).",
  },
  {
    ok: (source.match(/sendTreasuryValidationFailure\(res,\s*validationResult\)/g) || [])
      .length >= 2,
    message:
      "Both treasury verification call sites (POST create + PUT update) must use sendTreasuryValidationFailure.",
  },
  {
    ok:
      source.includes('res.status(503).json({') &&
      source.includes("Retry-After"),
    message: "Unavailable path must return 503 and pass through Retry-After when present.",
  },
  {
    ok: (() => {
      const start = source.indexOf("function sendTreasuryValidationFailure(");
      if (start < 0) return false;
      const body = source.slice(
        start,
        source.indexOf("\nasync function validateProposalTreasuryTxHash", start),
      );
      return (
        body.includes("TREASURY_VERIFY_UNAVAILABLE_MESSAGE") &&
        !body.includes("err.message") &&
        !body.includes(".message,")
      );
    })(),
    message: "sendTreasuryValidationFailure must not forward err.message / provider text.",
  },
];

for (const check of sourceChecks) {
  if (!check.ok) {
    console.error(check.message);
    process.exit(1);
  }
}

// --- Runtime: outage / throttle / auth → unavailable (503 shape) ---

const outage = mapTreasuryProviderError(
  new ProviderError("Koios", "POST /tx_info failed: HTTP 503 upstream down"),
);
assert.deepEqual(outage, { ok: false, unavailable: true });
assert.ok(!("error" in outage));
assert.ok(!JSON.stringify(outage).includes("upstream down"));

const throttled = mapTreasuryProviderError(
  new ProviderRateLimitError("Blockfrost", "HTTP 429", 429, 42),
);
assert.equal(throttled?.unavailable, true);
assert.equal(throttled?.retryAfterSeconds, 42);
assert.ok(!JSON.stringify(throttled).includes("HTTP 429"));

const auth = mapTreasuryProviderError(
  new ProviderAuthError("Koios", "HTTP 403 Subscription expired", 403),
);
assert.equal(auth?.unavailable, true);
assert.equal(auth?.alert, "auth");
assert.ok(!JSON.stringify(auth).includes("Subscription expired"));

assert.equal(mapTreasuryProviderError(new Error("random")), null);
assert.equal(mapTreasuryProviderError({ error: "Transaction not found" }), null);

// Client message must be the fixed retry copy, never provider detail.
assert.equal(
  TREASURY_VERIFY_UNAVAILABLE_MESSAGE,
  "Unable to verify treasury donation right now. Please retry shortly.",
);
assert.ok(!TREASURY_VERIFY_UNAVAILABLE_MESSAGE.toLowerCase().includes("koios"));
assert.ok(!TREASURY_VERIFY_UNAVAILABLE_MESSAGE.toLowerCase().includes("blockfrost"));

// Auth alert path exists and logs without throwing.
const originalError = console.error;
let alertLogged = false;
console.error = (...args) => {
  alertLogged = String(args[0]).includes("[treasury-verify]");
};
try {
  alertTreasuryProviderAuthFailure(
    new ProviderAuthError("Koios", "HTTP 403 Subscription expired", 403),
  );
} finally {
  console.error = originalError;
}
assert.equal(alertLogged, true);

// Genuine validation failure shape (what verifyDeposit returns) stays a 400 concern:
// routes keep using treasuryTxHashErrorTree(validationResult.error) via sendTreasuryValidationFailure.
assert.ok(source.includes("treasuryTxHashErrorTree(validationResult.error)"));
assert.ok(source.includes('status: "error"'));
assert.ok(
  source.includes('message: "Validation failed"'),
  "Genuine validation failures must still surface as Validation failed (400).",
);

console.log(
  "Treasury verify unavailable→503 / mismatch→400 guard check passed.",
);
