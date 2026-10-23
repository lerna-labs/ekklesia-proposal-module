---
"proposal-module-server": minor
---

Add `GET /health/live`, which answers 200 `{"status": "alive"}` while the process is running. `GET /health` is now an anonymous readiness check: it answers 200 `{"status": "ready", "network": ..., "networkId": ...}` when the database answers the same ping the API uses and every route has loaded, and 503 with `"status": "unavailable"` otherwise. The database result is reused for 3 seconds and a ping that takes longer than 2 seconds counts as failed. The server only accepts connections once startup has finished. `GET /health` no longer returns the environment, memory, release, frontend version or database fields, and `GET /health/health`, `GET /health/db` and any other path under `/health` now answer 404 with a JSON body; monitors on the old paths should move to `/health` or `/health/live`. Monitors that poll `/health` must accept a 503 while the database is down. The site shows "Server not available" in that case.
