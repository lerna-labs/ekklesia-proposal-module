/**
 * Resolve __testkit/keys/<folder> for stake-based test identities.
 * Convention: folders named stake_<suffix> with id.txt + skey.json (see session.js legacy fallbacks).
 */
import { existsSync, readdirSync, readFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TESTKIT_ROOT = path.resolve(__dirname, "..");

/** Default folder for login() when keysDir is omitted (comment-rate-limit, login.test, etc.). */
export const DEFAULT_STAKE_KEYS_FOLDER = "stake_43wf";

/** Second identity: "other" DRep, timing isolation vs default stake. */
export const DEFAULT_OTHER_STAKE_KEYS_FOLDER = "drep02_w9c";

function validateFolderName(folder) {
  if (!folder || /[/\\]/.test(folder) || folder === "." || folder === "..") {
    throw new Error("Stake keys env must be a single directory name under keys/");
  }
  if (!/^[a-zA-Z0-9_-]+$/.test(folder)) {
    throw new Error("Stake keys folder name must contain only letters, digits, underscore, hyphen");
  }
}

function keysDirForFolder(folder) {
  validateFolderName(folder);
  return path.join(TESTKIT_ROOT, "keys", folder);
}

/**
 * Read bech32 id from a key directory (id.txt preferred, else drep_id.txt).
 * @param {string} dir
 * @returns {string|null}
 */
function readIdFromKeysDir(dir) {
  const idTxt = path.join(dir, "id.txt");
  const legacy = path.join(dir, "drep_id.txt");
  if (existsSync(idTxt)) return readFileSync(idTxt, "utf8").trim();
  if (existsSync(legacy)) return readFileSync(legacy, "utf8").trim();
  return null;
}

/**
 * Find keys/<folder> whose id.txt matches the given stake (or DRep) address.
 * @param {string} address - Bech32 from id.txt
 * @returns {string|null} absolute path
 */
export function findKeysDirForAddress(address) {
  const want = address.trim();
  if (!want) return null;
  const keysRoot = path.join(TESTKIT_ROOT, "keys");
  if (!existsSync(keysRoot)) return null;
  const entries = readdirSync(keysRoot, { withFileTypes: true });
  for (const ent of entries) {
    if (!ent.isDirectory() || ent.name.startsWith(".")) continue;
    const sub = path.join(keysRoot, ent.name);
    const id = readIdFromKeysDir(sub);
    if (id && id === want) return sub;
  }
  return null;
}

export function getDefaultStakeKeysFolderName() {
  return process.env.TESTKIT_DEFAULT_STAKE_KEYS?.trim() || DEFAULT_STAKE_KEYS_FOLDER;
}

export function getDefaultStakeKeysDir() {
  return keysDirForFolder(getDefaultStakeKeysFolderName());
}

/**
 * Stake address (bech32) for treasury-donation live-submit tests; must match keys/<folder>/id.txt.
 * When unset, falls back to legacy TESTKIT_TREASURY_DONATION_DREP (folder name only), then default stake keys.
 */
export function getTreasuryDonationUserAddress() {
  const u = process.env.TESTKIT_TREASURY_DONATION_USER?.trim();
  if (u) return u;
  // Resolved keys dir (legacy folder or default) → id on disk
  return readIdFromKeysDir(getTreasuryDonationKeysDir()) ?? "";
}

/**
 * Resolve directory for login + proposals that must match TESTKIT_TREASURY_HASH on-chain.
 */
export function getTreasuryDonationKeysDir() {
  const user = process.env.TESTKIT_TREASURY_DONATION_USER?.trim();
  if (user) {
    const found = findKeysDirForAddress(user);
    if (!found) {
      throw new Error(
        `TESTKIT_TREASURY_DONATION_USER does not match any keys/*/id.txt under ${path.join(TESTKIT_ROOT, "keys")}. ` +
          `Set it to the same bech32 stake id as in that folder (e.g. id.txt).`
      );
    }
    return found;
  }
  const legacyFolder = process.env.TESTKIT_TREASURY_DONATION_DREP?.trim();
  if (legacyFolder) {
    return keysDirForFolder(legacyFolder);
  }
  return getDefaultStakeKeysDir();
}

export function getTreasuryDonationKeysFolderName() {
  return path.basename(getTreasuryDonationKeysDir());
}

export function getOtherStakeKeysFolderName() {
  return process.env.TESTKIT_OTHER_STAKE_KEYS?.trim() || DEFAULT_OTHER_STAKE_KEYS_FOLDER;
}

export function getOtherStakeKeysDir() {
  return keysDirForFolder(getOtherStakeKeysFolderName());
}
