# F-001 Resolution

**Status:** Resolved

**Commits:** [`587e60c`](https://github.com/lerna-labs/ekklesia-proposal-module/commit/587e60c4334dc3aab6deebc1c8514320f34a3251) — *LocalStorage fallback removed #389*; [`5865c08`](https://github.com/lerna-labs/ekklesia-proposal-module/commit/5865c08729a322f7d6ae639c38cfb34dd59349e7) — frontend bearer usage removed from `fetchJson.js`; follow-up closes remaining JS-readable cookie and Bearer acceptance.

**How:**
- `sessionManager.js` no longer writes or reads JWT from `localStorage`, JS-readable cookies, or a `jwt` store; it tracks `sessionExpiresAt` only via `setSessionExpiry`.
- `api.fetch` / `fetchJson` use `credentials: 'include'` and `loggedIn` for 401 handling; they never send `Authorization: Bearer`.
- `PUT /session` sets the httpOnly cookie and returns `{ expiresIn, userId }` without the JWT in the body.
- `GET /session` returns `expiresIn` so the expiry UI hydrates on reload.
- `helper/verifyToken.js` accepts the httpOnly cookie only (Bearer fallback removed).
- Legacy JS-readable `token` cookie / `localStorage.token` are cleared on logout for older clients.

**Remaining:** None for F-001.
