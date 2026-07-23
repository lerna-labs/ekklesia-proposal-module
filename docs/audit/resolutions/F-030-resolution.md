# F-030 Resolution

**Status:** Resolved

**Commits:** Pending (landed with this change)

**How:** Removed module-scope `fetchVersionInfo()` / `setInterval` from `versionStore.js`. Added idempotent `startVersionPolling` / `stopVersionPolling`. `VersionCheck.svelte` (already in root layout) starts polling in `onMount` and clears the interval on destroy.

**Remaining:** None for F-030.
