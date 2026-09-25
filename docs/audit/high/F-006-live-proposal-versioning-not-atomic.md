# F-006: Live Proposal Versioning Is Not Atomic

| Field | Value |
|-------|-------|
| **Severity** | High |
| **Finding ID** | F-006 |
| **Category** | Data consistency / versioning |
| **Status** | Resolved |

## Affected Files

- `routes/api/v0/proposals.js` (live → live `PUT /:proposalId` path)

## Observation

The live proposal update path first saves an archived snapshot, then mutates and saves the live proposal with an incremented version. The operation does not use a MongoDB transaction, compare-and-swap update, or optimistic lock.

## Risk

Concurrent edits can lose updates, duplicate version numbers, or leave an archived snapshot without a matching live update if a later save fails.

## Recommendation

Wrap archive and live update in a MongoDB transaction, or use optimistic locking with an atomic `findOneAndUpdate` pattern.

## Current Status

**Resolved.** Live → live updates archive a snapshot, then apply the live change with `Proposal.findOneAndUpdate` filtered on `_id`, `status: "live"`, and the expected `version`. On CAS miss the orphan archive is deleted and the API returns 409. Any exception after the archive is persisted also deletes the orphan before the error propagates.

