# F-027 Resolution

**Status:** Resolved

**Commits:** Pending (landed with this change)

**How:** Documentation aligned to the existing delete handler (no route change). `docs/api-specification.md` §5.4 now documents `200 OK` with `{ status: "success", message: "Proposal deleted" }`; conventions / §7.2 no longer claim `204 No Content` for deletes. `docs/proposal-flow.md` sequence diagram updated the same way. Spec v1.2.2 / proposal-flow v0.1.5.

**Remaining:** None for F-027.
