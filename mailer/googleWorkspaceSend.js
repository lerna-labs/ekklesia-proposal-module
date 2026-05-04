import fs from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { google } from "googleapis";
import { JWT } from "google-auth-library";
import nodemailer from "nodemailer";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.join(__dirname, "..");

const GMAIL_SEND_SCOPE = "https://www.googleapis.com/auth/gmail.send";

export function resolveServiceAccountKeyPath() {
  const fromEnv =
    process.env.GOOGLE_APPLICATION_CREDENTIALS ||
    process.env.GMAIL_SERVICE_ACCOUNT_KEY_PATH;
  if (fromEnv && String(fromEnv).trim()) {
    return path.resolve(String(fromEnv).trim());
  }
  return path.join(REPO_ROOT, "google_keys.json");
}

function formatAddress(addr) {
  if (!addr?.email) return "";
  const name = addr.name?.trim();
  if (name) return `${name} <${addr.email}>`;
  return addr.email;
}

/** Nodemailer `from` as `{ name, address }` so display names are applied in the MIME From (not only address). */
function nodemailerFrom(addr) {
  if (!addr?.email) return "";
  const email = String(addr.email).trim();
  const name = addr.name?.trim();
  if (name) return { name, address: email };
  return email;
}

function htmlToPlain(html) {
  return String(html ?? "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Send via Gmail API using a service account key + Workspace domain-wide delegation.
 *
 * @param {object} args
 * @param {{ email: string, name?: string }} args.from
 * @param {Array<{ email: string, name?: string }>} args.to
 * @param {string} args.subject
 * @param {string} args.html
 * @param {string} [args.text]
 * @param {Record<string, string>} [args.headers]
 * @param {string} [args.category]
 */
export async function sendViaGoogleWorkspace({
  from,
  to,
  subject,
  html,
  text,
  headers = {},
  category,
}) {
  const keyPath = resolveServiceAccountKeyPath();
  if (!fs.existsSync(keyPath)) {
    throw new Error(
      `Google Workspace mail: credentials file not found at ${keyPath}. Set GOOGLE_APPLICATION_CREDENTIALS or add google_keys.json at repo root.`,
    );
  }

  const impersonate =
    process.env.GMAIL_IMPERSONATE_USER?.trim() ||
    process.env.IMPERSONATE_USER?.trim() ||
    process.env.WORKSPACE_SENDER_EMAIL?.trim();
  if (!impersonate) {
    throw new Error(
      "Google Workspace mail: set GMAIL_IMPERSONATE_USER (Workspace user to impersonate via domain-wide delegation).",
    );
  }

  let creds;
  try {
    creds = JSON.parse(await readFile(keyPath, "utf8"));
  } catch {
    throw new Error(
      `Google Workspace mail: could not read or parse JSON at ${keyPath}`,
    );
  }
  if (
    creds.type !== "service_account" ||
    !creds.client_email ||
    !creds.private_key
  ) {
    throw new Error(
      `Google Workspace mail: ${keyPath} must be a service account JSON with client_email and private_key.`,
    );
  }

  // Use email + key from parsed JSON (same as manual JWT setup); keyFile alone can yield invalid_grant / Invalid issuer: null.
  const auth = new JWT({
    email: creds.client_email,
    key: creds.private_key,
    scopes: [GMAIL_SEND_SCOPE],
    subject: impersonate,
  });

  const gmail = google.gmail({ version: "v1", auth });

  const mergedHeaders = { ...headers };
  if (category) mergedHeaders["X-Notification-Category"] = String(category);

  const plain = text?.trim() ? text : htmlToPlain(html);

  const transport = nodemailer.createTransport({
    streamTransport: true,
    newline: "unix",
    buffer: true,
  });

  const info = await transport.sendMail({
    from: nodemailerFrom(from),
    to: to.map((r) => formatAddress(r)).filter(Boolean).join(", "),
    subject,
    html,
    text: plain || undefined,
    headers: mergedHeaders,
  });

  const rawBuffer = /** @type {Buffer} */ (info.message);
  const raw = rawBuffer.toString("base64url");

  let res;
  try {
    res = await gmail.users.messages.send({
      userId: "me",
      requestBody: { raw },
    });
  } catch (err) {
    const status = /** @type {{ response?: { status?: number } }} */ (err).response
      ?.status;
    const e = /** @type {Error & { statusCode?: number }} */ (err);
    if (status != null) e.statusCode = status;
    throw e;
  }

  return {
    messageId: res.data.id ?? null,
    providerResponse: res.data,
  };
}
