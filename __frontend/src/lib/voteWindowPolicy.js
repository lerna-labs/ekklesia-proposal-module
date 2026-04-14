/**
 * Vote calendar policy for UI. Vote timestamps from the API are UTC instants (ISO 8601).
 * Compare using Date millisecond timeline only — do not use local getDate/getHours for window logic.
 * Mirrors server rules in helper/voteWindows.js + routes/api/v0/proposals.js + routes/api/v0/comments.js.
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
 * Same semantics as helper/voteWindows.getFeedbackWindowBlockPhase (comments / likes / admin withdraw on comments).
 * @param {{ feedbackStartDate?: string | Date, feedbackEndDate?: string | Date } | null | undefined} vote
 * @param {Date} [now]
 * @returns {"before_start" | "after_end" | null}
 */
export function getFeedbackWindowBlockPhase(vote, now = new Date()) {
	if (vote?.feedbackStartDate && now < new Date(vote.feedbackStartDate)) {
		return "before_start";
	}
	if (vote?.feedbackEndDate && now > new Date(vote.feedbackEndDate)) {
		return "after_end";
	}
	return null;
}

/**
 * Whether POST comment, reply, like, and admin comment withdraw are allowed for this vote (feedback window open).
 * @param {{ feedbackStartDate?: string | Date, feedbackEndDate?: string | Date } | null | undefined} vote
 * @param {Date} [now]
 */
export function feedbackActionsOpen(vote, now = new Date()) {
	return getFeedbackWindowBlockPhase(vote, now) == null;
}

/**
 * Tooltip / title text when feedback actions are disabled (non-empty only when window is closed relative to `now`).
 * @param {{ feedbackStartDate?: string | Date, feedbackEndDate?: string | Date } | null | undefined} vote
 * @param {Date} [now]
 */
export function feedbackWindowActionsDisabledTitle(vote, now = new Date()) {
	const phase = getFeedbackWindowBlockPhase(vote, now);
	if (phase === "before_start") {
		return "The vote feedback period has not started yet (feedback start date in UTC).";
	}
	if (phase === "after_end") {
		return "The vote feedback period has ended (feedback end date in UTC). Comments, replies, and likes are not available.";
	}
	return "";
}

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
