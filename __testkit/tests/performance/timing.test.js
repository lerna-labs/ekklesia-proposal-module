/**
 * Latency smoke tests for authenticated read/write paths (comments).
 * Does not assert tight SLAs; logs timings for visibility. Requires backend + login + seeded live proposal.
 *
 * Uses drep02 keys so parallel runs do not share the 5/min comment write bucket with comment-rate-limit.test.js (drep01).
 */

import path from "path";
import { fileURLToPath } from "url";
import { login } from "../../helpers/session.js";
import { resolveVoteAndLiveProposal } from "../../helpers/testProposal.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TESTKIT_ROOT = path.resolve(__dirname, "../..");
const KEYS_DREP02 = path.join(TESTKIT_ROOT, "keys", "drep02_w9c");

const API_BASE_URL = process.env.API_BASE_URL || "http://localhost:3000/api/v0";
const LOG = process.env.TESTKIT_LOG !== "0";

function log(label, ms) {
  if (LOG) console.log(`[testkit timing] ${label}: ${Math.round(ms)} ms`);
}

describe("Timing (comments)", () => {
  let cookieHeader;
  let proposalId;

  beforeAll(async () => {
    const session = await login(API_BASE_URL, { keysDir: KEYS_DREP02 });
    cookieHeader = session.cookieHeader;
    const ids = await resolveVoteAndLiveProposal(API_BASE_URL);
    proposalId = ids.proposalId;
  }, 120000);

  it("GET /comments?proposal= responds within reasonable time", async () => {
    const url = `${API_BASE_URL}/comments?proposal=${encodeURIComponent(proposalId)}`;
    const t0 = performance.now();
    const res = await fetch(url);
    const ms = performance.now() - t0;
    expect(res.ok).toBe(true);
    log("GET /comments?proposal=", ms);
    expect(ms).toBeLessThan(120_000);
  });

  it("POST /comments responds within reasonable time", async () => {
    const t0 = performance.now();
    const res = await fetch(`${API_BASE_URL}/comments`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: cookieHeader,
      },
      body: JSON.stringify({
        proposalId,
        content: `testkit timing ping ${Date.now()}`,
      }),
    });
    const ms = performance.now() - t0;
    expect(res.status).toBe(201);
    log("POST /comments", ms);
    expect(ms).toBeLessThan(120_000);
  });
});
