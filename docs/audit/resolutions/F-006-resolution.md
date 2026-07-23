# F-006 Resolution

**Status:** Resolved

**Commits:** Pending (landed with this change)

**How:** Live proposal updates in `routes/api/v0/proposals.js` now archive the current snapshot, then apply the live update with an optimistic compare-and-swap via `Proposal.findOneAndUpdate({ _id, status: "live", version: expectedVersion }, { $set, $inc: { version: 1 }, $push: { versions } })`. Concurrent conflicts delete the orphan archive and return 409 so the client can retry.
