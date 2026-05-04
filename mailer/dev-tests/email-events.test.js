/**
 * Renders notification emails for plan event types only:
 * submission_confirmed, proposal_withdrawn (instant); new_comment (digest/cron);
 * voting_opened, results_published (instant).
 *
 * Optionally sends samples to Mailtrap (cooldown between sends when multiple).
 *
 * Usage (repo root):
 *   node mailer/dev-tests/email-events.test.js
 *   node mailer/dev-tests/email-events.test.js --list
 *   node mailer/dev-tests/email-events.test.js --only submission_confirmed
 *   node mailer/dev-tests/email-events.test.js --only comment
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

/** Aggregated new_comment digest (cron-shaped payload). */
const DIGEST_COMMENT_ALIASES = new Set(["comment", "digest-comment", "new_comment"]);

const INSTANT_IDS = new Set(INSTANT_EVENT_TYPES);

function mailtrapConfigured() {
  return Boolean(process.env.MAILTRAP_INBOX_ID && process.env.MAILTRAP_TOKEN);
}

function printHelp() {
  console.log(`Usage: node mailer/dev-tests/email-events.test.js [options]

Options:
  --help, -h       Show this help
  --list           Print selectable --only ids and exit
  --only <id>      Run a single variant (assertions + optional Mailtrap)

Instant ids (--only):
  submission_confirmed
  proposal_withdrawn
  voting_opened
  results_published

Digest ids (--only):
  comment          Aggregated new_comment digest (aliases: digest-comment, new_comment)

Default (no --only): run all instant types, then Mailtrap sample instant + comment digest.
`);
}

function printList() {
  console.log("Instant (--only <id>):");
  for (const id of INSTANT_EVENT_TYPES) console.log(`  ${id}`);
  console.log("Digest (--only <id>):");
  console.log("  comment   (aliases: digest-comment, new_comment)");
}

/**
 * @returns {{ mode: "all" } | { mode: "only"; target: string }}
 */
function parseCli(argv) {
  const args = argv.slice(2);
  let onlyValue = null;

  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === "--help" || a === "-h") {
      printHelp();
      process.exit(0);
    }
    if (a === "--list") {
      printList();
      process.exit(0);
    }
    if (a === "--only") {
      onlyValue = args[i + 1];
      if (!onlyValue || onlyValue.startsWith("-")) {
        console.error("email-events: --only requires an id (see --list).");
        process.exit(1);
      }
      i += 1;
      continue;
    }
    if (a.startsWith("--only=")) {
      onlyValue = a.slice("--only=".length);
      if (!onlyValue) {
        console.error("email-events: --only= requires a value (see --list).");
        process.exit(1);
      }
      continue;
    }
    console.error(`email-events: unknown argument: ${a}`);
    printHelp();
    process.exit(1);
  }

  if (onlyValue != null) {
    const normalized = String(onlyValue).trim().toLowerCase();
    if (DIGEST_COMMENT_ALIASES.has(normalized)) {
      return { mode: "only", target: "comment" };
    }
    if (INSTANT_IDS.has(normalized)) {
      return { mode: "only", target: normalized };
    }
    console.error(
      `email-events: unknown --only id "${onlyValue}". Use --list.`,
    );
    process.exit(1);
  }

  return { mode: "all" };
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
  return result;
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

async function runOnly(target) {
  if (target === "comment") {
    const commentDigest = await assertCommentDigest();
    await maybeSendToMailtrap(
      "digest-new-comment",
      commentDigest.subject,
      commentDigest.html,
    );
    console.log("email-events.test.js: --only comment passed");
    return;
  }

  const type = target;
  const result = await assertInstantEvent(type);
  await maybeSendToMailtrap(`instant-${type}`, result.subject, result.html);
  console.log(`email-events.test.js: --only ${type} passed`);
}

async function runAll() {
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

async function main() {
  const cli = parseCli(process.argv);
  if (cli.mode === "only") {
    await runOnly(cli.target);
  } else {
    await runAll();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
