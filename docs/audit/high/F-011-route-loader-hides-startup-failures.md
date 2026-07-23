# F-011: Route Loader Can Hide Startup Route Failures

| Field | Value |
|-------|-------|
| **Severity** | High |
| **Finding ID** | F-011 |
| **Category** | Startup reliability |
| **Status** | Resolved |

## Affected Files

- `helper/loadRoutes.js`
- `server.js`

## Observation

Route-loading errors were previously caught and logged without failing startup. Some modules can throw during import when required API configuration is missing.

## Risk

The server can start with missing API routes instead of failing fast. This makes deployment failures harder to detect.

## Recommendation

Re-throw route import failures during startup, or expose a failed health state and stop serving traffic until route loading succeeds.

## Current Status

**Resolved.** `helper/loadRoutes.js` collects per-file import failures during the route walk and throws before the server listens if any route failed to load. See `docs/audit/resolutions/F-011-resolution.md`.
