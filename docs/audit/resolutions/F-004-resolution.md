# F-004 Resolution

**Status:** Partially resolved

**Commits:** [`1ac397b`](https://github.com/lerna-labs/ekklesia-proposal-module/commit/1ac397b57e1ba14ca063b1a825bf528c432bbfc2) — *Updates for F-004*

**How:** Introduced `validation/applyPublicFieldExclusion.js`: when a vote has `excludeScript` set but the script fails to load, public responses strip `metaData` (fail closed). Startup calls `warnUnloadableExcludeScripts()` from `server.js`.

**Remaining:** Votes with no `excludeScript` still return full proposal data to public callers; exclusion is not mandatory.
