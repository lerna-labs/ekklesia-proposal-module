# Testkit

| Field       | Value   |
|------------|---------|
| **Version** | 1.0.0   |
| **Last revised** | 2026-03-14 |

Tests for the Ekklesia Proposal Module API. **Login smoke test:** `tests/login.test.js`. **Full session/auth suite:** `tests/session.test.js`. **Performance (vote/proposal + rate limit):** `tests/performance.test.js`. See [docs/session-tests.md](docs/session-tests.md) and [docs/performance-test-plan.md](docs/performance-test-plan.md).

## Prerequisites

- **Backend** running (e.g. at `http://localhost:3000`).
- **cardano-signer** CLI on `PATH` ([docs/cardano-signer.md](docs/cardano-signer.md)).
- **DRep keys** in `keys/drep01_jag/` and `keys/drep02_w9c/` (`drep.skey`, `drep_id.txt`). DReps used for login must be registered (backend validates via Koios).

## Configuration

Copy `.env.example` to `.env` and set:

- `API_BASE_URL` – API base URL (default: `http://localhost:3000/api/v0`).
- `JWT_SECRET` – (optional) Must match the backend secret for expired-token tests. If unset, those tests are skipped.
- **Performance test:** No MongoDB in the test. For **remote** runs set `API_BASE_URL` and either `PERF_VOTE_ID` + `PERF_PROPOSAL_ID` (and optional `PERF_VOTE_SLUG`), or ensure the API has a vote with slug `perf-test-20k` (test will discover ids). To **seed** that data (e.g. for local or pre-loading remote): `MONGO_URI` or `MONGODB_*` in .env, then run `npm run seed:perf`.

## Run tests

From the `__testkit` directory:

```bash
npm test              # all tests
npm run test:login    # only tests/login.test.js
npm run test:session  # only tests/session.test.js
npm run test:perf     # only tests/performance.test.js (HTTP only; set API_BASE_URL; optional PERF_* ids)
npm run test:ratelimit  # only tests/performance-rate-limit.test.js (201 GETs → 429; no seed)
npm run seed:perf     # seed one vote + 20k proposals (needs MongoDB); prints PERF_VOTE_ID, PERF_PROPOSAL_ID
npm run seed:perf:teardown  # delete that vote and its proposals
```

To disable step-by-step logging: `TESTKIT_LOG=0 npm test` (or with `test:login` / `test:session`).

If you see a Node warning about `--localstorage-file` when running from the IDE, the npm script uses `--no-webstorage` when run via `npm test`.

The **login test** (`tests/login.test.js`) runs login → GET session → logout → GET session 401.

### Session tests

`tests/session.test.js` covers:

- **POST /session** – valid body, missing/invalid params, invalid address/signType.
- **PUT /session** – valid signature, wrong/tampered signature, missing signature, nonce replay, signer/signature binding, invalid signType.
- **GET /session** – with cookie, no cookie, expired token, invalid token, Bearer token.
- **DELETE /session** – with cookie, no cookie, expired token, Bearer token.
- **Rate limiting** – POST over 5/min → 429 (PUT limit test skipped; see plan).
- **Access** – public reads (countries, votes, proposals), POST /proposals without/with auth, own proposals.
- **Optional** – Set-Cookie HttpOnly.

Stale-nonce and PUT rate-limit tests are skipped by default (see plan).

### Performance test

`tests/performance.test.js` measures response times for vote and proposal endpoints (list, pagination, sort, search, filter) and prints average response times. It does **not** seed or teardown; it only runs HTTP requests against `API_BASE_URL`. Data must already exist (vote with slug `perf-test-20k` and 20k proposals). You can set `PERF_VOTE_ID` and `PERF_PROPOSAL_ID` (and optional `PERF_VOTE_SLUG`) in env, or the test will discover them via GET /votes?slug=perf-test-20k and GET /proposals?vote=...&limit=1. It throttles to stay under the 200/min public-read limit.

To **seed** that data (e.g. for local or to pre-load a remote DB), run from __testkit: `npm run seed:perf`. This needs MongoDB (`MONGO_URI` or `MONGODB_*` in .env) and creates one vote + 20k proposals, then prints the ids for use as `PERF_VOTE_ID` / `PERF_PROPOSAL_ID`. To remove them: `npm run seed:perf:teardown`.

`tests/performance-rate-limit.test.js` runs separately: it sends 201 GET requests to a public read endpoint and asserts the 201st returns **429**. Run with `npm run test:ratelimit`. No seed or MongoDB required; only the API need be running.

### Debugging PUT /session 400

If a test fails at **PUT /session** (400):

1. Run the backend in one terminal so its console is visible.
2. Run `npm test` in `__testkit`.
3. In the backend terminal, look for signature verification or nonce errors.
4. Ensure `drep_id.txt` matches the key in `drep.skey` (e.g. regenerate with cardano-signer if needed).

---

## Changes

| Version | Date       | Description |
|---------|------------|-------------|
| 1.1.0   | 2026-03-14 | Added performance test (test:perf), MONGO_URI/MONGODB_* and PERF_KEEP_DATA, performance test summary and rate-limit note. |
| 1.0.0   | 2026-03-14 | Initial versioned release. Prerequisites, configuration, run commands (test, test:login, test:session), session test summary, debugging PUT /session 400. |
