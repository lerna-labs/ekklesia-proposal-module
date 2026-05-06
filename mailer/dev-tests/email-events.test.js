/**
 * Renders notification emails for plan event types only:
 * submission_confirmed, proposal_withdrawn (instant); new_comment (digest/cron);
 * voting_opened, results_published (instant).
 *
 * Optionally sends samples through the configured transport (Mailtrap or Google; cooldown between sends when multiple).
 *
 * Usage (repo root):
 *   node mailer/dev-tests/email-events.test.js
 *   node mailer/dev-tests/email-events.test.js --list
 *   node mailer/dev-tests/email-events.test.js --only submission_confirmed
 *   node mailer/dev-tests/email-events.test.js --only comment
 *   node mailer/dev-tests/email-events.test.js --send-cron-cases
 *
 * Env:
 *   EMAIL_PROVIDER — mailtrap (default) or google; must match the credentials you set below.
 *   Mailtrap: MAILTRAP_INBOX_ID, MAILTRAP_TOKEN (optional; if missing, sample sends are skipped).
 *   Google: GMAIL_IMPERSONATE_USER, service account JSON, and **MAILTEST_TO_EMAIL** or **GOOGLE_DEV_TEST_EMAIL**
 *     (recipient for sample sends — required; Google delivers real mail).
 *   MAILTRAP_SEND=1 or EMAIL_SEND_FAIL_HARD=1 — fail if provider not configured or send fails.
 *   MAIL_FROM_EMAIL, MAIL_FROM_NAME — from identity (defaults are safe fallbacks).
 *   MAILTEST_TO_EMAIL — optional for Mailtrap (defaults to mad@madorkestra.com); required for Google sample sends (alias: GOOGLE_DEV_TEST_EMAIL).
 *   MAILTRAP_SEND_COOLDOWN_MS — delay between sample sends, any provider (default 1100) to reduce 429s.
 *
 * Loads `.env` / `.env.development` from project root when present.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import {
  renderDigestFromPayload,
  renderInstantDigestFromPayload,
} from "../render.js";
import { getEmailProvider, send as sendEmail } from "../transport.js";
import { resolveServiceAccountKeyPath } from "../googleWorkspaceSend.js";
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

let lastOutboundSendAt = 0;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Recipient for Google sample sends only (real inbox). */
function googleSampleRecipientEmail() {
  return (
    process.env.MAILTEST_TO_EMAIL?.trim() ||
    process.env.GOOGLE_DEV_TEST_EMAIL?.trim() ||
    ""
  );
}

function sampleRecipientEmail() {
  return (
    process.env.MAILTEST_TO_EMAIL?.trim() ||
    process.env.GOOGLE_DEV_TEST_EMAIL?.trim() ||
    "mad@madorkestra.com"
  );
}

function outboundSendConfigured() {
  const p = getEmailProvider();
  if (p === "mailtrap") {
    return Boolean(process.env.MAILTRAP_INBOX_ID && process.env.MAILTRAP_TOKEN);
  }
  if (p === "google") {
    const imp =
      process.env.GMAIL_IMPERSONATE_USER?.trim() ||
      process.env.WORKSPACE_SENDER_EMAIL?.trim();
    if (!imp) return false;
    if (!googleSampleRecipientEmail()) return false;
    return fs.existsSync(resolveServiceAccountKeyPath());
  }
  return false;
}

function outboundSkipHint() {
  const p = getEmailProvider();
  if (p === "mailtrap") {
    return "set MAILTRAP_INBOX_ID and MAILTRAP_TOKEN";
  }
  if (p === "google") {
    return "set GMAIL_IMPERSONATE_USER, service account key file (GOOGLE_APPLICATION_CREDENTIALS or ./google_keys.json), and MAILTEST_TO_EMAIL or GOOGLE_DEV_TEST_EMAIL (sample recipient)";
  }
  return "set EMAIL_PROVIDER to mailtrap or google";
}

function sendFailHardEnabled() {
  return (
    process.env.MAILTRAP_SEND === "1" ||
    process.env.EMAIL_SEND_FAIL_HARD === "1"
  );
}

/** Spaces out outbound API calls so providers return fewer 429s. */
async function throttleOutboundBeforeSend() {
  if (!outboundSendConfigured() || MAILTRAP_COOLDOWN_MS === 0) return;
  if (lastOutboundSendAt === 0) return;
  const elapsed = Date.now() - lastOutboundSendAt;
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

function printHelp() {
  console.log(`Usage: node mailer/dev-tests/email-events.test.js [options]

Options:
  --help, -h       Show this help
  --list           Print selectable --only ids and exit
  --only <id>      Run a single variant (assertions + optional sample send)
  --send-cron-cases  Send real samples for comment digest, voting_opened, results_published

Instant ids (--only):
  submission_confirmed
  proposal_withdrawn
  voting_opened
  results_published

Digest ids (--only):
  comment          Aggregated new_comment digest (aliases: digest-comment, new_comment)

Default (no --only): run all instant types, then sample instant + comment digest (uses EMAIL_PROVIDER).
`);
}

function printList() {
  console.log("Instant (--only <id>):");
  for (const id of INSTANT_EVENT_TYPES) console.log(`  ${id}`);
  console.log("Digest (--only <id>):");
  console.log("  comment   (aliases: digest-comment, new_comment)");
}

/**
 * @returns {{ mode: "all" } | { mode: "only"; target: string } | { mode: "cron-cases" }}
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
    if (a === "--send-cron-cases") {
      return { mode: "cron-cases" };
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

async function maybeSendDevSample(category, subject, html) {
  const provider = getEmailProvider();
  const force = sendFailHardEnabled();
  if (!outboundSendConfigured()) {
    if (force) {
      throw new Error(
        `Sample send requires ${provider} credentials: ${outboundSkipHint()}`,
      );
    }
    console.warn(
      `[email-events] Skip send (${category}, provider=${provider}): ${outboundSkipHint()}`,
    );
    return;
  }

  const toEmail =
    provider === "google"
      ? googleSampleRecipientEmail()
      : sampleRecipientEmail();

  await throttleOutboundBeforeSend();

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
    if (force) {
      throw err;
    }
    console.warn(
      `[email-events] Send failed (${category}, provider=${provider}): ${err.message}. Set MAILTRAP_SEND=1 or EMAIL_SEND_FAIL_HARD=1 to fail hard.`,
    );
  } finally {
    lastOutboundSendAt = Date.now();
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
  assert.ok(
    result.html.includes("Your proposal has 2 new comments."),
    "comment digest: proposal one count copy",
  );
  assert.ok(
    result.html.includes("Your proposal has 1 new comment."),
    "comment digest: proposal two count copy",
  );
  assert.ok(
    result.html.includes("https://example.test/votes/single-pack/p1#comments"),
    "comment digest: proposal one comments anchor link",
  );
  assert.ok(
    result.html.includes("https://example.test/votes/single-pack/p2#comments"),
    "comment digest: proposal two comments anchor link",
  );
  return result;
}

async function runOnly(target) {
  if (target === "comment") {
    const commentDigest = await assertCommentDigest();
    await maybeSendDevSample(
      "digest-new-comment",
      commentDigest.subject,
      commentDigest.html,
    );
    console.log("email-events.test.js: --only comment passed");
    return;
  }

  const type = target;
  const result = await assertInstantEvent(type);
  await maybeSendDevSample(`instant-${type}`, result.subject, result.html);
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
  await maybeSendDevSample(
    "instant-sample",
    sampleInstant.subject,
    sampleInstant.html,
  );

  const commentDigest = await assertCommentDigest();
  await maybeSendDevSample(
    "digest-new-comment",
    commentDigest.subject,
    commentDigest.html,
  );

  console.log("email-events.test.js: all checks passed");
}

async function runCronCases() {
  const votingOpened = await assertInstantEvent("voting_opened");
  await maybeSendDevSample(
    "instant-voting_opened",
    votingOpened.subject,
    votingOpened.html,
  );

  const resultsPublished = await assertInstantEvent("results_published");
  await maybeSendDevSample(
    "instant-results_published",
    resultsPublished.subject,
    resultsPublished.html,
  );

  const commentDigest = await assertCommentDigest();
  await maybeSendDevSample(
    "digest-new-comment",
    commentDigest.subject,
    commentDigest.html,
  );

  console.log("email-events.test.js: cron cases sent (comment, voting_opened, results_published)");
}

async function main() {
  const cli = parseCli(process.argv);
  if (cli.mode === "only") {
    await runOnly(cli.target);
  } else if (cli.mode === "cron-cases") {
    await runCronCases();
  } else {
    await runAll();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
