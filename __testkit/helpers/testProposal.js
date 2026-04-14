/**
 * Resolve vote / proposal ids for HTTP tests (env or API discovery via vote slug).
 */
import { TESTKIT_VOTE_SLUG } from "./testkitConstants.js";

const DEFAULT_SLUG = TESTKIT_VOTE_SLUG;

/**
 * @param {string} apiBaseUrl - e.g. http://localhost:3000/api/v0
 * @param {{ voteSlug?: string, voteId?: string, proposalId?: string }} [opts]
 * @returns {Promise<{ voteId: string, voteSlug: string, proposalId: string }>}
 */
export async function resolveVoteAndLiveProposal(apiBaseUrl, opts = {}) {
  const slug = opts.voteSlug?.trim() || process.env.PERF_VOTE_SLUG?.trim() || DEFAULT_SLUG;
  const envVote = opts.voteId?.trim() || process.env.PERF_VOTE_ID?.trim();
  const envProposal = opts.proposalId?.trim() || process.env.PERF_PROPOSAL_ID?.trim();
  if (envVote && envProposal) {
    return {
      voteId: envVote,
      voteSlug: slug,
      proposalId: envProposal,
    };
  }
  const votesRes = await fetch(`${apiBaseUrl}/votes?slug=${encodeURIComponent(slug)}`);
  if (!votesRes.ok) {
    throw new Error(
      `GET /votes?slug=${slug} returned ${votesRes.status}. Seed data or set PERF_VOTE_ID and PERF_PROPOSAL_ID.`
    );
  }
  const votesData = await votesRes.json();
  const vote = Array.isArray(votesData?.data) ? votesData.data[0] : votesData;
  if (!vote?._id) {
    throw new Error(`No vote for slug ${slug}. Run seed:perf or set PERF_* env vars.`);
  }
  const voteId = vote._id.toString();
  const voteSlug = vote.slug || slug;
  const proposalsRes = await fetch(`${apiBaseUrl}/proposals?vote=${voteId}&limit=1`);
  if (!proposalsRes.ok) {
    throw new Error(`GET /proposals?vote= returned ${proposalsRes.status}.`);
  }
  const proposalsData = await proposalsRes.json();
  const firstProposal = Array.isArray(proposalsData?.data) ? proposalsData.data[0] : null;
  if (!firstProposal?._id) {
    throw new Error(`No proposals for vote ${voteId}. Seed data first.`);
  }
  return {
    voteId,
    voteSlug,
    proposalId: firstProposal._id.toString(),
  };
}
