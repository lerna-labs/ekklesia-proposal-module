/**
 * Vote calendar policy for UI. Vote timestamps from the API are UTC instants (ISO 8601).
 * Compare using Date millisecond timeline only — do not use local getDate/getHours for window logic.
 * Mirrors server rules in helper/voteWindows.js + routes/api/v0/proposals.js.
 */

/**
 * Draft create / draft-only edit: allowed through end of submission (not blocked before submissionStartDate on API).
 * @param {{ submissionEndDate?: string | Date } | null | undefined} vote
 * @param {Date} [now]
 */
export function draftSubmissionOpen(vote, now = new Date()) {
	if (!vote?.submissionEndDate) return true;
	return now.getTime() <= new Date(vote.submissionEndDate).getTime();
}

/**
 * Live re-submit and proposer withdraw: allowed while review is still open (now <= reviewEndDate).
 * @param {{ reviewEndDate?: string | Date } | null | undefined} vote
 * @param {Date} [now]
 */
export function liveResubmitOpen(vote, now = new Date()) {
	if (!vote?.reviewEndDate) return true;
	return now.getTime() <= new Date(vote.reviewEndDate).getTime();
}

/** Same cutoff as live re-submit for proposer withdrawal. */
export const proposerWithdrawOpen = liveResubmitOpen;

/**
 * Resolve vote doc for a proposal row (ObjectId vs string).
 * @param {{ voteId?: string }} proposal
 * @param {unknown[]} votes
 */
export function voteForProposalRow(proposal, votes) {
	const vid = proposal?.voteId;
	if (vid == null || !Array.isArray(votes)) return null;
	const s = String(vid);
	return votes.find((v) => v && String(v._id) === s) ?? null;
}
