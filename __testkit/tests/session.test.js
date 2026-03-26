/**
 * Session API tests. See __testkit/docs/session-test-plan.md.
 * Prerequisites: backend running at API_BASE_URL, cardano-signer on PATH,
 * keys in keys/drep01_jag and keys/drep02_w9c. For expired-token tests, set JWT_SECRET in .env (match backend).
 */

import path from "path";
import { fileURLToPath } from "url";
import {
  login,
  logout,
  readDrepId,
  requestNonceAndSign,
  signWithKeys,
  createExpiredToken,
} from "../helpers/session.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TESTKIT_ROOT = path.resolve(__dirname, "..");
const KEYS_DREP01 = path.join(TESTKIT_ROOT, "keys", "drep01_jag");
const KEYS_DREP02 = path.join(TESTKIT_ROOT, "keys", "drep02_w9c");

const API_BASE_URL =
  process.env.API_BASE_URL || "http://localhost:3000/api/v0";

const HAS_JWT_SECRET = !!process.env.JWT_SECRET;

function putSession(apiBaseUrl, payload) {
  return fetch(`${apiBaseUrl}/session`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

function buildPutPayload(signerAddress, signType, signature) {
  return {
    signerAddress,
    signType,
    signature: {
      COSE_Sign1_hex: signature.COSE_Sign1_hex,
      COSE_Key_hex: signature.COSE_Key_hex,
    },
    scriptAddress: "",
  };
}

describe("POST /session", () => {
  it("returns 200 with dataHex and userId for valid body", async () => {
    const signerAddress = readDrepId(KEYS_DREP01);
    const res = await fetch(`${API_BASE_URL}/session`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ signerAddress, signType: "drep" }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.dataHex).toBeDefined();
    expect(typeof body.dataHex).toBe("string");
    expect(body.dataHex.length).toBeGreaterThan(0);
    expect(body.userId).toBe(signerAddress);
  });

  it("returns 400 when signerAddress is missing", async () => {
    const res = await fetch(`${API_BASE_URL}/session`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ signType: "drep" }),
    });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.message).toBeDefined();
    expect(body.message.toLowerCase()).toMatch(/signeraddress|missing/);
  });

  it("returns 400 when signType is missing", async () => {
    const signerAddress = readDrepId(KEYS_DREP01);
    const res = await fetch(`${API_BASE_URL}/session`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ signerAddress }),
    });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.message).toBeDefined();
    expect(body.message.toLowerCase()).toMatch(/signtype|missing/);
  });

  it("returns 400 for invalid address", async () => {
    const res = await fetch(`${API_BASE_URL}/session`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ signerAddress: "not-a-valid-drep", signType: "drep" }),
    });
    expect(res.status).toBe(400);
  });

  it("returns 400 for invalid signType", async () => {
    const signerAddress = readDrepId(KEYS_DREP01);
    const res = await fetch(`${API_BASE_URL}/session`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ signerAddress, signType: "admin" }),
    });
    expect(res.status).toBe(400);
  });
});

describe("PUT /session", () => {
  it("returns 200 with Set-Cookie and token for valid signature", async () => {
    const { signerAddress, signType, signature } = await requestNonceAndSign(API_BASE_URL, { keysDir: KEYS_DREP01 });
    const res = await putSession(API_BASE_URL, buildPutPayload(signerAddress, signType, signature));
    expect(res.status).toBe(200);
    expect(res.headers.get("set-cookie")).toBeTruthy();
    const body = await res.json();
    expect(body.token).toBeDefined();
    expect(body.expiresIn).toBeDefined();
    expect(body.userId).toBe(signerAddress);
  });

  it("returns 400 for wrong/tampered signature", async () => {
    const { signerAddress, signType, signature } = await requestNonceAndSign(API_BASE_URL, { keysDir: KEYS_DREP01 });
    const tampered = {
      ...signature,
      COSE_Sign1_hex: signature.COSE_Sign1_hex.slice(0, -4) + "ffff",
    };
    const res = await putSession(API_BASE_URL, buildPutPayload(signerAddress, signType, tampered));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.message).toMatch(/authentication failed|failed/i);
  });

  it("returns 400 for signature of different nonce", async () => {
    const signerAddress = readDrepId(KEYS_DREP01);
    const postRes = await fetch(`${API_BASE_URL}/session`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ signerAddress, signType: "drep" }),
    });
    expect(postRes.status).toBe(200);
    const postBody = await postRes.json();
    const wrongHex = Buffer.from("wrong-nonce", "utf8").toString("hex");
    const signature = signWithKeys(wrongHex, KEYS_DREP01);
    const res = await putSession(API_BASE_URL, buildPutPayload(signerAddress, "drep", signature));
    expect(res.status).toBe(400);
  });

  it("returns 400 when signature is missing", async () => {
    const signerAddress = readDrepId(KEYS_DREP01);
    const postRes = await fetch(`${API_BASE_URL}/session`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ signerAddress, signType: "drep" }),
    });
    expect(postRes.status).toBe(200);
    const res = await putSession(API_BASE_URL, {
      signerAddress,
      signType: "drep",
      scriptAddress: "",
      // no signature
    });
    expect(res.status).toBe(400);
  });

  it("returns 400 on nonce replay (second PUT with same signature)", async () => {
    const { signerAddress, signType, signature } = await requestNonceAndSign(API_BASE_URL, { keysDir: KEYS_DREP01 });
    const payload = buildPutPayload(signerAddress, signType, signature);
    const first = await putSession(API_BASE_URL, payload);
    expect(first.status).toBe(200);
    const second = await putSession(API_BASE_URL, payload);
    expect(second.status).toBe(400);
  });

  it("returns 400 when signer/signature binding is wrong (claim B, signature from A)", async () => {
    const { signerAddress: addressA, signType, signature } = await requestNonceAndSign(API_BASE_URL, { keysDir: KEYS_DREP01 });
    const addressB = readDrepId(KEYS_DREP02);
    const res = await putSession(API_BASE_URL, buildPutPayload(addressB, signType, signature));
    expect(res.status).toBe(400);
  });

  it("returns 400 for invalid signType on PUT", async () => {
    const { signerAddress, signature } = await requestNonceAndSign(API_BASE_URL, { keysDir: KEYS_DREP01 });
    const res = await putSession(API_BASE_URL, buildPutPayload(signerAddress, "admin", signature));
    expect(res.status).toBe(400);
  });

  it.skip("returns 400 for stale nonce (after TTL)", async () => {
    // Requires waiting >5 min or server with short NONCE_TTL_MS. Run with RUN_STALE_NONCE=1 in nightly if needed.
    const signerAddress = readDrepId(KEYS_DREP01);
    const postRes = await fetch(`${API_BASE_URL}/session`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ signerAddress, signType: "drep" }),
    });
    expect(postRes.status).toBe(200);
    const { dataHex } = await postRes.json();
    await new Promise((r) => setTimeout(r, 5 * 60 * 1000 + 1000)); // 5 min + 1 s
    const signature = signWithKeys(dataHex, KEYS_DREP01);
    const res = await putSession(API_BASE_URL, buildPutPayload(signerAddress, "drep", signature));
    expect(res.status).toBe(400);
  });
});

describe("GET /session", () => {
  it("returns 200 with userId, optional name and adminVoteIds when using valid cookie", async () => {
    const session = await login(API_BASE_URL, { keysDir: KEYS_DREP01 });
    const res = await fetch(`${API_BASE_URL}/session`, {
      method: "GET",
      headers: { Cookie: session.cookieHeader },
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.userId).toBe(session.userId);
    if (body.name !== undefined) expect(typeof body.name).toBe("string");
    if (body.adminVoteIds !== undefined) expect(Array.isArray(body.adminVoteIds)).toBe(true);
  });

  it("returns 401 when no cookie or Authorization", async () => {
    const res = await fetch(`${API_BASE_URL}/session`, { method: "GET" });
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.message).toMatch(/token|provided|required/i);
  });

  it("returns 401 for expired token", async () => {
    if (!HAS_JWT_SECRET) {
      console.warn("GET /session expired token test skipped: JWT_SECRET not set");
      return;
    }
    const userId = readDrepId(KEYS_DREP01);
    const token = createExpiredToken(userId, "drep");
    const res = await fetch(`${API_BASE_URL}/session`, {
      method: "GET",
      headers: { Cookie: `token=${token}` },
    });
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.message).toMatch(/expired/i);
  });

  it("returns 401 for invalid/tampered token", async () => {
    const res = await fetch(`${API_BASE_URL}/session`, {
      method: "GET",
      headers: { Cookie: "token=invalid.jwt.here" },
    });
    expect(res.status).toBe(401);
  });

  it("returns 200 when using Authorization Bearer with valid token", async () => {
    const session = await login(API_BASE_URL, { keysDir: KEYS_DREP01 });
    const res = await fetch(`${API_BASE_URL}/session`, {
      method: "GET",
      headers: { Authorization: `Bearer ${session.token}` },
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.userId).toBe(session.userId);
  });
});

describe("DELETE /session", () => {
  it("returns 200 with success when using valid cookie", async () => {
    const session = await login(API_BASE_URL, { keysDir: KEYS_DREP01 });
    const res = await logout(API_BASE_URL, session.cookieHeader);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("success");
    expect(body.message).toMatch(/logout|logged out/i);
  });

  it("returns 401 when no cookie", async () => {
    const res = await fetch(`${API_BASE_URL}/session`, { method: "DELETE" });
    expect(res.status).toBe(401);
  });

  it("returns 401 for expired token", async () => {
    if (!HAS_JWT_SECRET) {
      console.warn("DELETE /session expired token test skipped: JWT_SECRET not set");
      return;
    }
    const userId = readDrepId(KEYS_DREP01);
    const token = createExpiredToken(userId, "drep");
    const res = await fetch(`${API_BASE_URL}/session`, {
      method: "DELETE",
      headers: { Cookie: `token=${token}` },
    });
    expect(res.status).toBe(401);
  });

  it("returns 200 when using Authorization Bearer with valid token", async () => {
    const session = await login(API_BASE_URL, { keysDir: KEYS_DREP01 });
    const res = await fetch(`${API_BASE_URL}/session`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${session.token}` },
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("success");
  });
});

describe("Rate limiting", () => {
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

describe("Access with/without login", () => {
  it("GET /countries returns 200 without auth", async () => {
    const res = await fetch(`${API_BASE_URL}/countries`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toBeDefined();
  });

  it("GET /votes returns 200 without auth", async () => {
    const res = await fetch(`${API_BASE_URL}/votes`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toBeDefined();
  });

  it("GET /votes/:voteId returns 200 without auth when vote exists", async () => {
    const listRes = await fetch(`${API_BASE_URL}/votes?limit=1`);
    expect(listRes.status).toBe(200);
    const list = await listRes.json();
    expect(list.data).toBeDefined();
    if (!list.data?.length) {
      console.warn("GET /votes/:voteId skipped: no votes in DB");
      return;
    }
    const voteId = list.data[0]._id;
    const res = await fetch(`${API_BASE_URL}/votes/${voteId}`);
    expect(res.status).toBe(200);
  });

  it("GET /votes/:slug does not get blocked by voteId validation", async () => {
    const slugCandidate = `slug-route-regression-${Date.now()}`;
    const res = await fetch(`${API_BASE_URL}/votes/${slugCandidate}`);

    // If the slug does not exist we expect slug-path 404, but it must not be voteId-format 400.
    expect(res.status).not.toBe(400);
    if (res.status === 404) {
      const body = await res.json();
      expect(body.message).toMatch(/vote not found/i);
    } else {
      expect(res.status).toBe(200);
    }
  });

  it("GET /proposals returns 200 without auth", async () => {
    const res = await fetch(`${API_BASE_URL}/proposals`);
    expect(res.status).toBe(200);
    expect(res.ok).toBe(true);
  });

  it("GET /session without cookie returns 401", async () => {
    const res = await fetch(`${API_BASE_URL}/session`, { method: "GET" });
    expect(res.status).toBe(401);
  });

  it("GET /session with valid cookie returns 200", async () => {
    const session = await login(API_BASE_URL, { keysDir: KEYS_DREP01 });
    const res = await fetch(`${API_BASE_URL}/session`, {
      headers: { Cookie: session.cookieHeader },
    });
    expect(res.status).toBe(200);
  });

  it("POST /proposals without auth returns 401", async () => {
    const listRes = await fetch(`${API_BASE_URL}/votes?limit=1`);
    const list = await listRes.json();
    const voteId = list.data?.[0]?._id || "000000000000000000000000";
    const res = await fetch(`${API_BASE_URL}/proposals`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        voteId,
        title: "Test",
        summary: "Test summary",
        status: "draft",
        metaData: {},
      }),
    });
    expect(res.status).toBe(401);
    const body = await res.json().catch(() => ({}));
    expect(body.message).toMatch(/auth|token|required/i);
  });

  it("POST /proposals with auth returns not 401", async () => {
    const session = await login(API_BASE_URL, { keysDir: KEYS_DREP01 });
    const listRes = await fetch(`${API_BASE_URL}/votes?limit=1`);
    const list = await listRes.json();
    const voteId = list.data?.[0]?._id;
    if (!voteId) {
      console.warn("POST /proposals with auth skipped: no votes in DB");
      return;
    }
    const res = await fetch(`${API_BASE_URL}/proposals`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: session.cookieHeader,
      },
      body: JSON.stringify({
        voteId,
        title: "Test",
        summary: "Test summary",
        status: "draft",
        metaData: {},
      }),
    });
    expect(res.status).not.toBe(401);
  });

  it("GET /proposals?proposer=<userId> with auth returns 200", async () => {
    const session = await login(API_BASE_URL, { keysDir: KEYS_DREP01 });
    const res = await fetch(
      `${API_BASE_URL}/proposals?proposer=${encodeURIComponent(session.userId)}`,
      { headers: { Cookie: session.cookieHeader } }
    );
    expect(res.status).toBe(200);
  });
});

describe("Optional", () => {
  it("Set-Cookie after login contains HttpOnly", async () => {
    const { signerAddress, signType, signature } = await requestNonceAndSign(API_BASE_URL, { keysDir: KEYS_DREP01 });
    const res = await putSession(API_BASE_URL, buildPutPayload(signerAddress, signType, signature));
    expect(res.status).toBe(200);
    const setCookie = res.headers.get("set-cookie");
    expect(setCookie).toBeTruthy();
    expect(setCookie.toLowerCase()).toMatch(/httponly/);
  });

  it.skip("returns 400 for unregistered DRep", async () => {
    // Requires key set for an unregistered DRep or Koios mock. Add keys and remove skip to run.
    const { signerAddress, signType, signature } = await requestNonceAndSign(API_BASE_URL, { keysDir: KEYS_DREP01 });
    const res = await putSession(API_BASE_URL, buildPutPayload(signerAddress, signType, signature));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.message).toMatch(/not registered|validation failed/i);
  });
});
