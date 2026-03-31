/**
 * Performance test: vote and proposal endpoints with 20k seeded proposals.
 * Measures response times only (HTTP). Does not seed or teardown; data must exist on the API.
 * Seed/teardown: run `node scripts/seed-perf.js` or `node scripts/seed-perf.js --teardown` from __testkit.
 * Requires: API running at API_BASE_URL. Set PERF_VOTE_ID and PERF_PROPOSAL_ID for remote, or rely on
 * API having vote with slug perf-test-20k (test will discover voteId/proposalId from API).
 */

import { PERF_VOTE_SLUG } from "../helpers/seedPerf.js";

const API_BASE_URL = process.env.API_BASE_URL || "http://localhost:3000/api/v0";
const LIMITS = [10, 20, 50, 100];
const SAMPLE_SIZE = 25;
/** Public read limit (200/min per IP); we throttle below it so measurement phase never hits 429. */
const PUBLIC_READ_LIMIT_PER_MIN = 200;
const PUBLIC_READ_WINDOW_MS = 60_000;
/** Stay under limit: pause after this many requests, then wait full window (sliding-window safe). */
const THROTTLE_AFTER = PUBLIC_READ_LIMIT_PER_MIN - 1;

/** Per-action response times (ms) for final average summary. */
const timings = {};

function log(msg) {
  if (process.env.TESTKIT_LOG !== "0") console.log(msg);
}

function recordTiming(action, ms) {
  if (!timings[action]) timings[action] = [];
  timings[action].push(ms);
}

async function measureGet(url) {
  const start = performance.now();
  const res = await fetch(url);
  const ms = Math.round(performance.now() - start);
  return { res, ms };
}

/** Assert res.ok; on failure throw with status and body so e.g. 404 "Vote not found" is visible. */
async function assertOk(r, label = "request") {
  if (r.res.ok) return;
  const body = await r.res.text();
  throw new Error(`${label} failed: ${r.res.status} ${body}`);
}

/** Throttle: stay under PUBLIC_READ_LIMIT_PER_MIN so measurement phase never hits 429. */
let throttleCount = 0;
async function throttleForRateLimit() {
  if (throttleCount >= THROTTLE_AFTER) {
    // Server uses a sliding window; wait full window so all previous requests have expired
    await new Promise((r) => setTimeout(r, PUBLIC_READ_WINDOW_MS));
    throttleCount = 0;
  }
  throttleCount++;
}

/** Run measureGet SAMPLE_SIZE times, assert each, record timings, log average once. */
async function runSamples(action, url, { expectOk = false, assertOkLabel = null } = {}) {
  for (let s = 0; s < SAMPLE_SIZE; s++) {
    await throttleForRateLimit();
    const r = await measureGet(url);
    if (assertOkLabel) await assertOk(r, assertOkLabel);
    else if (expectOk) expect(r.res.ok).toBe(true);
    recordTiming(action, r.ms);
  }
  const arr = timings[action];
  const recent = arr.slice(-SAMPLE_SIZE);
  const avg = Math.round(recent.reduce((a, b) => a + b, 0) / recent.length);
  log(`[perf] ${action} — ${avg} ms (${SAMPLE_SIZE} samples)`);
}

/** Resolve voteId, voteSlug, proposalId from env or by fetching from API (slug perf-test-20k). */
async function resolvePerfIds() {
  if (process.env.PERF_VOTE_ID && process.env.PERF_PROPOSAL_ID) {
    return {
      voteId: process.env.PERF_VOTE_ID.trim(),
      voteSlug: process.env.PERF_VOTE_SLUG?.trim() || PERF_VOTE_SLUG,
      proposalId: process.env.PERF_PROPOSAL_ID.trim(),
    };
  }
  const slug = PERF_VOTE_SLUG;
  const votesRes = await fetch(`${API_BASE_URL}/votes?slug=${encodeURIComponent(slug)}`);
  if (!votesRes.ok) {
    throw new Error(
      `Perf data not found. GET /votes?slug=${slug} returned ${votesRes.status}. ` +
        "Seed data first: from __testkit run `node scripts/seed-perf.js` (needs MongoDB). " +
        "Or set PERF_VOTE_ID and PERF_PROPOSAL_ID in env."
    );
  }
  const votesData = await votesRes.json();
  const vote = Array.isArray(votesData?.data) ? votesData.data[0] : votesData;
  if (!vote?._id) {
    throw new Error(
      `Perf vote not found (slug: ${slug}). Seed data first: from __testkit run \`node scripts/seed-perf.js\`. Or set PERF_VOTE_ID and PERF_PROPOSAL_ID.`
    );
  }
  const voteId = vote._id.toString();
  const voteSlug = vote.slug || slug;
  const proposalsRes = await fetch(`${API_BASE_URL}/proposals?vote=${voteId}&limit=1`);
  if (!proposalsRes.ok) {
    throw new Error(`GET /proposals?vote=... returned ${proposalsRes.status}. Ensure perf data is seeded.`);
  }
  const proposalsData = await proposalsRes.json();
  const firstProposal = Array.isArray(proposalsData?.data) ? proposalsData.data[0] : null;
  if (!firstProposal?._id) {
    throw new Error("No proposals found for perf vote. Seed data first: `node scripts/seed-perf.js`.");
  }
  const proposalId = firstProposal._id.toString();
  return { voteId, voteSlug, proposalId };
}

describe("Performance – vote and proposal endpoints", () => {
  let voteId;
  let voteSlug;
  let proposalId;

  beforeAll(async () => {
    const ids = await resolvePerfIds();
    voteId = ids.voteId;
    voteSlug = ids.voteSlug;
    proposalId = ids.proposalId;
  }, 30000);

  afterAll(async () => {
    // Print average response times as one block so Jest doesn't split each line (single console.log)
    const actions = Object.keys(timings).sort();
    if (actions.length > 0) {
      const rows = actions.map((action) => {
        const arr = timings[action];
        const avg = Math.round(arr.reduce((a, b) => a + b, 0) / arr.length);
        return { action, avg, n: arr.length };
      });
      const maxActionLen = Math.max(...rows.map((r) => r.action.length));
      const lines = [
        "",
        "[perf] Average response times (ms):",
        "  " + "Action".padEnd(maxActionLen) + "  Avg (ms)  Samples",
        "  " + "-".repeat(maxActionLen) + "  --------  -------",
        ...rows.map(({ action, avg, n }) => "  " + action.padEnd(maxActionLen) + "  " + String(avg).padStart(8) + "  " + n),
        "",
      ];
      console.log(lines.join("\n"));
    }
  }, 10000);

  it("measures vote endpoints and logs response times", async () => {
    const base = API_BASE_URL;
    await runSamples("GET /votes (list)", `${base}/votes`, { expectOk: true });
    await runSamples("GET /votes?slug", `${base}/votes?slug=${voteSlug}`, { expectOk: true });
    await runSamples("GET /votes/:id", `${base}/votes/${voteId}`, { expectOk: true });
    await runSamples("GET /votes pagination", `${base}/votes?page=2&limit=10`, { expectOk: true });
    await runSamples("GET /votes search", `${base}/votes?search=perf`, { expectOk: true });
  });

  it("measures proposal baseline and pagination and logs response times", async () => {
    const base = API_BASE_URL;
    await runSamples("GET /proposals list (default)", `${base}/proposals?vote=${voteId}`, {
      assertOkLabel: "GET /proposals?vote= (default limit). Backend must use same MongoDB as test (MONGO_URI/MONGODB_*).",
    });
    await runSamples("GET /proposals list (page=2)", `${base}/proposals?vote=${voteId}&page=2&limit=20`, {
      assertOkLabel: "GET /proposals?vote= page=2",
    });
    await runSamples("GET /proposals/:id", `${base}/proposals/${proposalId}`, {
      assertOkLabel: "GET /proposals/:id",
    });
  });

  it("measures proposal sort with different limits and logs each response time", async () => {
    const base = `${API_BASE_URL}/proposals`;
    for (const limit of LIMITS) {
      await runSamples("GET /proposals sort=title", `${base}?vote=${voteId}&sort=title&direction=asc&limit=${limit}`, {
        assertOkLabel: `GET /proposals sort=title limit=${limit}`,
      });
      await runSamples("GET /proposals sort=submittedAt", `${base}?vote=${voteId}&sort=submittedAt&direction=desc&limit=${limit}`, {
        assertOkLabel: `GET /proposals sort=submittedAt limit=${limit}`,
      });
    }
  });

  it("measures proposal search with different limits and logs each response time", async () => {
    const base = `${API_BASE_URL}/proposals`;
    const searchTerm = "Proposal";
    for (const limit of LIMITS) {
      await runSamples("GET /proposals search", `${base}?vote=${voteId}&search=${encodeURIComponent(searchTerm)}&limit=${limit}`, {
        assertOkLabel: `GET /proposals search= limit=${limit}`,
      });
    }
  });

  it("measures proposal filter (status=live) with different limits and logs each response time", async () => {
    const base = `${API_BASE_URL}/proposals`;
    for (const limit of LIMITS) {
      await runSamples("GET /proposals status=live", `${base}?vote=${voteId}&status=live&limit=${limit}`, {
        assertOkLabel: `GET /proposals status=live limit=${limit}`,
      });
    }
  });

});
