/**
 * CC Vote 2026 public timeline (UTC). Phases match `__scripts/setup-cc-vote2026.js`:
 * submission and feedback together, then review, then voting.
 *
 * Update these ISO ranges when production Vote dates are fixed so the list page
 * timeline matches the stored vote window.
 */
export const budgetPhases = [
  {
    title: "Submission & Feedback",
    start: "2026-04-01T12:00:00.000Z",
    end: "2026-04-15T12:00:00.000Z",
  },
  {
    title: "Review",
    start: "2026-04-15T12:00:00.000Z",
    end: "2026-04-29T12:00:00.000Z",
  },
  {
    title: "Voting",
    start: "2026-04-29T12:00:00.000Z",
    end: "2026-05-29T12:00:00.000Z",
  },
];
