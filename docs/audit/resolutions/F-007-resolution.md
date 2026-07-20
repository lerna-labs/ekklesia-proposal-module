# F-007 Resolution

**Status:** Not resolved

**Commits:** [`ab23d2f`](https://github.com/lerna-labs/ekklesia-proposal-module/commit/ab23d2f40b8cc692e8b85177c715cacb6526add7) — *Scripts moved* (relocated only)

**How:** `wipeDB.js` was moved from `__setup/` to `__scripts/`; the old `fixtures:clean` npm script path was removed from `package.json`.

**Remaining:** `__scripts/wipeDB.js` still deletes all collections with no production guard, database allowlist, or confirmation prompt.
