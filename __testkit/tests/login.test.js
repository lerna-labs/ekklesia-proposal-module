/**
 * Login / logout test for the Proposal Module API.
 * Flow follows docs/login-flow.md: POST /session → sign dataHex → PUT /session → GET /session → DELETE /session.
 * Uses reusable helpers from __testkit/helpers/session.js.
 *
 * Prerequisites:
 * - Backend running (e.g. API_BASE_URL=http://localhost:3000/api/v0)
 * - cardano-signer CLI on PATH (see __testkit/docs/cardano-signer.md)
 * - DRep keys in __testkit/keys/drep01_jag (drep.skey, drep_id.txt)
 * - DRep must be registered (backend validates via Koios) for PUT /session to succeed
 */

import { login, logout } from "../helpers/session.js";

const API_BASE_URL =
  process.env.API_BASE_URL || "http://localhost:3000/api/v0";

const LOG = process.env.TESTKIT_LOG !== "0" && process.env.TESTKIT_LOG !== "false";

function log(step, message, detail) {
  if (!LOG) return;
  const prefix = `[${step}]`;
  console.log(prefix, message);
  if (detail !== undefined) console.log(prefix, " ", detail);
}

describe("Login (sign-in / sign-out)", () => {
  it("logs in as DRep with cardano-signer and logs out", async () => {
    log(1, "Login via helper (POST → sign → PUT /session)");
    const session = await login(API_BASE_URL);
    expect(session.userId).toMatch(/^drep1/);
    expect(session.cookieHeader).toBeTruthy();
    expect(session.token).toBeDefined();
    expect(session.expiresIn).toBeDefined();
    log(1, "Login OK", { userId: session.userId, expiresIn: session.expiresIn });

    log(2, "Verify session (GET /session)");
    const getRes = await fetch(`${API_BASE_URL}/session`, {
      method: "GET",
      headers: { Cookie: session.cookieHeader },
    });
    expect(getRes.status).toBe(200);
    const getBody = await getRes.json();
    expect(getBody.userId).toBe(session.userId);
    log(2, "Session valid", { userId: getBody.userId, name: getBody.name });

    log(3, "Logout (DELETE /session)");
    const deleteRes = await logout(API_BASE_URL, session.cookieHeader);
    expect(deleteRes.status).toBe(200);
    const deleteBody = await deleteRes.json();
    expect(deleteBody.status).toBe("success");
    expect(deleteBody.message).toMatch(/logout|logged out/i);
    log(3, "Logged out", deleteBody.message);

    log(4, "Verify unauthenticated (GET /session without cookie)");
    const getAfterRes = await fetch(`${API_BASE_URL}/session`, { method: "GET" });
    expect(getAfterRes.status).toBe(401);
    log(4, "Got 401 as expected (unauthenticated)");
  });
});
