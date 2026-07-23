# F-026 Resolution

**Status:** Resolved

**Commits:** Pending (landed with this change)

**How:** `server.js` keeps the `http.Server` from `app.listen` and registers one-shot `SIGTERM`/`SIGINT` handlers that call `server.close` (drain in-flight requests), then `disconnectFromDatabase()`, then exit. A 10s force-exit timer covers hung drains. The incomplete `SIGINT`-only Mongo close/`process.exit` handler was removed from `helper/dbManager.js` so shutdown is centralized.

**Remaining:** None for F-026.
