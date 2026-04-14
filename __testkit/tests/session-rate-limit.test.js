/**
 * Session route rate-limit tests.
 * Verifies limiter thresholds in helper/rateLimiters.js:
 * - POST /session: 5/min per IP (6th -> 429)
 * - PUT /session: 10/min per IP (11th -> 429)
 * - GET /session: 60/min per IP (61st -> 429)
 * - DELETE /session: 20/min per IP (21st -> 429)
 *
 * Notes:
 * - These tests intentionally call GET/DELETE without auth; limiter runs before auth middleware.
 * - These probes validate rate limiting behavior, not authentication success.
 */
const API_BASE_URL = process.env.API_BASE_URL || "http://localhost:3000/api/v0";

const LOG = process.env.TESTKIT_LOG !== "0" && process.env.TESTKIT_LOG !== "false";

function log(msg) {
  if (LOG) console.log(msg);
}

async function assertRateLimited({
  method,
  path,
  attemptsBeforeLimit,
  requestInit = {},
}) {
  const url = `${API_BASE_URL}${path}`;
  let res;

  for (let i = 0; i < attemptsBeforeLimit; i++) {
    res = await fetch(url, { method, ...requestInit });
    // Limiter should not trigger yet.
    expect(res.status).not.toBe(429);
  }

  res = await fetch(url, { method, ...requestInit });
  expect(res.status).toBe(429);
  const bodyText = await res.text();
  expect(bodyText.toLowerCase()).toMatch(/too many|rate limit|429/);
}

describe("Session route rate limits", () => {
  it("limits POST /session to 5/min per IP (6th is 429)", async () => {
    await assertRateLimited({
      method: "POST",
      path: "/session",
      attemptsBeforeLimit: 5,
      requestInit: {
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      },
    });
    log("[testkit] POST /session limiter OK (6th request returned 429)");
  }, 120000);

  it("limits PUT /session to 10/min per IP (11th is 429)", async () => {
    await assertRateLimited({
      method: "PUT",
      path: "/session",
      attemptsBeforeLimit: 10,
      requestInit: {
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      },
    });
    log("[testkit] PUT /session limiter OK (11th request returned 429)");
  }, 120000);

  it("limits GET /session to 60/min per IP (61st is 429)", async () => {
    await assertRateLimited({
      method: "GET",
      path: "/session",
      attemptsBeforeLimit: 60,
    });
    log("[testkit] GET /session limiter OK (61st request returned 429)");
  }, 120000);

  it("limits DELETE /session to 20/min per IP (21st is 429)", async () => {
    await assertRateLimited({
      method: "DELETE",
      path: "/session",
      attemptsBeforeLimit: 20,
    });
    log("[testkit] DELETE /session limiter OK (21st request returned 429)");
  }, 120000);
});
