/**
 * Comment write rate limit: POST /comments is limited to 5 per minute per user (see helper/rateLimiters.js).
 * Requires login, a live proposalId (PERF_PROPOSAL_ID or discover via ekklesia-testkit vote).
 */

import { login } from "../helpers/session.js";
import { resolveVoteAndLiveProposal } from "../helpers/testProposal.js";

const API_BASE_URL = process.env.API_BASE_URL || "http://localhost:3000/api/v0";

describe("Comment write rate limit", () => {
  it("6th POST /comments in one minute returns 429", async () => {
    const session = await login(API_BASE_URL);
    const { proposalId } = await resolveVoteAndLiveProposal(API_BASE_URL);

    let lastRes;
    for (let i = 0; i < 6; i++) {
      lastRes = await fetch(`${API_BASE_URL}/comments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: session.cookieHeader,
        },
        body: JSON.stringify({
          proposalId,
          content: `testkit rate-limit probe ${Date.now()}-${i}`,
        }),
      });
      if (i < 5) {
        expect(lastRes.status).toBe(201);
      }
    }
    expect(lastRes.status).toBe(429);
    const body = await lastRes.json().catch(() => ({}));
    const msg = (body.message || "").toLowerCase();
    expect(msg).toMatch(/too many|comment/);

    await fetch(`${API_BASE_URL}/session`, {
      method: "DELETE",
      headers: { Cookie: session.cookieHeader },
    });
  }, 120000);
});
