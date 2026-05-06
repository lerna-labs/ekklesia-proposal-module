/**
 * Shared payload shapes for mailer dev tests (mirrors notification fixture trees).
 *
 * Event scope matches docs/plan: submission_confirmed, proposal_withdrawn, new_comment
 * (digest only), voting_opened, results_published.
 */

export const STAMP = "2026-05-04 12:00 UTC";

export const BASE = {
  preferencesUrl: "https://example.test/dashboard",
  unsubscribeUrl: "https://example.test/unsubscribe",
};

/** One vote, one proposal, one or more raw events (pre-localization). */
export function fixtureSingleVoteSingleProposal(
  voteName,
  voteSlug,
  proposalTitle,
  proposalId,
  events,
) {
  return {
    period: "24h",
    ...BASE,
    votes: [
      {
        name: voteName,
        url: `https://example.test/votes/${voteSlug}`,
        proposals: [
          {
            title: proposalTitle,
            url: `https://example.test/votes/${voteSlug}/${proposalId}`,
            events,
          },
        ],
      },
    ],
  };
}

/**
 * Instant-path events only (see plan: new_comment uses digest/cron only).
 */
export function instantEventFixture(type, extra = {}) {
  const base = { timestamp: STAMP, ...extra };
  switch (type) {
    case "submission_confirmed":
      return fixtureSingleVoteSingleProposal(
        "Alpha Vote",
        "alpha",
        "Proposal Alpha",
        "p-alpha",
        [{ type: "submission_confirmed", ...base }],
      );
    case "proposal_withdrawn":
      return fixtureSingleVoteSingleProposal(
        "Alpha Vote",
        "alpha",
        "Proposal Alpha",
        "p-alpha",
        [
          {
            type: "proposal_withdrawn",
            reason: "Policy breach",
            comment: "Admin withdrawal note for tests.",
            ...base,
          },
        ],
      );
    case "voting_opened":
      return fixtureSingleVoteSingleProposal(
        "Milestone Vote",
        "milestone",
        "Milestone Vote",
        "vote-1",
        [{ type: "voting_opened", ...base }],
      );
    case "results_published":
      return fixtureSingleVoteSingleProposal(
        "Milestone Vote",
        "milestone",
        "Milestone Vote",
        "vote-1",
        [
          {
            type: "results_published",
            resultsUrl: "https://example.test/results/milestone",
            ...base,
          },
        ],
      );
    default:
      throw new Error(`Unknown instant event type: ${type}`);
  }
}

/**
 * Aggregated new_comment digest (cron dispatch shape): one vote, multiple proposals/events.
 */
export function commentDigestAggregatedFixture() {
  return {
    period: "24h",
    ...BASE,
    votes: [
      {
        name: "Single Vote Pack",
        url: "https://example.test/votes/single-pack",
        proposals: [
          {
            title: "Proposal One",
            url: "https://example.test/votes/single-pack/p1#comments",
            events: [
              {
                type: "new_comment",
                count: 2,
              },
            ],
          },
          {
            title: "Proposal Two",
            url: "https://example.test/votes/single-pack/p2#comments",
            events: [
              {
                type: "new_comment",
                count: 1,
              },
            ],
          },
        ],
      },
    ],
  };
}
