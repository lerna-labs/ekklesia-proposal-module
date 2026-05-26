/** Cardano Budget timeline (UTC). Phases are ordered for display; overlaps resolve by first match. */
export const budgetPhases = [
  {
    title: "Submission",
    start: "2026-04-16T12:00:00.000Z",
    end: "2026-05-08T12:00:00.000Z",
  },
  {
    title: "Final Feedback and Review",
    start: "2026-05-08T12:00:00.000Z",
    end: "2026-05-22T12:00:00.000Z",
  },
  {
    title: "Hydra Voting",
    start: "2026-05-26T12:00:00.000Z",
    end: "2026-06-12T12:00:00.000Z",
    link: {
      href: "https://intersect.ekklesia.vote/ballots/6a1512d782978c99456fe6de/proposals",
      label: "Go to Voting",
    },
  },
  {
    title: "Voting Audit",
    start: "2026-06-15T12:00:00.000Z",
    end: "2026-06-19T12:00:00.000Z",
  },
  {
    title: "Audited Voting Results",
    start: "2026-06-19T12:00:00.001Z",
    end: "2026-06-19T23:59:59.999Z",
    link: {
      href: "https://intersect.ekklesia.vote/ballots/6a1512d782978c99456fe6de/proposals",
      label: "View Results",
    },
  },
];
