/**
 * CC Vote public timeline (UTC). Date-only phases use 12:00 UTC at each boundary.
 * Update these ISO ranges when production Vote dates are fixed so the vote detail
 * timeline matches announcements.
 */
export const budgetPhases = [
  {
    title: "Candidate registration",
    start: "2026-05-08T21:45:00.000Z",
    end: "2026-06-21T21:45:00.000Z",
  },
  {
    title: "Hydra voting period",
    start: "2026-06-28T21:45:00.000Z",
    end: "2026-07-23T21:45:00.000Z",
    link: {
      href: "https://intersect.ekklesia.vote/ballots/",
      label: "Go to Voting",
    },
  },
  {
    title: "Audited results published",
    start: "2026-07-27T12:00:00.000Z",
    end: "2026-07-27T23:59:59.999Z",
  },
  {
    title: "Update Committee governance action — Epoch 648",
    start: "2026-07-28T21:45:00.000Z",

  },
];
