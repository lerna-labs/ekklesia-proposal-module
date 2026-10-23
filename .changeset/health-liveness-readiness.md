---
"proposal-module-server": minor
---

Add `GET /health/live`, which answers 200 `{"status": "alive"}` while the process is running. `GET /health` is now an anonymous readiness check: it answers 200 `{"status": "ready", "network": ..., "networkId": ...}` when the database is connected and every route has loaded, and 503 with `"status": "unavailable"` otherwise, including during startup. It no longer returns the environment, memory, release, frontend version or database fields, and `GET /health/health` and `GET /health/db` are removed. Monitors that poll `/health` must accept a 503 while the database is down or startup is incomplete. The site shows "Server not available" in those cases.
