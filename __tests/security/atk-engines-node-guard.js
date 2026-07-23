/**
 * Ratchet — root and __frontend package.json must declare engines.node
 * with a floor of at least Node 22 (matching CI).
 */
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../..");

const MIN_MAJOR = 22;
const manifests = [
  path.join(repoRoot, "package.json"),
  path.join(repoRoot, "__frontend", "package.json"),
];

/**
 * @param {string} range
 * @returns {number | null} minimum major from a leading >=N range
 */
function minMajorFromRange(range) {
  const match = String(range).trim().match(/^>=\s*(\d+)/);
  if (!match) return null;
  return Number(match[1]);
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

  const minMajor = minMajorFromRange(nodeRange);
  if (minMajor === null) {
    failures.push(
      `${rel}: engines.node must be a ">=N" range (got ${JSON.stringify(nodeRange)})`,
    );
  } else if (minMajor < MIN_MAJOR) {
    failures.push(
      `${rel}: engines.node floor is ${minMajor}; must be >= ${MIN_MAJOR} (got ${JSON.stringify(nodeRange)})`,
    );
  }
}

if (failures.length > 0) {
  console.error("engines.node ratchet failed:");
  for (const failure of failures) console.error(`  - ${failure}`);
  process.exit(1);
}

console.log(
  `engines.node ratchet OK: both manifests declare >=${MIN_MAJOR} (or higher).`,
);
