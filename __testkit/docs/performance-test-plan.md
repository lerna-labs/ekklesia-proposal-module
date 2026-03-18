# Performance test plan – vote and proposal endpoints

| Field           | Value     |
|-----------------|-----------|
| **Version**     | 1.1.0     |
| **Last revised**| 2026-03-14|

## Overview

Performance test in __testkit that: (1) seeds a new vote and 20,000 proposals from __setup proposal JSON; (2) measures and logs response times for vote and proposal API endpoints (list, pagination, sort, filter, search); (3) **as a last step**, tests rate limits and logs results.

---

## 1. Data seeding (MongoDB from testkit)

- **Connection:** Same env as app (MONGODB_* or MONGO_URI). Use `../../helper/dbManager.js` or build URI in test and `mongoose.connect()`.
- **Vote:** One document, slug e.g. `perf-test-20k`, shape as in __setup/createDummyData.js (title, description, slug, admins, dates, validationScript, sortOptions, filterOptions, searchOptions, metaData.strategyFramework.pillars).
- **Proposals:** Load __setup/proposal1.json and __setup/proposal2.json; normalize (new _id, voteId = new vote, status "live", submittedAt); alternate templates for 20k docs; insert in batches (500–1000 per Proposal.insertMany).
- **Deps:** mongoose in __testkit; import Vote, Proposal from `../../schema/`.
- **Cleanup:** afterAll delete proposals by voteId, delete vote, disconnect; skip if PERF_KEEP_DATA=1.

---

## 2. Endpoints and actions to measure (response times)

**Vote endpoints (single run each):**  
GET /votes; GET /votes?slug=perf-test-20k; GET /votes/:voteId; GET /votes/:slug; GET /votes?page=2&limit=10; GET /votes?search=...  
Log response time for each.

**Proposal – baseline and pagination:**  
GET /proposals?vote=:voteId (default limit); GET /proposals?vote=:voteId&page=2&limit=20; GET /proposals/:proposalId.  
Log response time for each.

**Proposal – sort, search, and filter with different limit settings:**  
For **sort**, **search**, and **filter** (status=live, and category if the vote has categories), run each variant with **several limit values** (e.g. limit=10, 20, 50, 100). Every response time **must be logged**.

- **Sort:** e.g. sort=title&direction=asc and sort=submittedAt&direction=desc, each with limit=10, 20, 50, 100. Log `[perf] GET /proposals sort=title direction=asc limit=10 — <ms> ms`, etc.
- **Search:** e.g. search=&lt;term&gt; with limit=10, 20, 50, 100. Log `[perf] GET /proposals search=... limit=10 — <ms> ms`, etc.
- **Filter:** e.g. status=live (and category=... if applicable) with limit=10, 20, 50, 100. Log `[perf] GET /proposals status=live limit=10 — <ms> ms`, etc.

Use a small set of limit values (e.g. [10, 20, 50, 100]) consistently so results are comparable. All response times must be written to the log so they can be inspected after the run.

---

## 3. Rate limits – last step

After all performance measurements, run a **final step** that verifies rate limiting and logs the outcome.

**Public read limit (200 per IP per 1 min):**  
API spec: GET /votes, GET /proposals, etc. are limited to **200 per IP per minute**. In the test, send **201** GET requests (e.g. GET /votes or GET /proposals?vote=:voteId) in a loop. Assert that the **201st** request returns **429** and response body indicates rate limit (e.g. message like "Too many requests"). Log the response time of the 429 response and a one-line summary (e.g. `[perf] rate limit (public read) — 201st request returned 429 in <ms> ms`). Use a single endpoint for all 201 requests to stay within the same limit window.

**Optional – session limits (already covered in session.test.js):**  
POST /session (5/min) and PUT /session (10/min) are tested in session tests; no need to duplicate in the performance test unless desired.

**Optional – authenticated write limit (10 per user per min):**  
If the test has a logged-in user (e.g. via login helper), send 11 authenticated write requests (e.g. POST /proposals or PUT /proposals/:id with minimal payload) and assert the 11th returns 429. Log result. This step is optional and may require a dedicated vote/proposal to avoid polluting data.

**Implementation note:** The 201 GET requests will take a few seconds; run them sequentially (or in small batches) so the server actually enforces the 200/min limit. Log each 429 and the total time for the rate-limit phase.

---

## 4. Test structure

- **beforeAll:** Connect DB; create Vote (or reuse by slug); ensure 20k proposals; store voteId, voteSlug, one proposalId.
- **Main test:** Run all measured GET actions; log response time for each.
- **Last step (rate limits):** Send 201 GET requests to a public read endpoint; assert 201st returns 429; log 429 response time and summary.
- **afterAll:** Teardown (delete proposals, vote, disconnect) unless PERF_KEEP_DATA=1.

---

## 5. Config and docs

- **Env:** __testkit/.env.example: API_BASE_URL; MONGO_URI or MONGODB_* for perf seed.
- **Script:** `test:perf` in package.json; long Jest timeout (e.g. 300000 ms).
- **README / docs:** Describe perf test, prerequisites, 20k seed, and that the test logs response times and ends with a rate-limit check (429 on over-limit request).

---

## Changes

| Version | Date       | Description |
|---------|------------|-------------|
| 1.1.0   | 2026-03-14 | Sort, search, and filter must be tried with different limit settings (e.g. 10, 20, 50, 100); every response time for these combinations must be logged (e.g. `[perf] GET /proposals sort=title limit=20 — <ms> ms`). |
| 1.0.0   | 2026-03-14 | Initial plan: seed vote + 20k proposals, measure vote/proposal endpoints, log response times. Added final step: test public-read rate limit (201 GETs → 429), log 429 and summary. |
