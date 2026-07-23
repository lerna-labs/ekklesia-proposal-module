# F-023 Resolution

**Status:** Resolved

**Commits:** Pending (landed with this change)

**How:** Added `User.sessionVersion` (default `0`). Login JWTs include claim `sv` from the current version (standard and multisig paths). `DELETE /api/v0/session` increments `sessionVersion` before clearing the cookie. `verifyToken` is async: after JWT verify it requires numeric `sv` and rejects tokens that do not match the user’s stored version. Callers (`isAuthenticated`, optional auth in proposals/comments) await it.

**Remaining:** None for F-023. Pre-deploy JWTs without `sv` require a one-time re-login.
