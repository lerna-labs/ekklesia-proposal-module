# Session API – complete test plan

| Field       | Value   |
|------------|---------|
| **Version** | 1.0.0   |
| **Last revised** | 2026-03-14 |

Single source of truth for session-related API tests. Covers session endpoints, access with/without login, and all security concerns (wrong signature, expired token, replay, rate limits, Bearer auth, etc.).

**Base URL:** `API_BASE_URL` from env (default `http://localhost:3000/api/v0`).  
**Helpers:** [__testkit/helpers/session.js](../helpers/session.js) – `login(apiBaseUrl, options?)`, `logout(apiBaseUrl, cookieHeader)`.

---

## 1. Session endpoint behavior

### 1.1 POST /session (request nonce)

| Case | Request | Expected |
|------|---------|----------|
| Valid body | `{ signerAddress, signType: "drep" }` with valid DRep (e.g. from `keys/drep01_jag/drep_id.txt`) | **200**; body has `dataHex`, `userId` (string) |
| Missing signerAddress | Body without `signerAddress` | **400**; message indicates missing signerAddress |
| Missing signType | Body without `signType` | **400** |
| Invalid address | Invalid or non-DRep address | **400** |
| Invalid signType | Valid address but `signType: "admin"` or `signType: ""` | **400** (e.g. "Invalid signer type" or "Invalid address format") |

### 1.2 PUT /session (verify signature, issue JWT)

| Case | Request | Expected |
|------|---------|----------|
| Valid | After POST, sign `dataHex` with cardano-signer, PUT with correct `signerAddress`, `signType`, `signature` (COSE), `scriptAddress: ""` | **200**; `Set-Cookie` present; body has `token`, `expiresIn`, `userId` |
| Wrong/tampered signature | Same flow but signature bits flipped or from another key/nonce | **400**; "Authentication failed…" |
| Signature for different nonce | Sign a different string than `dataHex`, send with same signerAddress | **400** |
| Missing signature | PUT with signerAddress, signType but no or empty `signature` | **400** |
| **Nonce replay** | After successful PUT (login), send second PUT with same `signerAddress`, `signType`, `signature` | **400** (nonce already consumed) |
| **Stale nonce** | POST to get dataHex, wait >5 min (or use short TTL in test env), then sign and PUT | **400** (optional: skip in fast CI or run in nightly) |
| **Signer/signature binding** | POST as DRep A, sign with A’s key, PUT with same signature but `signerAddress` set to different valid DRep B | **400** (requires two key sets or second DRep address) |
| **Invalid signType** | Valid signature but `signType: "admin"` or invalid value | **400** |

### 1.3 GET /session (require auth)

| Case | Request | Expected |
|------|---------|----------|
| With valid cookie | After `login()`, GET with `Cookie: session.cookieHeader` | **200**; body has `userId`, optional `name`, optional `adminVoteIds` |
| No cookie | GET with no Cookie and no Authorization | **401** (e.g. "No token provided") |
| Expired token | Cookie (or Bearer) with JWT signed with same `JWT_SECRET`, `exp` in past | **401**; "Token has expired" |
| Invalid/tampered token | Cookie (or Bearer) with garbage or modified JWT | **401**; "Invalid token" |
| **Bearer token** | GET with `Authorization: Bearer <valid_jwt>` (no cookie) | **200**; same payload as with cookie |

### 1.4 DELETE /session (logout, require auth)

| Case | Request | Expected |
|------|---------|----------|
| With valid cookie | After login, DELETE with session cookie | **200**; body `status: "success"`, message contains logout |
| No cookie | DELETE with no auth | **401** |
| With expired token | Expired JWT in cookie or Bearer | **401** |
| **Bearer token** | DELETE with `Authorization: Bearer <valid_jwt>` | **200** |

---

## 2. Rate limiting (security)

| Case | Request | Expected |
|------|---------|----------|
| POST /session over limit | More than 5 POST `/session` in 1 minute (same IP) | **429**; message like "Too many nonce requests" |
| PUT /session over limit | More than 10 PUT `/session` in 1 minute (same IP) | **429**; message like "Too many authentication attempts" |

Run in dedicated describe block; may be slow or excluded in fast CI.

---

## 3. Access to data with and without login

| Case | Request | Expected |
|------|---------|----------|
| Public reads, no auth | GET `/countries`, GET `/votes`, GET `/votes/:voteId`, GET `/proposals` (no cookie) | **200** |
| GET /session without cookie | GET `/session` no auth | **401** |
| GET /session with valid cookie | GET `/session` with cookie from login | **200** |
| POST /proposals without auth | POST `/proposals` with valid body, no cookie | **401** ("Authentication required") |
| POST /proposals with auth | POST `/proposals` with login cookie and valid body | **201** or **400** (validation); not 401 |
| Optional: own proposals | GET `/proposals?proposer=<userId>` with auth | **200** (may include draft/archived for own) |

---

## 4. Optional / environment-dependent

| Case | Request | Expected |
|------|---------|----------|
| **DRep registration** | If unregistered DRep key set or Koios mock: POST then PUT with valid signature for that DRep | **400**; "DRep is not registered or validation failed" |
| **Cookie attributes** | After successful login, parse `Set-Cookie` | Contains `HttpOnly`; in production also `Secure`, `SameSite` |

---

## 5. Implementation notes

- **Expired JWT:** Use `jsonwebtoken` in testkit: sign with `process.env.JWT_SECRET` (must match backend), `exp` in past. Document in README that `JWT_SECRET` must be set for expired-token tests.
- **Wrong-signature PUT:** Tamper COSE hex (e.g. change last chars of `COSE_Sign1_hex`) or use signature from another key.
- **Helpers:** Add `createExpiredToken(userId, signType)` in `__testkit/helpers` (uses `JWT_SECRET`). Optionally `requestSession(apiBaseUrl, cookieHeader)` for GET/DELETE.
- **Dependency:** Add `jsonwebtoken` to `__testkit/package.json` for generating expired/invalid tokens.
- **File layout:** One file e.g. `__testkit/tests/session.test.js` with nested `describe` blocks: POST /session, PUT /session, GET /session, DELETE /session, Rate limiting, Access with/without login, Bearer token, Optional.

---

## 6. Test case checklist (all items)

- [ ] POST /session – valid body → 200, dataHex, userId  
- [ ] POST /session – missing signerAddress → 400  
- [ ] POST /session – missing signType → 400  
- [ ] POST /session – invalid address → 400  
- [ ] POST /session – invalid signType → 400  
- [ ] PUT /session – valid signature (full flow) → 200, Set-Cookie, token  
- [ ] PUT /session – wrong/tampered signature → 400  
- [ ] PUT /session – missing signature → 400  
- [ ] PUT /session – signature for different nonce → 400  
- [ ] PUT /session – nonce replay (second PUT same signature) → 400  
- [ ] PUT /session – stale nonce (after TTL) → 400  
- [ ] PUT /session – signer/signature binding (wrong signerAddress) → 400  
- [ ] PUT /session – invalid signType → 400  
- [ ] GET /session – with valid cookie → 200, userId, name, adminVoteIds  
- [ ] GET /session – no cookie → 401  
- [ ] GET /session – expired token → 401  
- [ ] GET /session – invalid token → 401  
- [ ] GET /session – Bearer token → 200  
- [ ] DELETE /session – with valid cookie → 200, success  
- [ ] DELETE /session – no cookie → 401  
- [ ] DELETE /session – expired token → 401  
- [ ] DELETE /session – Bearer token → 200  
- [ ] Rate limit – POST /session over 5/min → 429  
- [ ] Rate limit – PUT /session over 10/min → 429  
- [ ] Public data – GET /countries, /votes, /proposals without auth → 200  
- [ ] Protected – POST /proposals without auth → 401  
- [ ] Protected – POST /proposals with auth → not 401  
- [ ] Optional: DRep not registered → 400  
- [ ] Optional: Set-Cookie has HttpOnly (and Secure/SameSite in prod)

---

## Changes

| Version | Date       | Description |
|---------|------------|-------------|
| 1.0.0   | 2026-03-14 | Initial versioned release. Session endpoint behavior (POST/PUT/GET/DELETE), rate limiting, access with/without login, optional cases, implementation notes, full test case checklist. |
