# F-003 Resolution

**Status:** Resolved

**Commits:** [`9bac132`](https://github.com/lerna-labs/ekklesia-proposal-module/commit/9bac1320a68a260bea844b9fb8218066cbb3dd4d) — *Bugfix for F-003*

**How:** Added `helper/escapeRegex.js` and updated `routes/api/v0/votes.js` to escape regex metacharacters before `$regex` queries and reject search terms over 100 characters (`MAX_SEARCH_LENGTH`).
