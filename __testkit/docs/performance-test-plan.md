# Performance test — reference

| Field | Value |
|-------|--------|
| **Version** | 2.0.0 |
| **Last revised** | 2026-04-13 |

## Data

- **Vote slug:** `ekklesia-testkit` (`helpers/testkitConstants.js`), shared with integration seed and `npm run seed:perf`.
- **Proposals:** 20,000 docs from `__scripts/proposal1.json` / `proposal2.json` (see `helpers/seedPerf.js`).

## What `tests/performance.test.js` does

Measures HTTP timings for public vote and proposal routes with throttling so the client stays under **200 GETs/min per IP**. Does not seed; run `npm run seed:perf` first (Mongo env aligned with the API).

Smaller matrix than the original plan: two `limit` values for sort/search/filter (`LIMITS` in the test file).

## Rate limits (elsewhere)

Public read 429 is asserted in `tests/z-public-rate-limit.test.js`. Comment writes (5/min per user) in `tests/comment-rate-limit.test.js`.

## Changes

| Version | Date | Description |
|---------|------|-------------|
| 2.0.0 | 2026-04-13 | Slug `ekklesia-testkit`; slim limit matrix; pointers to split rate-limit tests. |
| 1.1.0 | 2026-03-14 | Sort/search/filter with multiple limits. |
