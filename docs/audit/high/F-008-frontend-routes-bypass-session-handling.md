# F-008: Some Frontend Routes Bypass Shared Session Handling

| Field | Value |
|-------|-------|
| **Severity** | High |
| **Finding ID** | F-008 |
| **Category** | Frontend auth / API handling |
| **Status** | Partially resolved |

## Affected Files

- `__frontend/src/routes/votes/[voteSlug]/+page.js`
- `__frontend/src/routes/(private)/+layout.js`
- `__frontend/src/lib/utils/fetchJson.js`

## Observation

Some loaders previously called raw `fetch()` directly instead of the shared `api.fetch()` wrapper, and one path manually injected bearer authentication.

## Risk

Expired sessions and authentication failures can produce inconsistent frontend behavior. Auth handling can also drift across routes over time.

## Recommendation

Route authenticated and API loads through one shared fetch wrapper, or add equivalent centralized 401/session-expiry handling to every raw fetch path.

## Current Status

**Partially resolved.** Vote and proposal loaders use shared `api.fetch()` with cookie credentials and centralized 401 handling. `fetchJson.js` dropped bearer auth and calls `expireSession()` on 401 when the client had auth. JWT is httpOnly-only (F-001). Residual: `(private)/+layout.js` intentionally uses raw `fetch` for the session probe (documented in-file). See `docs/audit/resolutions/F-008-resolution.md`.
