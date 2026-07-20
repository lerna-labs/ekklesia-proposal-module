# F-007 Resolution

**Status:** Resolved

**Commits:**
- [`ab23d2f`](https://github.com/lerna-labs/ekklesia-proposal-module/commit/ab23d2f40b8cc692e8b85177c715cacb6526add7) — *Scripts moved* (relocated only)
- [`8a2647f`](https://github.com/lerna-labs/ekklesia-proposal-module/commit/8a2647f81d368bdc54128aaa39f297a75d5f4a2c) — *Addressing F-007 - Production guard for wipe script*

**How:** `wipeDB.js` was moved from `__setup/` to `__scripts/` and given a production / DB-name allowlist guard. The old `fixtures:clean` npm script path was removed from `package.json`. The wipe script was later removed entirely from `__scripts` (no longer shipped).
