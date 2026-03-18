/**
 * Rate limit test: public read endpoint returns 429 after 200 requests per minute per IP.
 * Run separately from performance.test.js so it does not consume the rate limit during
 * performance measurements. Uses GET /votes (no seed required).
 */

const API_BASE_URL = process.env.API_BASE_URL || "http://localhost:3000/api/v0";

describe("Performance – rate limit (public read)", () => {
  it("201 GET requests to public read endpoint, 201st returns 429", async () => {
    const url = `${API_BASE_URL}/votes`;
    let lastRes;
    let lastMs;
    for (let i = 0; i < 201; i++) {
      const start = performance.now();
      lastRes = await fetch(url);
      lastMs = Math.round(performance.now() - start);
      if (i === 200) break;
    }
    expect(lastRes.status).toBe(429);
    const body = await lastRes.text();
    expect(body.toLowerCase()).toMatch(/too many|rate limit|429/);
    if (process.env.TESTKIT_LOG !== "0") {
      console.log(`[perf] rate limit (public read) — 201st request returned 429 in ${lastMs} ms`);
    }
  });
});
