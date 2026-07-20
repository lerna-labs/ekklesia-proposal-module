# F-001: JWTs Are Stored in JavaScript-Readable Browser Storage

| Field | Value |
|-------|-------|
| **Severity** | Critical |
| **Finding ID** | F-001 |
| **Category** | Token storage / session security |
| **Status** | Partially fixed |

## Affected Files

- `__frontend/src/stores/sessionManager.js:124-165`
- `helper/verifyToken.js:58-64`

## Observation

The backend sets an httpOnly cookie, but the frontend also writes the JWT into JavaScript-readable storage, including a client-managed cookie and localStorage. The frontend then sends the token as an `Authorization: Bearer` value, and the backend accepts bearer tokens.

## Risk

Any cross-site scripting issue or injected browser script can read and reuse the JWT. This defeats the protection provided by the backend httpOnly cookie.

## Recommendation

Keep browser sessions in a server-set httpOnly cookie only. Remove localStorage and client-managed token-cookie storage for JWTs. Remove bearer-token authentication for browser flows unless a separate non-browser client requirement is explicitly documented and isolated.

## Current Status

Partially fixed based on current source inspection. localStorage token storage was removed, but the frontend still writes a JavaScript-readable token cookie, `fetchJson()` can still send bearer authentication, and the backend still accepts bearer tokens.
