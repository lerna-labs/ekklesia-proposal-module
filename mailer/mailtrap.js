const SANDBOX_ENDPOINT = "https://sandbox.api.mailtrap.io/api/send";

/**
 * Send a rendered message to a Mailtrap Email Testing (sandbox) inbox.
 * Nothing is actually delivered to the recipient — the inbox holds the message
 * for manual inspection in the Mailtrap UI.
 *
 * @param {object} args
 * @param {string} args.subject
 * @param {string} args.html
 * @param {{email: string, name?: string} | Array<{email: string, name?: string}>} args.to
 * @param {{email: string, name?: string}} args.from
 * @param {string} args.inboxId - numeric Mailtrap inbox id (string form is fine)
 * @param {string} args.token - Mailtrap API token
 * @param {string} [args.category] - optional label; used in the sandbox UI for filtering
 * @param {string} [args.text] - optional plain-text alternative
 * @returns {Promise<object>} Mailtrap API response JSON
 */
export async function sendToMailtrap({ subject, html, to, from, inboxId, token, category, text }) {
  if (!inboxId) throw new Error("sendToMailtrap: inboxId is required");
  if (!token) throw new Error("sendToMailtrap: token is required");

  const body = {
    from,
    to: Array.isArray(to) ? to : [to],
    subject,
    html,
  };
  if (text) body.text = text;
  if (category) body.category = category;

  const url = `${SANDBOX_ENDPOINT}/${encodeURIComponent(inboxId)}`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const raw = await res.text();
  let parsed;
  try {
    parsed = raw ? JSON.parse(raw) : {};
  } catch {
    parsed = { raw };
  }

  if (!res.ok) {
    const detail = parsed?.errors?.join("; ") ?? parsed?.message ?? raw ?? "unknown error";
    const err = new Error(`Mailtrap send failed (${res.status}): ${detail}`);
    err.statusCode = res.status;
    throw err;
  }
  return parsed;
}
