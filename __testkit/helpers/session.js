/**
 * Session helpers for the Proposal Module API (login / logout).
 * Reusable across tests. Flow follows docs/login-flow.md.
 */

import { existsSync, readFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { spawnSync } from "child_process";
import jwt from "jsonwebtoken";
import { getDefaultStakeKeysDir } from "./stakeKeys.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_KEYS_DIR = getDefaultStakeKeysDir();

/** Passed to cardano-signer `--testnet-magic` for `stake_test1…` ids (Preview = 2, Preprod = 1). */
const DEFAULT_TESTNET_MAGIC_FOR_STAKE_TEST1 = "2";

/**
 * @param {string} keysDir
 * @returns {string} path to id file (prefer id.txt, else drep_id.txt)
 */
function resolveStakeIdPath(keysDir) {
  const preferred = path.join(keysDir, "id.txt");
  const legacy = path.join(keysDir, "drep_id.txt");
  if (existsSync(preferred)) return preferred;
  if (existsSync(legacy)) return legacy;
  throw new Error(`Missing id.txt or drep_id.txt in ${keysDir}`);
}

/**
 * @param {string} keysDir
 * @returns {string} path to signing key (prefer skey.json, else drep.skey)
 */
function resolveSkeyPath(keysDir) {
  const preferred = path.join(keysDir, "skey.json");
  const legacy = path.join(keysDir, "drep.skey");
  if (existsSync(preferred)) return preferred;
  if (existsSync(legacy)) return legacy;
  throw new Error(`Missing skey.json or drep.skey in ${keysDir}`);
}

/**
 * Match backend validateAddress + session PUT expectations (signType).
 * @param {string} address - Bech32 from id.txt
 * @returns {"drep"|"stake"}
 */
function inferSignTypeFromAddress(address) {
  if (!address || typeof address !== "string") return "drep";
  const a = address.trim();
  if (a.startsWith("drep1")) return "drep";
  if (a.startsWith("stake_test1") || a.startsWith("stake1")) return "stake";
  return "drep";
}

/**
 * Whether this bech32 needs cardano-signer --testnet-magic: true only when the address starts with "stake_test1" (after trim). Mainnet stake uses "stake1" and is not testnet here.
 */
function isTestnetStakeAddress(bech32) {
  if (typeof bech32 !== "string") return false;
  return bech32.trim().startsWith("stake_test1");
}

/**
 * Sign dataHex with cardano-signer in CIP-30 (COSE) mode.
 * dataHex from the API is already hex; pass as-is to --data-hex.
 */
function signWithCardanoSignerCip30(dataHex, secretKeyPath, signerAddressBech32) {
  const args = [
    "sign",
    "--json",
    "--cip30",
    "--data-hex",
    dataHex,
    "--address",
    signerAddressBech32,
    "--secret-key",
    secretKeyPath,
  ];
  if (isTestnetStakeAddress(signerAddressBech32)) {
    args.push("--testnet-magic", DEFAULT_TESTNET_MAGIC_FOR_STAKE_TEST1);
  }
  const result = spawnSync("cardano-signer", args, {
    encoding: "utf-8",
    maxBuffer: 1024 * 1024,
  });

  if (result.error) {
    throw new Error(
      `cardano-signer not found or failed to run: ${result.error.message}. Ensure cardano-signer is on PATH.`
    );
  }
  if (result.status !== 0) {
    const stderr = result.stderr?.trim() || result.stdout?.trim() || "unknown";
    throw new Error(`cardano-signer exited ${result.status}: ${stderr}`);
  }

  let out;
  try {
    out = JSON.parse(result.stdout.trim());
  } catch {
    throw new Error(
      `cardano-signer output is not valid JSON: ${result.stdout?.slice(0, 200)}`
    );
  }

  const COSE_Sign1_hex = out.COSE_Sign1_hex ?? out.output?.COSE_Sign1_hex;
  const COSE_Key_hex = out.COSE_Key_hex ?? out.output?.COSE_Key_hex;
  if (!COSE_Sign1_hex || !COSE_Key_hex) {
    throw new Error(
      `cardano-signer output missing COSE_Sign1_hex or COSE_Key_hex: ${JSON.stringify(out)}`
    );
  }
  return { COSE_Sign1_hex, COSE_Key_hex };
}

/**
 * Read DRep / stake ID (Bech32) from a key set directory.
 * @param {string} keysDir - Path to directory containing id.txt (or legacy drep_id.txt)
 * @returns {string}
 */
export function readDrepId(keysDir = DEFAULT_KEYS_DIR) {
  return readFileSync(resolveStakeIdPath(keysDir), "utf-8").trim();
}

/**
 * Sign arbitrary dataHex with keys in keysDir. For tests that need a signature of wrong/different data.
 * @param {string} dataHex - Hex string to sign (e.g. from POST /session or a wrong nonce)
 * @param {string} keysDir - Path to directory containing id.txt + skey.json (or legacy drep_id.txt + drep.skey)
 * @returns {{ COSE_Sign1_hex: string, COSE_Key_hex: string }}
 */
export function signWithKeys(dataHex, keysDir = DEFAULT_KEYS_DIR) {
  const signerAddress = readDrepId(keysDir);
  const skeyPath = resolveSkeyPath(keysDir);
  return signWithCardanoSignerCip30(dataHex, skeyPath, signerAddress);
}

/**
 * Request nonce (POST /session) and sign it. Returns payload for PUT /session so tests can call PUT once or twice (replay), or tamper.
 * @param {string} apiBaseUrl
 * @param {{ keysDir?: string, signType?: string }} options
 * @returns {Promise<{ signerAddress: string, signType: string, signature: { COSE_Sign1_hex: string, COSE_Key_hex: string } }>}
 */
export async function requestNonceAndSign(apiBaseUrl, options = {}) {
  const keysDir = options.keysDir ?? DEFAULT_KEYS_DIR;
  const signerAddress = readDrepId(keysDir);
  const signType = options.signType ?? inferSignTypeFromAddress(signerAddress);
  const postRes = await fetch(`${apiBaseUrl}/session`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ signerAddress, signType }),
  });
  if (!postRes.ok) {
    const body = await postRes.json().catch(() => ({}));
    throw new Error(`POST /session failed: ${postRes.status} ${JSON.stringify(body)}`);
  }
  const postBody = await postRes.json();
  if (!postBody.dataHex) throw new Error("POST /session response missing dataHex");
  const signature = signWithKeys(postBody.dataHex, keysDir);
  return { signerAddress, signType, signature };
}

/**
 * Create an expired JWT for the given userId/signType. Uses process.env.JWT_SECRET (must match backend).
 * @param {string} userId - e.g. DRep Bech32 address
 * @param {string} signType - e.g. "drep"
 * @returns {string} JWT string
 */
export function createExpiredToken(userId, signType = "drep") {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET must be set for createExpiredToken (e.g. in __testkit/.env)");
  return jwt.sign(
    { userId, signType },
    secret,
    { expiresIn: "-1s" }
  );
}

/**
 * Log in as a DRep using cardano-signer (CIP-30). Uses keys in keysDir (default from TESTKIT_DEFAULT_STAKE_KEYS / stake_43wf).
 *
 * @param {string} apiBaseUrl - e.g. http://localhost:3000/api/v0
 * @param {{ keysDir?: string, signType?: string }} options - keysDir overrides path to key set (id.txt, skey.json); signType defaults to "drep"
 * @returns {Promise<{ cookieHeader: string, userId: string, token: string, expiresIn: string }>}
 */
export async function login(apiBaseUrl, options = {}) {
  const { signerAddress, signType, signature } = await requestNonceAndSign(apiBaseUrl, options);
  const putRes = await fetch(`${apiBaseUrl}/session`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      signerAddress,
      signature: {
        COSE_Sign1_hex: signature.COSE_Sign1_hex,
        COSE_Key_hex: signature.COSE_Key_hex,
      },
      signType,
      scriptAddress: "",
    }),
  });
  const putBody = await putRes.json();
  if (!putRes.ok) {
    throw new Error(`PUT /session failed: ${putRes.status} ${JSON.stringify(putBody)}`);
  }

  const cookieHeader = putRes.headers.get("set-cookie");
  if (!cookieHeader) throw new Error("PUT /session response missing Set-Cookie");

  return {
    cookieHeader,
    userId: signerAddress,
    token: putBody.token,
    expiresIn: putBody.expiresIn,
  };
}

/**
 * Log out by calling DELETE /session with the session cookie.
 *
 * @param {string} apiBaseUrl - e.g. http://localhost:3000/api/v0
 * @param {string} cookieHeader - value of the Cookie header (from login().cookieHeader)
 * @returns {Promise<Response>}
 */
export async function logout(apiBaseUrl, cookieHeader) {
  return fetch(`${apiBaseUrl}/session`, {
    method: "DELETE",
    headers: { Cookie: cookieHeader },
  });
}
