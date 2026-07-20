# F-001 Resolution

**Status:** Partially resolved

**Commits:** [`587e60c`](https://github.com/lerna-labs/ekklesia-proposal-module/commit/587e60c4334dc3aab6deebc1c8514320f34a3251) — *LocalStorage fallback removed #389*

**How:** `sessionManager.js` no longer writes or reads JWT from `localStorage`; `api.fetch` and logout use `credentials: 'include'` only and no longer send `Authorization: Bearer`. Frontend bearer usage was removed from `fetchJson.js` in [`5865c08`](https://github.com/lerna-labs/ekklesia-proposal-module/commit/5865c08729a322f7d6ae639c38cfb34dd59349e7).

**Remaining:** JWT is still stored in a JavaScript-readable cookie via `Cookies.set('token', …)` in `__frontend/src/stores/sessionManager.js`, and `helper/verifyToken.js` still accepts bearer tokens from the `Authorization` header.
