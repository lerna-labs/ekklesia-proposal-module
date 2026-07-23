# F-004 Resolution

**Status:** Accepted (by design) — fail-closed path kept; mandatory exclusion declined

**Commits:** [`1ac397b`](https://github.com/lerna-labs/ekklesia-proposal-module/commit/1ac397b57e1ba14ca063b1a825bf528c432bbfc2) — *Updates for F-004*

**How:** Introduced `validation/applyPublicFieldExclusion.js`: when a vote has `excludeScript` set but the script fails to load, public responses strip `metaData` (fail closed). Startup calls `warnUnloadableExcludeScripts()` from `server.js`. Optional `excludeScript` (full public data when unset) is intentional by design.

**Remaining:** None — do not treat mandatory exclusion as an open fix.
