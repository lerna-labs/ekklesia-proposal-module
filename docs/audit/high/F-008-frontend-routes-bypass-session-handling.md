# F-008: Some Frontend Routes Bypass Shared Session Handling

| Field | Value |
|-------|-------|
| **Severity** | High |
| **Finding ID** | F-008 |
| **Category** | Frontend auth / API handling |
| **Status** | Partially fixed |

## Affected Files

- `__frontend/src/routes/votes/[voteSlug]/+page.js:19-52`
- `__frontend/src/routes/(private)/+layout.js:7-10`

## Observation

Some loaders call raw `fetch()` directly instead of the shared `api.fetch()` wrapper. One route manually injects bearer authentication.

## Risk

Expired sessions and authentication failures can produce inconsistent frontend behavior. Auth handling can also drift across routes over time.

## Recommendation

Route authenticated and API loads through one shared fetch wrapper, or add equivalent centralized 401/session-expiry handling to every raw fetch path.

## Current Status

Partially fixed based on current source inspection. The vote page no longer manually injects bearer auth, but loaders still bypass shared `api.fetch()`, and `fetchJson()` still sends bearer auth when a token is present.
