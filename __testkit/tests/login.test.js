/**
 * Login / logout tests for the Proposal Module API.
 * Flow follows docs/login-flow.md: POST /session → sign dataHex → PUT /session → GET /session → DELETE /session.
 *
 * Prerequisites:
 * - Backend running (e.g. API_BASE_URL=http://localhost:3000/api/v0)
 * - cardano-signer CLI on PATH (see __testkit/docs/cardano-signer.md)
 * - keys/drep02_w9c — DRep id (drep1…) in id.txt
 * - keys/stake_43wf — testnet stake id (stake_test1…) in id.txt
 * - Signers registered (backend validates via Koios) for PUT /session to succeed
 */

import path from "path";
import { fileURLToPath } from "url";
import { login, logout } from "../helpers/session.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TESTKIT_ROOT = path.resolve(__dirname, "..");
/** Fixed fixtures: drep1… + stake_test1… (see each keys subfolder id.txt). */
const KEYS_DREP = path.join(TESTKIT_ROOT, "keys", "drep02_w9c");
const KEYS_STAKE = path.join(TESTKIT_ROOT, "keys", "stake_43wf");

const API_BASE_URL =
  process.env.API_BASE_URL || "http://localhost:3000/api/v0";

const LOG = process.env.TESTKIT_LOG !== "0" && process.env.TESTKIT_LOG !== "false";

function log(step, message, detail) {
  if (!LOG) return;
  const prefix = `[${step}]`;
  console.log(prefix, message);
  if (detail !== undefined) console.log(prefix, " ", detail);
}

/**
 * @param {string} keysDir
 * @returns {Promise<string>} userId after successful login
 */
async function loginGetLogoutVerify401(keysDir) {
  log(1, "Login (POST → sign → PUT /session)", keysDir);
  const session = await login(API_BASE_URL, { keysDir });
  expect(session.cookieHeader).toBeTruthy();
  expect(session.token).toBeDefined();
  expect(session.expiresIn).toBeDefined();
  log(1, "Login OK", { userId: session.userId });

  log(2, "GET /session");
  const getRes = await fetch(`${API_BASE_URL}/session`, {
    method: "GET",
    headers: { Cookie: session.cookieHeader },
  });
  expect(getRes.status).toBe(200);
  const getBody = await getRes.json();
  expect(getBody.userId).toBe(session.userId);
  log(2, "Session valid", { userId: getBody.userId });

  log(3, "DELETE /session");
  const deleteRes = await logout(API_BASE_URL, session.cookieHeader);
  expect(deleteRes.status).toBe(200);
  const deleteBody = await deleteRes.json();
  expect(deleteBody.status).toBe("success");
  expect(deleteBody.message).toMatch(/logout|logged out/i);

  log(4, "GET /session without cookie → 401");
  const getAfterRes = await fetch(`${API_BASE_URL}/session`, { method: "GET" });
  expect(getAfterRes.status).toBe(401);

  return session.userId;
}

describe("Login (sign-in / sign-out)", () => {
  it("logs in and out as DRep (drep1…)", async () => {
    const userId = await loginGetLogoutVerify401(KEYS_DREP);
    expect(userId).toMatch(/^drep1/);
  });

  it("logs in and out as stake (stake_test1… / stake1…)", async () => {
    const userId = await loginGetLogoutVerify401(KEYS_STAKE);
    expect(userId).toMatch(/^(stake_test1|stake1)/);
  });
});
