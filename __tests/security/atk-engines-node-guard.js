/**
 * Ratchet — root and __frontend package.json must declare engines.node
 * with a floor of at least Node 22.12.0 (Vite 8 / plugin-svelte 7).
 */
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../..");

/** @type {[number, number, number]} */
const MIN_VERSION = [22, 12, 0];
const manifests = [
  path.join(repoRoot, "package.json"),
  path.join(repoRoot, "__frontend", "package.json"),
];

/**
 * @param {string} range
 * @returns {[number, number, number] | null}
 */
function minVersionFromRange(range) {
  const match = String(range)
    .trim()
    .match(/^>=\s*(\d+)(?:\.(\d+))?(?:\.(\d+))?/);
  if (!match) return null;
  return [
    Number(match[1]),
    Number(match[2] ?? 0),
    Number(match[3] ?? 0),
  ];
}

/**
 * @param {[number, number, number]} a
 * @param {[number, number, number]} b
 */
function gte(a, b) {
  for (let i = 0; i < 3; i++) {
    if (a[i] > b[i]) return true;
    if (a[i] < b[i]) return false;
  }
  return true;
}

const failures = [];

for (const manifestPath of manifests) {
  const rel = path.relative(repoRoot, manifestPath);
  const pkg = JSON.parse(await fs.readFile(manifestPath, "utf8"));
  const nodeRange = pkg.engines?.node;

  if (typeof nodeRange !== "string" || !nodeRange.trim()) {
    failures.push(`${rel}: missing engines.node`);
    continue;
  }

  const minVersion = minVersionFromRange(nodeRange);
  if (minVersion === null) {
    failures.push(
      `${rel}: engines.node must be a ">=N" range (got ${JSON.stringify(nodeRange)})`,
    );
  } else if (!gte(minVersion, MIN_VERSION)) {
    failures.push(
      `${rel}: engines.node floor is ${minVersion.join(".")}; must be >= ${MIN_VERSION.join(".")} (got ${JSON.stringify(nodeRange)})`,
    );
  }
}

if (failures.length > 0) {
  console.error("engines.node ratchet failed:");
  for (const failure of failures) console.error(`  - ${failure}`);
  process.exit(1);
}

console.log(
  `engines.node ratchet OK: both manifests declare >=${MIN_VERSION.join(".")} (or higher).`,
);
