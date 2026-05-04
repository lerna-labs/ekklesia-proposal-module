import { sendToMailtrap } from "./mailtrap.js";
import { sendViaGoogleWorkspace } from "./googleWorkspaceSend.js";
import { sendWithRetry } from "./sendRetry.js";

function normalizeRecipient(to) {
  if (Array.isArray(to)) return to;
  if (to && typeof to === "object") return [to];
  throw new Error("transport.send requires `to` as an object or array");
}

function normalizeProvider(raw) {
  const p = String(raw || "mailtrap").trim().toLowerCase();
  if (p === "gmail" || p === "google" || p === "google_workspace" || p === "workspace") {
    return "google";
  }
  return p;
}

/** Resolved provider for `EMAIL_PROVIDER` (`mailtrap` | `google`). */
export function getEmailProvider() {
  return normalizeProvider(process.env.EMAIL_PROVIDER);
}

/**
 * Generic email transport entry point.
 * Supports Mailtrap (sandbox) and Google Workspace (Gmail API + service account).
 */
export async function send({
  from,
  to,
  subject,
  html,
  text,
  headers = {},
  category,
}) {
  const provider = getEmailProvider();

  const recipients = normalizeRecipient(to);

  if (provider === "mailtrap") {
    return sendWithRetry(() =>
      sendToMailtrap({
        subject,
        html,
        text,
        to: recipients,
        from,
        inboxId: process.env.MAILTRAP_INBOX_ID,
        token: process.env.MAILTRAP_TOKEN,
        category,
      }).then((result) => ({
        messageId: result?.message_ids?.[0] ?? null,
        providerResponse: result,
      }))
    );
  }

  if (provider === "google") {
    return sendWithRetry(() =>
      sendViaGoogleWorkspace({
        from,
        to: recipients,
        subject,
        html,
        text,
        headers,
        category,
      })
    );
  }

  throw new Error(
    `Unknown EMAIL_PROVIDER: ${provider}. Use mailtrap or google.`,
  );
}
