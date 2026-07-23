/**
 * Ratchet: chain lookup / deposit verification must come from
 * @lerna-labs/ekklesia-helpers/cardano — not local helper/koios.js or
 * helper/verifyDeposit.js (those files are removed).
 */
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "../..");

const FORBIDDEN = [
  /helper\/koios(?:\.js)?/,
  /helper\/verifyDeposit(?:\.js)?/,
  /from\s+["']\.\/koios\.js["']/,
  /from\s+["']\.\.\/.*\/koios\.js["']/,
];

const SKIP_DIRS = new Set([
  "node_modules",
  ".git",
  "__frontend",
  "coverage",
  "dist",
]);

async function* walk(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name.startsWith(".")) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue;
      yield* walk(full);
    } else if (entry.isFile() && entry.name.endsWith(".js")) {
      yield full;
    }
  }
}

const offenders = [];

for await (const file of walk(repoRoot)) {
  // Allow this ratchet file to mention the forbidden paths.
  if (file === __filename) continue;
  const source = await fs.readFile(file, "utf8");
  for (const pattern of FORBIDDEN) {
    if (pattern.test(source)) {
      offenders.push(path.relative(repoRoot, file));
      break;
    }
  }
}

const missingLocals = [];
for (const rel of ["helper/koios.js", "helper/verifyDeposit.js"]) {
  try {
    await fs.access(path.join(repoRoot, rel));
    missingLocals.push(rel);
  } catch {
    // expected: file absent
  }
}

if (missingLocals.length) {
  console.error(
    "Local helper files must remain deleted:",
    missingLocals.join(", "),
  );
  process.exit(1);
}

if (offenders.length) {
  console.error(
    "Forbidden local koios/verifyDeposit imports still present in:\n" +
      offenders.map((f) => `  - ${f}`).join("\n"),
  );
  process.exit(1);
}

console.log("No local koios/verifyDeposit helpers guard passed.");
