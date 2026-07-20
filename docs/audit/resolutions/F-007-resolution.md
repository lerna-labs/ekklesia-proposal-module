# F-007 Resolution

**Status:** Resolved

**Commits:** [`ab23d2f`](https://github.com/lerna-labs/ekklesia-proposal-module/commit/ab23d2f40b8cc692e8b85177c715cacb6526add7) — *Scripts moved* (relocated only)

**How:** `wipeDB.js` was moved from `__setup/` to `__scripts/`; the old `fixtures:clean` npm script path was removed from `package.json`. `__scripts/wipeDB.js` now exits before connecting when `NODE_ENV=production` or when `MONGODB_DATABASE` is not in the local allowlist (`bugdet-module`).
