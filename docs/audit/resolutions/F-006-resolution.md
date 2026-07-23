# F-006 Resolution

**Status:** Not resolved

**Commits:** None identified

**How:** No change found. Live proposal updates in `routes/api/v0/proposals.js` still archive with `archivedDoc.save()` then mutate/save the live document without a MongoDB transaction or optimistic lock.
