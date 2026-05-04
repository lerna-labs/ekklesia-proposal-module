/**
 * Renders notification emails for plan event types only:
 * submission_confirmed, proposal_withdrawn (instant); new_comment (digest/cron);
 * voting_opened, results_published (instant).
 *
 * Optionally sends a few samples to Mailtrap (one per section) to limit rate limits.
 *
 * Usage (repo root):
 *   node mailer/dev-tests/email-events.test.js
 *
 * Env:
 *   MAILTRAP_INBOX_ID, MAILTRAP_TOKEN — optional; if missing, sends are skipped (assertions still run).
 *   MAILTRAP_SEND=1 — fail if Mailtrap credentials missing or send fails (including network errors).
 *   MAIL_FROM_EMAIL, MAIL_FROM_NAME — from identity (defaults are safe fallbacks).
 *   MAILTEST_TO_EMAIL — recipient for sandbox API (defaults to MAIL_FROM_EMAIL).
 *   MAILTRAP_SEND_COOLDOWN_MS — wait this many ms between Mailtrap sends (default 1100) to avoid 429 rate limits.
 *
 * Loads `.env` / `.env.development` from project root when present.
 */
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import {
  renderDigestFromPayload,
  renderInstantDigestFromPayload,
} from "../render.js";
import { send as sendEmail } from "../transport.js";
import {
  instantEventFixture,
  commentDigestAggregatedFixture,
} from "./fixtures.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "../..");

dotenv.config({ path: path.join(ROOT, ".env") });
dotenv.config({ path: path.join(ROOT, ".env.development") });

const BRAND = "intersect";

const MAILTRAP_COOLDOWN_MS = Math.max(
  0,
  Number.parseInt(process.env.MAILTRAP_SEND_COOLDOWN_MS ?? "1100", 10) || 0,
);

let lastMailtrapSendAt = 0;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Spaces out Mailtrap API calls so sandbox tiers do not return 429. */
async function throttleMailtrapBeforeSend() {
  if (!mailtrapConfigured() || MAILTRAP_COOLDOWN_MS === 0) return;
  if (lastMailtrapSendAt === 0) return;
  const elapsed = Date.now() - lastMailtrapSendAt;
  const waitMs = MAILTRAP_COOLDOWN_MS - elapsed;
  if (waitMs > 0) await sleep(waitMs);
}

/** Instant send path only (plan: new_comment is digest/cron only). */
const INSTANT_EVENT_TYPES = [
  "submission_confirmed",
  "proposal_withdrawn",
  "voting_opened",
  "results_published",
];

function mailtrapConfigured() {
  return Boolean(process.env.MAILTRAP_INBOX_ID && process.env.MAILTRAP_TOKEN);
}

async function maybeSendToMailtrap(category, subject, html) {
  const force = process.env.MAILTRAP_SEND === "1";
  if (!mailtrapConfigured()) {
    if (force) {
      throw new Error(
        "MAILTRAP_SEND=1 requires MAILTRAP_INBOX_ID and MAILTRAP_TOKEN",
      );
    }
    console.warn(
      `[email-events] Skip Mailtrap (${category}): set MAILTRAP_INBOX_ID + MAILTRAP_TOKEN`,
    );
    return;
  }

  const toEmail =
    process.env.MAILTEST_TO_EMAIL ||
    process.env.MAIL_FROM_EMAIL ||
    "sandbox@mailtrap.io";

  await throttleMailtrapBeforeSend();

  try {
    await sendEmail({
      from: {
        email: process.env.MAIL_FROM_EMAIL || "notifications@example.test",
        name: process.env.MAIL_FROM_NAME || "Mailer dev test",
      },
      to: { email: toEmail },
      subject: `[mailer-dev] ${subject}`.slice(0, 998),
      html,
      category,
    });
  } catch (err) {
    if (process.env.MAILTRAP_SEND === "1") {
      throw err;
    }
    console.warn(
      `[email-events] Mailtrap send failed (${category}); set MAILTRAP_SEND=1 to fail hard. ${err.message}`,
    );
  } finally {
    lastMailtrapSendAt = Date.now();
  }
}

async function assertInstantEvent(type) {
  const fixture = instantEventFixture(type);
  const result = await renderInstantDigestFromPayload(fixture, { brand: BRAND });
  assert.ok(result.subject.length > 0, `${type}: subject`);
  assert.ok(result.html.length > 500, `${type}: html length`);
  assert.ok(result.preheader?.length > 0, `${type}: preheader`);

  switch (type) {
    case "submission_confirmed":
      assert.ok(result.html.includes("CONFIRMED"), `${type}: badge`);
      break;
    case "proposal_withdrawn":
      assert.ok(result.html.includes("Policy breach"), `${type}: reason`);
      assert.ok(
        result.html.includes("Admin withdrawal note"),
        `${type}: comment`,
      );
      break;
    case "results_published":
      assert.ok(
        result.html.includes("https://example.test/results/milestone"),
        `${type}: results link`,
      );
      break;
    default:
      break;
  }
}

async function assertCommentDigest() {
  const fixture = commentDigestAggregatedFixture();
  const result = await renderDigestFromPayload(fixture, { brand: BRAND });
  assert.ok(result.subject.length > 0, "comment digest: subject");
  assert.ok(result.html.includes("24h digest"), "comment digest: digest label");
  assert.ok(result.html.includes("Single Vote Pack"), "comment digest: vote title");
  assert.ok(result.html.includes("Proposal One"), "comment digest: proposal 1");
  assert.ok(result.html.includes("Proposal Two"), "comment digest: proposal 2");
  assert.ok(result.html.includes("Alice"), "comment digest: alice");
  assert.ok(result.html.includes("Carol"), "comment digest: carol");
  return result;
}

async function main() {
  for (const type of INSTANT_EVENT_TYPES) {
    await assertInstantEvent(type);
  }

  const sampleInstant = await renderInstantDigestFromPayload(
    instantEventFixture("submission_confirmed"),
    { brand: BRAND },
  );
  await maybeSendToMailtrap(
    "instant-sample",
    sampleInstant.subject,
    sampleInstant.html,
  );

  const commentDigest = await assertCommentDigest();
  await maybeSendToMailtrap(
    "digest-new-comment",
    commentDigest.subject,
    commentDigest.html,
  );

  console.log("email-events.test.js: all checks passed");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
