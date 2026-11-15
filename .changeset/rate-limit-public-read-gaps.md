---
"proposal-module-server": patch
---

Apply the 200 requests per minute per IP read rate limit to `GET /api/v0/countries`, `GET /api/v0/regions`, `GET /api/v0/notifications` and `GET /share/votes/:voteSlug/:proposalId`. These endpoints were previously unlimited.
