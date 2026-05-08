/**
 * Latency smoke tests for authenticated read/write paths (comments).
 * Does not assert tight SLAs; logs timings for visibility. Requires backend + login + seeded live proposal.
 *
 * Uses second identity keys (drep02_w9c) so parallel runs do not share the 5/min comment write bucket with comment-rate-limit.test.js (default stake).
 */

import { login } from "../../helpers/session.js";
import { getOtherStakeKeysDir } from "../../helpers/stakeKeys.js";
import { expectHttpStatus } from "../../helpers/httpAssert.js";
import { resolveVoteAndLiveProposal } from "../../helpers/testProposal.js";
import { connect, disconnect } from "../../helpers/testkitMongo.js";
import { Comment } from "../../../schema/Comment.js";

const KEYS_OTHER_STAKE = getOtherStakeKeysDir();

const API_BASE_URL = process.env.API_BASE_URL || "http://localhost:3000/api/v0";
const LOG = process.env.TESTKIT_LOG !== "0";

function log(label, ms) {
  if (LOG) console.log(`[testkit timing] ${label}: ${Math.round(ms)} ms`);
}

describe("Timing (comments)", () => {
  let cookieHeader;
  let proposalId;
  const createdCommentIds = [];

  beforeAll(async () => {
    await connect();
    const session = await login(API_BASE_URL, { keysDir: KEYS_OTHER_STAKE });
    cookieHeader = session.cookieHeader;
    const ids = await resolveVoteAndLiveProposal(API_BASE_URL);
    proposalId = ids.proposalId;
  }, 120000);

  afterAll(async () => {
    if (createdCommentIds.length > 0) {
      await Comment.deleteMany({ _id: { $in: createdCommentIds } });
    }
    if (cookieHeader) {
      await fetch(`${API_BASE_URL}/session`, {
        method: "DELETE",
        headers: { Cookie: cookieHeader },
      });
    }
    await disconnect();
  }, 60000);

  it("GET /comments?proposal= responds within reasonable time", async () => {
    const url = `${API_BASE_URL}/comments?proposal=${encodeURIComponent(proposalId)}`;
    const t0 = performance.now();
    const res = await fetch(url);
    const ms = performance.now() - t0;
    const text = await res.text();
    expectHttpStatus(res.status, 200, text, "GET /comments?proposal=");
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
    const text = await res.text();
    expectHttpStatus(res.status, 201, text, "POST /comments");
    const payload = JSON.parse(text);
    if (payload?._id) createdCommentIds.push(payload._id);
    log("POST /comments", ms);
    expect(ms).toBeLessThan(120_000);
  });
});
