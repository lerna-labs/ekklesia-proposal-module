/**
 * Per-vote calendar checks for proposals and comments.
 * Boundary semantics: reject after end with `now > endDate`; reject before start with `now < startDate`
 * (same style as routes/api/v0/comments.js and routes/api/v0/proposals.js).
 */

/**
 * Draft create / draft-only PUT: only block after submission period ends (drafts allowed before submission opens).
 * @param {import("mongoose").LeanDocument|null|undefined} vote
 * @param {Date} [now]
 * @returns {string|null}
 */
export function getDraftOnlySubmissionBlockMessage(vote, now = new Date()) {
  if (vote?.submissionEndDate && now > new Date(vote.submissionEndDate)) {
    return "The submission period for this vote has ended (submissionEndDate).";
  }
  return null;
}

/**
 * POST live or draft→live: must fall inside [submissionStartDate, submissionEndDate].
 * @param {import("mongoose").LeanDocument|null|undefined} vote
 * @param {Date} [now]
 * @returns {string|null}
 */
export function getLiveSubmissionWindowBlockMessage(vote, now = new Date()) {
  if (vote?.submissionStartDate && now < new Date(vote.submissionStartDate)) {
    return "Submission is not open yet for this vote (submissionStartDate).";
  }
  if (vote?.submissionEndDate && now > new Date(vote.submissionEndDate)) {
    return "The submission period for this vote has ended (submissionEndDate).";
  }
  return null;
}

/**
 * Comment actions on live proposals: only during feedback window.
 * @param {import("mongoose").LeanDocument|null|undefined} vote
 * @param {Date} [now]
 * @returns {"before_start"|"after_end"|null}
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
