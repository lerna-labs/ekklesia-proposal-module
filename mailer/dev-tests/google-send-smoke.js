/**
 * Minimal Google Workspace send (Gmail API + service account + delegation).
 *
 * From repo root (requires network + valid google_keys.json / env + delegation):
 *   node mailer/dev-tests/google-send-smoke.js you@yourdomain.com
 *
 * Or set MAILTEST_TO_EMAIL / GOOGLE_DEV_TEST_EMAIL and run with no args.
 * Same env as production Google mail: GMAIL_IMPERSONATE_USER, key file path, MAIL_FROM_*.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import {
  resolveServiceAccountKeyPath,
  sendViaGoogleWorkspace,
} from "../googleWorkspaceSend.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "../..");

dotenv.config({ path: path.join(ROOT, ".env") });
dotenv.config({ path: path.join(ROOT, ".env.development") });

const to =
  process.argv[2]?.trim() ||
  process.env.MAILTEST_TO_EMAIL?.trim() ||
  process.env.GOOGLE_DEV_TEST_EMAIL?.trim();

if (!to) {
  console.error(
    "Pass recipient: node mailer/dev-tests/google-send-smoke.js you@example.com",
  );
  console.error("Or set MAILTEST_TO_EMAIL / GOOGLE_DEV_TEST_EMAIL.");
  process.exit(1);
}

const from = {
  email: process.env.MAIL_FROM_EMAIL?.trim() || "notifications@example.com",
  name: process.env.MAIL_FROM_NAME?.trim() || "Google smoke",
};

const impersonate =
  process.env.GMAIL_IMPERSONATE_USER?.trim() ||
  process.env.WORKSPACE_SENDER_EMAIL?.trim() ||
  "(not set — GMAIL_IMPERSONATE_USER / WORKSPACE_SENDER_EMAIL)";

const keyPath = resolveServiceAccountKeyPath();
let clientEmail = "(unreadable)";
try {
  if (fs.existsSync(keyPath)) {
    const key = JSON.parse(fs.readFileSync(keyPath, "utf8"));
    clientEmail = key.client_email?.trim() || "(missing client_email in JSON)";
  } else {
    clientEmail = `(file not found: ${keyPath})`;
  }
} catch {
  clientEmail = "(could not parse service account JSON)";
}

console.log("from:", `${from.name} <${from.email}>`);
console.log("to:", to);
console.log("impersonate (delegation subject):", impersonate);
console.log("key file:", keyPath);
console.log("client_email (issuer):", clientEmail);

const result = await sendViaGoogleWorkspace({
  from,
  to: [{ email: to }],
  subject: `Ekklesia Google smoke — ${new Date().toISOString()}`,
  html: "<p>If you see this, Google Workspace send works.</p>",
  category: "google-smoke",
});

console.log("Sent. messageId:", result.messageId);
