import { sendToMailtrap } from "./mailtrap.js";

function normalizeRecipient(to) {
  if (Array.isArray(to)) return to;
  if (to && typeof to === "object") return [to];
  throw new Error("transport.send requires `to` as an object or array");
}

/**
 * Generic email transport entry point.
 * Current implementation supports mailtrap only.
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
  const provider = String(process.env.EMAIL_PROVIDER || "mailtrap").trim().toLowerCase();
  if (provider !== "mailtrap") {
    throw new Error(`Unknown EMAIL_PROVIDER: ${provider}`);
  }

  const result = await sendToMailtrap({
    subject,
    html,
    text,
    to: normalizeRecipient(to),
    from,
    inboxId: process.env.MAILTRAP_INBOX_ID,
    token: process.env.MAILTRAP_TOKEN,
    category,
    headers,
  });

  return {
    messageId: result?.message_ids?.[0] ?? null,
    providerResponse: result,
  };
}
