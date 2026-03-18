#!/usr/bin/env node
/**
 * Seed or teardown performance test data (one vote + 20k proposals).
 * Run from __testkit: node scripts/seed-perf.js [--teardown]
 * Requires: MONGO_URI or MONGODB_* in .env (same as backend for seed to be visible to API).
 *
 * Seed: creates vote (slug perf-test-20k) and 20k proposals, then prints env vars for remote perf test.
 * Teardown: deletes that vote and its proposals.
 */
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { connect, disconnect, ensureVote, ensureProposals, teardown, getPerfVoteId, PERF_VOTE_SLUG } from "../helpers/seedPerf.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "..", ".env") });

const isTeardown = process.argv.includes("--teardown");

async function main() {
  if (isTeardown) {
    await connect();
    const voteId = await getPerfVoteId();
    if (voteId) {
      await teardown(voteId);
      console.log("[seed-perf] Teardown complete.");
    } else {
      console.log("[seed-perf] No perf vote found (slug: " + PERF_VOTE_SLUG + "). Nothing to tear down.");
    }
    await disconnect();
    return;
  }

  await connect();
  const { vote } = await ensureVote();
  const voteId = vote._id.toString();
  const voteSlug = vote.slug;
  const { proposalId } = await ensureProposals(vote);
  await disconnect();

  console.log("\n[seed-perf] Perf data ready. Use these for remote performance test (e.g. in .env):");
  console.log("PERF_VOTE_ID=" + voteId);
  console.log("PERF_VOTE_SLUG=" + voteSlug);
  console.log("PERF_PROPOSAL_ID=" + proposalId);
  console.log("");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
