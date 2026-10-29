---
"proposal-module-server": patch
---

Remove the `qs` override and update the root lockfile to `qs` 6.17.1. This clears GHSA-6pq8-jhm2-2vcw, a denial of service in `qs.stringify` with `arrayFormat: 'comma'` affecting `qs` 6.7.0 through 6.16.0.
