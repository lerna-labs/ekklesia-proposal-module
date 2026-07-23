# F-006: Live Proposal Versioning Is Not Atomic

| Field | Value |
|-------|-------|
| **Severity** | High |
| **Finding ID** | F-006 |
| **Category** | Data consistency / versioning |
| **Status** | Open |

## Affected Files

- `routes/api/v0/proposals.js:552-623`

## Observation

The live proposal update path first saves an archived snapshot, then mutates and saves the live proposal with an incremented version. The operation does not use a MongoDB transaction, compare-and-swap update, or optimistic lock.

## Risk

Concurrent edits can lose updates, duplicate version numbers, or leave an archived snapshot without a matching live update if a later save fails.

## Recommendation

Wrap archive and live update in a MongoDB transaction, or use optimistic locking with an atomic `findOneAndUpdate` pattern.

## Current Status

Open. Live proposal updates still archive one document and then save the live proposal without a MongoDB transaction or optimistic lock.
