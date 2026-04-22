/**
 * Orchestrates local setup for:
 * 1) countries
 * 2) regions
 * 3) budget2026 vote + proposals
 * 4) cc-vote-2026 + candidates
 *
 * Usage (repo root):
 *   node __setup/setupVotesAndGeoSeed.js
 */

import path from "path";
import { fileURLToPath } from "url";
import { spawnSync } from "child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Run a setup script with inherited stdio so output streams directly.
 */
function runStep(scriptName, label) {
  const scriptPath = path.join(__dirname, scriptName);
  console.log(`\n▶ ${label}`);
  console.log(`   Running: node __setup/${scriptName}`);

  const result = spawnSync(process.execPath, [scriptPath], {
    stdio: "inherit",
    env: process.env,
  });

  if (result.error) {
    throw new Error(`Failed to run ${scriptName}: ${result.error.message}`);
  }

  if (typeof result.status === "number" && result.status !== 0) {
    throw new Error(`${scriptName} exited with status ${result.status}`);
  }
}

function main() {
  try {
    runStep("seedCountries.js", "Seeding countries");
    runStep("seedRegions.js", "Seeding regions");

    // This script creates budget2026 vote and seeds proposals.
    runStep("createDummyData.js", "Creating Budget 2026 vote + proposals");

    runStep("setup-cc-vote2026.js", "Creating/updating CC vote 2026");
    runStep("addCcVoteCandidates.js", "Seeding CC vote candidates");

    console.log("\n✅ All setup steps completed successfully.");
  } catch (error) {
    console.error(`\n❌ Setup failed: ${error.message}`);
    process.exit(1);
  }
}

main();
