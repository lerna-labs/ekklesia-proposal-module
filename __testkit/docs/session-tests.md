# Session tests – documentation

| Field           | Value     |
|-----------------|-----------|
| **Version**     | 1.0.0     |
| **Last revised**| 2026-03-14|

This document describes the session-related tests in the testkit: what they cover, how to run them, and how they relate to the API and the test plan.

## Overview

Session tests check the Proposal Module API’s authentication and session behaviour: nonce request, signature verification, JWT/cookie handling, and access to protected and public endpoints. They assume a running backend and use the [cardano-signer](cardano-signer.md) CLI with DRep keys under `__testkit/keys/`.

**Related docs**

- [Session test plan](session-test-plan.md) – Full checklist and expected outcomes.
- [Login flow](../../docs/login-flow.md) – Backend/frontend login flow.
- [API specification](../../docs/api-specification.md) – Session and auth endpoints.

---

## Test files

| File | Purpose |
|------|--------|
| **tests/login.test.js** | Single smoke test: login → GET session → logout → GET session returns 401. Uses step logging when `TESTKIT_LOG` is not disabled. |
| **tests/session.test.js** | Full session suite: all cases from the [session test plan](session-test-plan.md) (POST/PUT/GET/DELETE, replay, Bearer, rate limits, access, optional). |

Helpers live in **helpers/session.js**: `login`, `logout`, `readDrepId`, `requestNonceAndSign`, `signWithKeys`, `createExpiredToken`.

---

## Prerequisites

1. **Backend** running and reachable at `API_BASE_URL` (default `http://localhost:3000/api/v0`).
2. **cardano-signer** on `PATH`. Used to sign the nonce in CIP-30 (COSE) mode. See [cardano-signer.md](cardano-signer.md).
3. **DRep key sets** in `__testkit/keys/`:
   - **drep01_jag** – Used for most logins and session tests. Must be registered (backend validates via Koios).
   - **drep02_w9c** – Used for the “signer/signature binding” test (claim B, signature from A). Must exist; registration only required if that DRep is used to log in.
4. Each key set must contain:
   - `drep_id.txt` – Bech32 DRep ID (e.g. `drep1...`).
   - `drep.skey` – Secret key for signing.

---

## Configuration

Copy `.env.example` to `.env` in `__testkit` and set:

| Variable | Required | Description |
|----------|----------|-------------|
| **API_BASE_URL** | No | API base URL, no trailing slash. Default: `http://localhost:3000/api/v0`. |
| **JWT_SECRET** | For expired-token tests | Must match the backend’s `JWT_SECRET`. If unset, GET/DELETE “expired token” tests skip and log a warning. |

Optional: `TESTKIT_LOG=0` to disable step-by-step logging in the login test.

---

## Running the tests

From the `__testkit` directory:

```bash
npm test              # run all tests (login + session)
npm run test:login    # run only tests/login.test.js
npm run test:session  # run only tests/session.test.js
```

Examples with logging disabled:

```bash
TESTKIT_LOG=0 npm test
TESTKIT_LOG=0 npm run test:session
```

---

## What the session suite covers (session.test.js)

The suite is grouped by `describe` blocks. Each block maps to the [session test plan](session-test-plan.md).

### POST /session

- Valid body (`signerAddress`, `signType: "drep"`) → 200, `dataHex`, `userId`.
- Missing `signerAddress` → 400.
- Missing `signType` → 400.
- Invalid address → 400.
- Invalid `signType` (e.g. `"admin"`) → 400.

### PUT /session

- Valid signature (POST → sign with cardano-signer → PUT) → 200, `Set-Cookie`, `token`, `expiresIn`, `userId`.
- Wrong or tampered signature → 400.
- Signature of a different nonce → 400.
- Missing `signature` → 400.
- **Nonce replay**: second PUT with same signature → 400.
- **Signer/signature binding**: signature from DRep A, `signerAddress` set to DRep B → 400 (uses drep01 and drep02 keys).
- Invalid `signType` on PUT → 400.
- **Stale nonce**: skipped by default (would require waiting >5 min or a server with shorter nonce TTL).

### GET /session

- Valid cookie (after login) → 200, `userId`, optional `name`, optional `adminVoteIds`.
- No cookie or Authorization → 401.
- Expired token (cookie) → 401 (skipped if `JWT_SECRET` is not set).
- Invalid/tampered token → 401.
- Valid token in `Authorization: Bearer <token>` (no cookie) → 200.

### DELETE /session

- Valid cookie → 200, `status: "success"`, message contains logout.
- No cookie → 401.
- Expired token → 401 (skipped if `JWT_SECRET` is not set).
- Valid token in `Authorization: Bearer <token>` → 200.

### Rate limiting

- **POST /session**: more than 5 requests in 1 minute → 429, message like “Too many nonce requests”. Test has a 70s timeout.
- **PUT /session**: test is skipped (hitting the limit would require 11 PUTs, each needing a nonce from POST, but POST is limited to 5/min).

### Access with/without login

- **Public, no auth**: GET `/countries`, GET `/votes`, GET `/votes/:voteId`, GET `/proposals` → 200 (votes/proposals may be empty).
- GET `/session` without cookie → 401.
- GET `/session` with valid cookie → 200.
- POST `/proposals` without auth → 401.
- POST `/proposals` with auth (cookie) → not 401 (201 or 400 depending on validation).
- GET `/proposals?proposer=<userId>` with auth → 200.

Tests that need at least one vote in the DB (e.g. GET `/votes/:voteId`, POST `/proposals` with auth) skip with a warning when there are no votes.

### Optional

- **Set-Cookie** after successful PUT /session contains `HttpOnly`.
- **Unregistered DRep**: test is skipped; enable when you have a key set for an unregistered DRep or a Koios mock (expect 400 “not registered” or “validation failed”).

---

## Skipped and conditional tests

| Test | Condition | Reason |
|------|-----------|--------|
| GET/DELETE with expired token | `JWT_SECRET` set in env | Expired JWT must be signed with the same secret as the backend. |
| Stale nonce (PUT after TTL) | Always skipped | Would require >5 min wait or custom server TTL. |
| PUT /session rate limit (10/min) | Always skipped | Would need 11 POSTs in 1 min; POST is limited to 5/min. |
| Unregistered DRep | Always skipped | Needs unregistered key set or mock; remove skip to run. |
| GET /votes/:voteId, POST /proposals with auth | At least one vote in DB | Skip with warning if `votes` list is empty. |

---

## Helpers (helpers/session.js)

| Helper | Description |
|--------|-------------|
| `login(apiBaseUrl, options?)` | Full login: POST → sign → PUT. Returns `{ cookieHeader, userId, token, expiresIn }`. Options: `keysDir`, `signType`. |
| `logout(apiBaseUrl, cookieHeader)` | DELETE /session with the given cookie. |
| `readDrepId(keysDir?)` | Read DRep ID from `keysDir/drep_id.txt`. |
| `requestNonceAndSign(apiBaseUrl, options?)` | POST /session and sign the nonce. Returns `{ signerAddress, signType, signature }` for use in PUT (e.g. replay or tampering tests). |
| `signWithKeys(dataHex, keysDir?)` | Sign arbitrary `dataHex` with the key set in `keysDir` (for “wrong nonce” test). |
| `createExpiredToken(userId, signType?)` | Build a JWT with past expiry. Requires `JWT_SECRET` in env. |

---

## Troubleshooting

**PUT /session returns 400**

- Ensure the backend is running and its console is visible. Re-run the test and check backend logs for signature or nonce errors.
- Confirm `drep_id.txt` matches the key in `drep.skey` (same key set). Regenerate the DRep ID with cardano-signer if needed.
- For “signer/signature binding”, both key sets (drep01_jag, drep02_w9c) must exist.

**Expired-token tests are skipped**

- Set `JWT_SECRET` in `__testkit/.env` to the same value as the backend. Restart or re-run the test.

**Rate limit test (POST) fails or is flaky**

- The test sends 6+ POSTs in a row; the 6th should get 429. If the backend rate limit window was already used by other tests, wait about a minute and run only the session suite: `npm run test:session`.

**No votes in DB**

- GET `/votes/:voteId` and “POST /proposals with auth” will skip with a warning. Seed the database with at least one vote if you want these to run.

---

## Changes

| Version | Date       | Description |
|---------|------------|-------------|
| 1.0.0   | 2026-03-14 | Initial versioned release. Overview, test files, prerequisites, configuration, run commands, session suite coverage by describe block, skipped/conditional tests, helpers table, troubleshooting. |
