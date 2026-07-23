# F-001: JWTs Are Stored in JavaScript-Readable Browser Storage

| Field | Value |
|-------|-------|
| **Severity** | Critical |
| **Finding ID** | F-001 |
| **Category** | Token storage / session security |
| **Status** | Resolved |

## Affected Files

- `__frontend/src/stores/sessionManager.js`
- `helper/verifyToken.js`

## Observation

The backend sets an httpOnly cookie, but the frontend also wrote the JWT into JavaScript-readable storage, including a client-managed cookie and localStorage. The frontend then sent the token as an `Authorization: Bearer` value, and the backend accepted bearer tokens.

## Risk

Any cross-site scripting issue or injected browser script can read and reuse the JWT. This defeats the protection provided by the backend httpOnly cookie.

## Recommendation

Keep browser sessions in a server-set httpOnly cookie only. Remove localStorage and client-managed token-cookie storage for JWTs. Remove bearer-token authentication for browser flows unless a separate non-browser client requirement is explicitly documented and isolated.

## Current Status

Resolved. Sessions use the server-set httpOnly `token` cookie only. The frontend does not store the JWT in localStorage, JS-readable cookies, or a Svelte store. Login responses omit the JWT body field. `verifyToken` reads the cookie only (no Bearer fallback). See [F-001-resolution.md](../resolutions/F-001-resolution.md).
