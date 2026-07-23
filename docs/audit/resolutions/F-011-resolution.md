# F-011 Resolution

**Status:** Resolved

**Commits:** [`7bf8be3`](https://github.com/lerna-labs/ekklesia-proposal-module/commit/7bf8be353507277edc907ad04a3beab0a3983ff6) — *Bugfixes for F-011*

**How:** `helper/loadRoutes.js` collects per-file import failures during the route walk and throws before the server listens if any route failed to load. `server.js` documents that `loadRoutes` throws on failure. Security test `__tests/security/atk-route-loader-isolation.js` updated accordingly.
