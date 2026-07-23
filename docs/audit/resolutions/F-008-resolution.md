# F-008 Resolution

**Status:** Accepted (by design)

**Commits:**
- [`5865c08`](https://github.com/lerna-labs/ekklesia-proposal-module/commit/5865c08729a322f7d6ae639c38cfb34dd59349e7) — *Improvements & fixes for F-008*
- [`587e60c`](https://github.com/lerna-labs/ekklesia-proposal-module/commit/587e60c4334dc3aab6deebc1c8514320f34a3251) — *LocalStorage fallback removed #389*

**How:** Vote and proposal loaders use shared `api.fetch()` with cookie credentials and centralized 401 handling. `fetchJson.js` dropped bearer auth and calls `expireSession()` on 401 when the client had auth. JWT sessions use the httpOnly cookie only (see F-001). `(private)/+layout.js` intentionally uses raw `fetch` for the session probe (documented in-file); that exception is accepted by design.

**Remaining:** None — do not treat the layout session probe as an open fix.
