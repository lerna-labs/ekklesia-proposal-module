# F-023 Resolution

**Status:** Resolved

**Commits:** Pending (landed with this change)

**How:** Added `User.sessionVersion` (default `0`). Login JWTs include claim `sv` from the current version (standard and multisig paths). `DELETE /api/v0/session` increments `sessionVersion` before clearing the cookie. `verifyToken` is async: after JWT verify it requires numeric `sv` and rejects tokens that do not match the user’s stored version. Callers (`isAuthenticated`, optional auth in proposals/comments) await it.

**Follow-up (missing-user residual):** `verifyToken` now returns 401 when `User.findById` yields no document, instead of comparing `decoded.sv` to a default `0`. Logout logs when the `sessionVersion` bump matches zero rows and still clears the cookie. Guard: `__tests/security/atk-session-missing-user-guard.js`.

**Remaining:** None for F-023. Pre-deploy JWTs without `sv` require a one-time re-login.
