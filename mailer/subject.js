/** Proposal vs vote entity naming matches instant/digest subject lines. */
export const VOTE_SUBJECT_EVENTS = new Set([
  "voting_opened",
  "results_published",
]);

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
 * Build the subject line from the TRD-shaped `subject.*` catalog keys.
 */
export function buildSubject(data, { platformName, t } = {}) {
  const events = flattenEvents(data);
  const n = events.length;
  const pn = platformName ?? data.brand?.platformName ?? "Ekklesia";
  const period = t
    ? t.raw(`subject.period.${data.summary.period}`)
    : data.summary.period;

  if (n === 1) {
    const event = events[0];
    const entity = VOTE_SUBJECT_EVENTS.has(event.type)
      ? event.voteName
      : event.proposalTitle;
    if (t) {
      return t.raw(`subject.digest.single.${event.type}`, {
        platformName: pn,
        proposalTitle: entity,
        voteName: entity,
      });
    }
    return `${pn} — Update: ${entity}`;
  }

  const distinctVotes = new Set(events.map((e) => e.voteName)).size;
  if (t && distinctVotes === 1) {
    return t.raw("subject.digest.multi.single_vote", {
      platformName: pn,
      N: n,
      voteName: events[0].voteName,
      period,
    });
  }
  if (t) {
    return t.raw("subject.digest.multi.many_votes", {
      platformName: pn,
      N: n,
      M: distinctVotes,
      period,
    });
  }
  return `${pn} digest — ${n} updates (${period})`;
}

export function buildPreheader(data, t) {
  if (t) return t.raw("preheader.default", data.summary);
  const { totalEvents, totalVotes, periodVerbose, plural, plural_votes } =
    data.summary;
  return `${totalEvents} update${plural ? "s" : ""} across ${totalVotes} vote${plural_votes ? "s" : ""} from the last ${periodVerbose}`;
}
