const EVENT_LABELS = {
  submission_confirmed: "Submission confirmed",
  verified_badge_applied: "Verified",
  verified_badge_removed: "Verified badge removed",
  profile_withdrawn: "Profile withdrawn",
  new_comment: "New comment on",
  voting_opened: "Voting is open",
  results_published: "Results published",
};

const VOTE_SUBJECT_EVENTS = new Set(["voting_opened", "results_published"]);

/**
 * Flatten the nested vote→proposal→event tree into a single event list,
 * annotating each event with the vote/proposal names it belongs to.
 * @param {object} data - hydrated digest payload
 * @returns {Array<object>}
 */
function flattenEvents(data) {
  return data.votes.flatMap((vote) =>
    vote.proposals.flatMap((proposal) =>
      proposal.events.map((event) => ({
        ...event,
        voteName: vote.name,
        proposalTitle: proposal.title,
      })),
    ),
  );
}

/**
 * Build the subject line per the comment block at the top of digest.html.
 * Intentionally minimal — the full TRD v0.3 subject generator (i18n, ICU
 * plurals, truncation) is a separate feature and is out of scope here.
 * @param {object} data - hydrated digest payload (output of hydrate())
 * @param {object} [options]
 * @param {string} [options.platformName="Ekklesia"] - brand label for subject prefix
 * @returns {string}
 */
export function buildSubject(data, { platformName = "Ekklesia" } = {}) {
  const events = flattenEvents(data);
  const n = events.length;

  if (n === 1) {
    const event = events[0];
    const label = EVENT_LABELS[event.type] ?? "Update";
    const entity = VOTE_SUBJECT_EVENTS.has(event.type)
      ? event.voteName
      : event.proposalTitle;
    return `${platformName} — ${label}: ${entity}`;
  }

  return `${platformName} digest — ${n} update${n === 1 ? "" : "s"} (${data.summary.period})`;
}

/**
 * Build the hidden preheader line shown by mail clients next to the subject.
 * @param {object} data - hydrated digest payload
 * @returns {string}
 */
export function buildPreheader(data) {
  const { totalEvents, totalVotes, periodVerbose, plural, plural_votes } =
    data.summary;
  return `${totalEvents} update${plural ? "s" : ""} across ${totalVotes} vote${plural_votes ? "s" : ""} from the last ${periodVerbose}`;
}
