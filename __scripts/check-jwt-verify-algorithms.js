import fs from "fs/promises";
import path from "path";

const ROOT_DIR = process.cwd();
const IGNORED_DIRS = new Set(["node_modules", ".git", "public", "logs"]);
const JS_EXTENSIONS = new Set([".js", ".cjs", ".mjs"]);

async function walk(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    if (entry.name.startsWith(".")) continue;
    if (IGNORED_DIRS.has(entry.name)) continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await walk(fullPath)));
      continue;
    }
    if (!JS_EXTENSIONS.has(path.extname(entry.name))) continue;
    files.push(fullPath);
  }

  return files;
}

function hasAlgorithmsOption(callText) {
  return /algorithms\s*:\s*\[/.test(callText);
}

function findBareVerifyCalls(source) {
  const issues = [];
  const regex = /jwt\.verify\s*\(/g;
  let match;

  while ((match = regex.exec(source)) !== null) {
    const start = match.index;
    const end = source.indexOf(");", start);
    if (end === -1) continue;
    const callText = source.slice(start, end + 2);
    if (!hasAlgorithmsOption(callText)) {
      const line = source.slice(0, start).split("\n").length;
      issues.push(line);
    }
  }

  return issues;
}

async function main() {
  const files = await walk(ROOT_DIR);
  const findings = [];

  for (const file of files) {
    const source = await fs.readFile(file, "utf8");
    const lines = findBareVerifyCalls(source);
    for (const line of lines) {
      findings.push({ file: path.relative(ROOT_DIR, file), line });
    }
  }

  if (findings.length > 0) {
    console.error("Found jwt.verify calls without explicit algorithms option:");
    for (const finding of findings) {
      console.error(`- ${finding.file}:${finding.line}`);
    }
    process.exit(1);
  }

  console.log("All jwt.verify calls include an explicit algorithms option.");
}

main().catch((error) => {
  console.error("JWT verify algorithms check failed:", error);
  process.exit(1);
});
