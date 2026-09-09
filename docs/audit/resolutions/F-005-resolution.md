# F-005 Resolution

**Status:** Resolved

**Commits:** [`8d64667`](https://github.com/lerna-labs/ekklesia-proposal-module/commit/8d64667599320cad7e9253caeb01a5e6b3e7d441) — *Bugfix for potential duplicate slugs (F-005)*

**How:** Added unique index on `Vote.slug` in `schema/Vote.js` and `helper/mongoErrors.js` for duplicate-key detection. A former `__scripts/check-duplicate-vote-slugs.js` pre-release helper was removed with the `__scripts` cleanup; the unique index remains.

**Follow-up (preflight residual):** `__scripts/admin/ensure-vote-slug-unique-index.mjs` reports duplicate slugs and runs `Vote.syncIndexes()`. Vote setup scripts map E11000 via `isDuplicateKeyError` to a clear failure message. Guard: `__tests/security/atk-vote-slug-unique-index-guard.js`.

