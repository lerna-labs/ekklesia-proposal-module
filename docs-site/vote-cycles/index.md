---
layout: default
title: Vote Cycles
description: The date windows that govern a round of proposals.
---

A vote cycle is the container for one round of proposals. Everything in the
module hangs off it: proposals belong to a cycle, comments belong to a proposal,
and the cycle's dates decide what is allowed at any moment.

Cycles are addressed by slug or by id. The slug is the stable, readable
identifier used in URLs.

## Windows

Each cycle carries four pairs of dates.

| Window     | Opens                 | Closes              | What it controls                          |
| ---------- | --------------------- | ------------------- | ----------------------------------------- |
| Submission | `submissionStartDate` | `submissionEndDate` | Creating proposals and submitting drafts  |
| Feedback   | `feedbackStartDate`   | `feedbackEndDate`   | Comments, replies and likes               |
| Review     | `reviewStartDate`     | `reviewEndDate`     | Proposer edits and proposer withdrawals   |
| Voting     | `votingStartDate`     | `votingEndDate`     | Voting, which runs on the voting platform |

The windows are enforced by the server, not just reflected in the interface. A
request that arrives outside its window is rejected with a message naming the
window that closed.

Two rules cross the boundaries. A proposer can edit or withdraw a live proposal
until the review period ends, which is later than the submission window. An
admin can withdraw a proposal until voting starts.

## What a cycle configures

Beyond dates, a cycle defines how its proposals behave:

- **Form.** Which proposal form the frontend renders, and which validation rules
  the server applies on submit. Different cycles collect different fields.
- **Deposit options.** The treasury donation amount, and any wallet deposit
  address and amount, both in lovelace.
- **Comments.** A flag declaring whether the cycle intends to collect comments.
  Clients read it to decide what to show.
- **Sort, filter and search options.** The sort keys, filters and searchable
  fields that the proposal list exposes for this cycle. These are returned with
  the cycle, so a client can build its own listing UI without hardcoding them.
- **Admins.** The stake addresses that hold admin rights on this cycle, and only
  this cycle.
- **Voting and results URLs.** Optional links out to the voting platform and to
  a published results page.

Scripts that a cycle runs server-side, such as its validation and field
exclusion rules, are not included in API responses.

## Reading a cycle

`GET /api/v0/votes` lists cycles with pagination, and accepts either a free-text
`search` over the title or an exact `slug`. `GET /api/v0/votes/{identifier}`
accepts either the 24-character id or the slug in the same position.

See the [API overview]({{ '/api/' | relative_url }}) for parameters and
responses.
