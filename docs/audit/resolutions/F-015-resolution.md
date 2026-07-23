# F-015 Resolution

**Status:** Resolved

**Commits:** Pending (landed with this change)

**How:** Global API error handlers in `server.js` (unknown `/api/*` 404, URI decoding 400, and the general error handler) now return `{ status: "error", message }` instead of `{ error }`, matching `routes/api/v0/*`, `helper/middleWare.js`, and API specification §7.1. Message strings and HTTP status codes are unchanged.

**Remaining:** None for F-015.
