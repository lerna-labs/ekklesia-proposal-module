# F-011: Route Loader Can Hide Startup Route Failures

| Field | Value |
|-------|-------|
| **Severity** | High |
| **Finding ID** | F-011 |
| **Category** | Startup reliability |
| **Status** | Open |

## Affected Files

- `helper/loadRoutes.js:39-42`
- `server.js:68-69`
- `helper/koios.js:11-19`

## Observation

Route-loading errors are caught and logged without failing startup. Some modules can throw during import when required API configuration is missing.

## Risk

The server can start with missing API routes instead of failing fast. This makes deployment failures harder to detect.

## Recommendation

Re-throw route import failures during startup, or expose a failed health state and stop serving traffic until route loading succeeds.

## Current Status

Open. Route import errors are still caught and logged without failing startup.
