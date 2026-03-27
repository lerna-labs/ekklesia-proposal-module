/**
 * Session rate-limit tests are isolated from session.test.js
 * to avoid affecting auth/session flow tests with nonce limiter side effects.
 */
import path from "path";
import { fileURLToPath } from "url";
import { readDrepId } from "../helpers/session.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TESTKIT_ROOT = path.resolve(__dirname, "..");
const KEYS_DREP01 = path.join(TESTKIT_ROOT, "keys", "drep01_jag");
const API_BASE_URL =
  process.env.API_BASE_URL || "http://localhost:3000/api/v0";

describe("Session rate limiting", () => {
  it("returns 429 when exceeding POST /session limit (5/min)", async () => {
    const signerAddress = readDrepId(KEYS_DREP01);
    for (let i = 0; i < 6; i++) {
      await fetch(`${API_BASE_URL}/session`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ signerAddress, signType: "drep" }),
      });
    }
    const res = await fetch(`${API_BASE_URL}/session`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ signerAddress, signType: "drep" }),
    });
    expect(res.status).toBe(429);
    const body = await res.json().catch(() => ({}));
    expect(body.message || "").toMatch(/too many|nonce|request/i);
  }, 70000);

  it.skip("returns 429 when exceeding PUT /session limit (10/min)", async () => {
    // PUT limit requires 11 PUTs, each needs a nonce from POST; POST is limited to 5/min so this cannot be triggered in same window. Run with backend that allows more POSTs in test if needed.
  });
});
