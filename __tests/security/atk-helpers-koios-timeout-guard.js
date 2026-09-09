/**
 * F-014 ratchet — installed @lerna-labs/ekklesia-helpers must bound Koios fetches.
 *
 * Helpers ≥2.0.1 wrap Koios/Handle.me HTTP in AbortController timeouts + retry.
 * This module’s documented config is Koios-only (API_URL / API_TOKEN); Blockfrost
 * is optional in helpers and unused here unless BLOCKFROST_* is set.
 */
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, "../..");

function parseSemver(version) {
  const m = String(version).match(/(\d+)\.(\d+)\.(\d+)/);
  if (!m) return null;
  return { major: Number(m[1]), minor: Number(m[2]), patch: Number(m[3]) };
}

function gte(a, b) {
  if (a.major !== b.major) return a.major > b.major;
  if (a.minor !== b.minor) return a.minor > b.minor;
  return a.patch >= b.patch;
}

const min = { major: 2, minor: 0, patch: 1 };

const pkg = JSON.parse(await fs.readFile(path.join(root, "package.json"), "utf8"));
const declared = pkg.dependencies?.["@lerna-labs/ekklesia-helpers"];
const declaredParsed = parseSemver(declared);
if (!declaredParsed || !gte(declaredParsed, min)) {
  console.error(
    `package.json must declare @lerna-labs/ekklesia-helpers >= 2.0.1 (got ${declared}).`,
  );
  process.exit(1);
}

let installedVersion;
try {
  const helpersPkg = JSON.parse(
    await fs.readFile(
      path.join(root, "node_modules/@lerna-labs/ekklesia-helpers/package.json"),
      "utf8",
    ),
  );
  installedVersion = helpersPkg.version;
} catch {
  console.error("Unable to read node_modules/@lerna-labs/ekklesia-helpers/package.json.");
  process.exit(1);
}

const installedParsed = parseSemver(installedVersion);
if (!installedParsed || !gte(installedParsed, min)) {
  console.error(
    `Installed @lerna-labs/ekklesia-helpers must be >= 2.0.1 (got ${installedVersion}).`,
  );
  process.exit(1);
}

const koiosPath = path.join(
  root,
  "node_modules/@lerna-labs/ekklesia-helpers/dist/cardano/koiosProvider.js",
);
const koiosSource = await fs.readFile(koiosPath, "utf8");

const checks = [
  {
    ok: koiosSource.includes("AbortController"),
    message: "koiosProvider.js must use AbortController for request timeouts (F-014).",
  },
  {
    ok: koiosSource.includes("REQUEST_TIMEOUT_MS"),
    message: "koiosProvider.js must define REQUEST_TIMEOUT_MS (F-014).",
  },
  {
    ok: koiosSource.includes("fetchWithRetry") && koiosSource.includes("MAX_ATTEMPTS"),
    message: "koiosProvider.js must bound retries via fetchWithRetry / MAX_ATTEMPTS (F-014).",
  },
  {
    ok: koiosSource.includes("await fetchWithRetry("),
    message: "KoiosProvider HTTP paths must call fetchWithRetry (F-014).",
  },
];

for (const check of checks) {
  if (!check.ok) {
    console.error(check.message);
    process.exit(1);
  }
}

console.log(
  `Helpers Koios timeout guard passed (F-014): declared ${declared}, installed ${installedVersion}.`,
);
