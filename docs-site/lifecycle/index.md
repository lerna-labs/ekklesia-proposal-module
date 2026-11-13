---
layout: default
title: Proposal Lifecycle
description: The states a proposal moves through, and the rules for each move.
---

A proposal belongs to exactly one vote cycle and is owned by the wallet that
created it. Its state determines who can see it and who can change it.

## States

| State                 | Visible to               | Editable by                   |
| --------------------- | ------------------------ | ----------------------------- |
| `draft`               | Proposer and vote admins | Proposer                      |
| `live`                | Everyone                 | Proposer, until review closes |
| `withdrawnByProposer` | Everyone                 | Nobody                        |
| `withdrawnByAdmin`    | Everyone                 | Nobody                        |
| `archived`            | Everyone                 | Nobody                        |

**Draft.** The proposer is still working. Drafts are private to the proposer and
to the admins of the vote cycle they belong to, and they are the only state that
can be deleted outright.

**Live.** The proposal has been submitted. It is public, it accepts comments
while the feedback window is open, and it can still be edited by its proposer
until the review period ends.

**Withdrawn.** A live proposal can be pulled by its proposer or removed by a
vote admin. Both require a category and a written reason, and both are recorded
on the proposal rather than deleted. Withdrawn proposals stay publicly visible.

**Archived.** Editing a live proposal does not overwrite it. The previous
content is saved as an archived snapshot and referenced from the current
proposal's `versions` array, so the full revision history of a live proposal is
public. Archived snapshots are read-only.

## Transitions

| From    | To                    | Who                | Closes at      |
| ------- | --------------------- | ------------------ | -------------- |
| (none)  | `draft`               | Any signed-in user | Submission end |
| (none)  | `live`                | Any signed-in user | Submission end |
| `draft` | `live`                | Proposer           | Submission end |
| `draft` | deleted               | Proposer           | No limit       |
| `live`  | `live` (new version)  | Proposer           | Review end     |
| `live`  | `withdrawnByProposer` | Proposer           | Review end     |
| `live`  | `withdrawnByAdmin`    | Vote admin         | Voting start   |

Once a proposal is live its status cannot be set back to draft, and a draft
cannot be withdrawn: it is deleted instead.

The two openings differ. A draft can be created at any point up to the close of
the submission window, including before it opens. Going live requires the
submission window to be open at that moment, whether the proposal is submitted
directly or promoted from a draft.

## Editing a live proposal

Each edit to a live proposal is applied as a new version:

1. The current content is copied to a new `archived` proposal document.
2. The live document is updated and its `version` counter is incremented.
3. A reference to the archived snapshot is appended to `versions`.

The update is applied with an optimistic check on the version counter, so two
edits racing each other cannot silently lose one. The losing request is rejected
with `409` and can be retried against the current version.

Two fields are not editable once a proposal is live: its status, and the
treasury donation transaction hash it was submitted with.

## Withdrawal reasons

Withdrawal requires a category and a comment of up to 1000 characters. The
categories are fixed:

- Inappropriate content
- Spam
- Policy violation
- Duplicate submission
- Other

When an admin withdraws a proposal, the proposer is notified by email if they
have a verified address on file. A proposer withdrawing their own proposal sends
no notification.

## Treasury donations

A vote cycle may require a treasury donation before a proposal can be submitted.
When it does, submitting a proposal as `live` requires the transaction hash of
the donation, and the server verifies on chain that the transaction exists, that
it pays the configured amount, and that it comes from the proposer.

One transaction hash can back only one submitted proposal. Reusing a hash that
another non-draft proposal already claims is rejected. Drafts may share a hash,
since nothing has been submitted yet.

If the chain data provider cannot be reached, submission fails with `503` and a
`Retry-After` header rather than being accepted unverified.
