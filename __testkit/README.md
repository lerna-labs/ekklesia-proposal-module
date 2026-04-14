# Testkit

| Field | Value |
|-------|--------|
| **Version** | 1.2.0 |
| **Last revised** | 2026-04-13 |

HTTP and integration tests for the Ekklesia Proposal Module API.

## What runs here

| Script | File | Purpose |
|--------|------|---------|
| `test:login` | `tests/login.test.js` | DRep sign-in (`keys/drep02_w9c`) and stake sign-in (`keys/stake_43wf`); GET /session, sign-out, 401 |
| `test:session:ratelimit` | `tests/session-rate-limit.test.js` | Session endpoint limits: POST (6th), PUT (11th), GET (61st), DELETE (21st) return 429 |
| `test:permissions` | `tests/proposal-permissions.test.js` | Permission checks across proposals and comments: draft visibility, draft update denial, proposal/comment withdraw denial, and comment edit denial for non-proposer/non-admin |
| `test:window:rules` | `tests/window-rules.test.js` | Vote time-window enforcement and error-message checks (submission/review/feedback) across proposals/comments |
| `test:comment:ratelimit` | `tests/comment-rate-limit.test.js` | 6th POST /comments in a window returns 429 (5/min per user) |
| `test:public:ratelimit` | `tests/z-public-rate-limit.test.js` | 201st GET on public read returns 429 (200/min per IP); `z-` prefix sorts it last in `npm test` |
| `test:perf:smoke` | `tests/performance/timing.test.js` | Latency smoke for GET/POST comments |
| `test:perf` | `tests/performance.test.js`, `tests/performance/timing.test.js` | Performance suite (public GET timings + timing smoke) |

`npm test` runs **all** of the above **in band** (one file after another) so shared rate limits behave predictably; the public read limiter test is named `z-*.test.js` so it runs after perf and timing. You can still run heavy scripts alone when debugging.

Shared seed: one vote with slug **`ekklesia-testkit`** (`helpers/testkitConstants.js`) and 20k proposals via `npm run seed:perf`. Older setups used slug `perf-test-20k`; that document is no longer created automatically—delete it in Mongo if it is obsolete.

## Prerequisites

- **Backend** at `API_BASE_URL` (default `http://localhost:3000/api/v0`).
- **cardano-signer** on `PATH` — see [docs/cardano-signer.md](docs/cardano-signer.md).
- **Stake keys** in `keys/stake_<suffix>/` (DRep fixtures may use names like `drep02_w9c`) with `id.txt` (stake/DRep bech32 id) and `skey.json`. Default login uses `stake_43wf`; the “other user” in permission/window tests uses `drep02_w9c`. Override with `TESTKIT_DEFAULT_STAKE_KEYS` / `TESTKIT_OTHER_STAKE_KEYS`. Legacy `drep_id.txt` + `drep.skey` are still supported. Accounts must be registered so the backend can validate signing.
- **Testnet stake** (`stake_test1…` in `id.txt`): `session.js` passes `cardano-signer --testnet-magic` using a built-in default (Preview). For Preprod keys, change `DEFAULT_TESTNET_MAGIC_FOR_STAKE_TEST1` in `helpers/session.js` to `1`. Mainnet stake (`stake1…`) does not use `--testnet-magic`.

## Configuration

Copy `.env.example` to `.env`.

- `API_BASE_URL` — API base URL (no trailing slash).
- **Performance discovery:** `PERF_VOTE_ID` and `PERF_PROPOSAL_ID` (optional; otherwise the perf test loads the vote by slug `ekklesia-testkit`).
- **MongoDB (seed only):** `MONGO_URI` or `MONGODB_HOST`, `MONGODB_PORT`, `MONGODB_DATABASE` (same DB as the running API).

## Run tests

From `__testkit`:

```bash
npm test                      # all tests
npm run test:login
npm run test:session:ratelimit
npm run test:permissions
npm run test:window:rules     # requires TESTKIT_TREASURY_HASH
npm run test:perf             # full performance suite (benchmark + timing smoke)
npm run test:perf:smoke       # timing smoke only
npm run test:public:ratelimit # 201 GETs → 429; API only
npm run test:comment:ratelimit
npm run seed:perf             # vote + 20k proposals; prints PERF_* ids
npm run seed:perf:teardown
```

Disable step logs: `TESTKIT_LOG=0 npm test`.

For `test:window:rules` (and the treasury-hash permission test), set `TESTKIT_TREASURY_HASH` in `.env` (or legacy `TESTKIT_TREASURY_DONATION_TX_HASH`), and `TESTKIT_TREASURY_DONATION_USER` to the stake bech32 that matches `keys/<folder>/id.txt` for the signing keys used on submit.

### Debugging PUT /session (400)

1. Run the backend with visible logs.
2. Run `npm run test:login`.
3. Check `id.txt` matches `skey.json` (or legacy `drep_id.txt` / `drep.skey`).

---

## Changes

| Version | Date | Description |
|---------|------|-------------|
| 1.2.0 | 2026-04-13 | Shared vote slug `ekklesia-testkit`, helpers `testkitMongo` / `testVote`, slim perf matrix, login-only auth smoke, public + comment rate-limit tests, timing smoke; removed session suite and loadRoutes test. |
| 1.1.0 | 2026-03-14 | Performance test and seed scripts. |
| 1.0.0 | 2026-03-14 | Initial release. |
