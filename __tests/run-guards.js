/**
 * Run offline-safe security ratchets (no live server / Mongo).
 * Excludes live Wraith PoCs (*-race.js, mail-relay-abuse, etc.).
 */
import { readdir } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { spawn } from "child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const securityDir = path.join(__dirname, "security");

function runNode(file) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [file], {
      stdio: "inherit",
      cwd: path.resolve(__dirname, ".."),
    });
    child.on("error", reject);
    child.on("exit", (code, signal) => {
      if (signal) reject(new Error(`${file} exited on signal ${signal}`));
      else if (code !== 0) reject(new Error(`${file} exited with code ${code}`));
      else resolve();
    });
  });
}

const entries = await readdir(securityDir);
const scripts = entries
  .filter((name) => name.endsWith("-guard.js") || name === "atk-route-loader-isolation.js")
  .sort()
  .map((name) => path.join(securityDir, name));

if (scripts.length === 0) {
  console.error("No guard scripts found under __tests/security");
  process.exit(1);
}

console.log(`Running ${scripts.length} security ratchet(s)…`);
for (const script of scripts) {
  const rel = path.relative(path.resolve(__dirname, ".."), script);
  console.log(`\n→ ${rel}`);
  await runNode(script);
}
console.log("\nAll security ratchets passed.");
