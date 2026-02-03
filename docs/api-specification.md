# Ekklesia Budget Module — API Specification

---

| Field              | Detail                         |
|--------------------|--------------------------------|
| **Document Title** | API Specification              |
| **Version**        | 0.5.0                          |
| **Created**        | February 3, 2026               |
| **Last Revised**   | February 4, 2026               |
| **Companion Doc**  | Ekklesia Integration Plan      |
| **Prepared By**    | Adam Dean · adam@crypto2099.io |
| **Status**         | Draft                          |

---

## 1. Purpose & Scope

This document is the API Specification for the Ekklesia Budget Module. It provides a complete catalogue of every public
and authenticated endpoint, covering request/response contracts, status codes, pagination, and error handling.

Together with the companion Ekklesia Integration Plan, these two documents form the authoritative reference for the
Budget Module's API surface and should be kept up to date as the module evolves.

---

## 2. Conventions & Notation

- **`{budget_id}` / `{proposal_id}`** – Path parameters represented as UUIDs or opaque identifiers issued by the
  backend.
- **DRep identifiers** – All `drep_id` values use the `drep1…` bech32 encoding defined by CIP-0509.
- **Base URL** – All paths below are relative to a versioned base, e.g. `https://api.ekklesia.io/v1`.
- All responses return **JSON**.
- All timestamps use **ISO 8601 (UTC)**.
- Monetary amounts are represented as **unsigned integers** in the smallest currency unit to avoid floating-point
  issues.

---

## 3. Public (Read) Endpoints

No authentication is required for the endpoints in this section. Rate limiting applies to all public endpoints (
see [Section 7](#7-rate-limiting--caching)).

---

### 3.1 `GET /budgets`

Returns a paginated list of all budget cycles that the Budget Module is currently tracking.

#### Query Parameters

| Parameter | Type    | Default | Description                                  |
|-----------|---------|---------|----------------------------------------------|
| `page`    | integer | `1`     | Page index (1-based).                        |
| `limit`   | integer | `20`    | Items per page. Max 100.                     |
| `status`  | string  | —       | Filter by budget cycle status if applicable. |

#### Success Response — `200 OK`

```json
{
  "data": [
    {
      "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "title": "Cardano Governance Budget – Q1 2026",
      "status": "open",
      "created_at": "2026-01-15T10:00:00Z",
      "updated_at": "2026-01-20T14:30:00Z"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 3
  }
}
```

> **Note:** The set of categories eligible for a given budget cycle is defined by`GET /budgets/{budget_id}/categories` (
> §3.2). Proposals and filters for that budget are scoped to that set.

---

### 3.2 `GET /budgets/{budget_id}/categories`

Returns the full list of categories defined for a specific budget cycle. This is the single source of truth for valid
category values — clients should fetch and cache this response for the lifetime of the budget cycle.

#### Path Parameters

| Parameter   | Type          | Required | Description                     |
|-------------|---------------|----------|---------------------------------|
| `budget_id` | string (UUID) | Yes      | Identifier of the budget cycle. |

#### Success Response — `200 OK`

```json
{
  "data": [
    {
      "id": "cat-a1b2c3d4-e5f6-7890-abcd-000000000001",
      "value": "core-infrastructure",
      "name": "Core Infrastructure",
      "description": "Projects that maintain or improve the foundational technical layer of the Cardano network.",
      "sort_order": 1
    },
    {
      "id": "cat-a1b2c3d4-e5f6-7890-abcd-000000000002",
      "value": "developer-ecosystem",
      "name": "Developer Ecosystem",
      "description": "Tools, SDKs, documentation, and programmes that support third-party development on Cardano.",
      "sort_order": 2
    },
    {
      "id": "cat-a1b2c3d4-e5f6-7890-abcd-000000000003",
      "value": "community-outreach",
      "name": "Community & Outreach",
      "description": "Initiatives that grow engagement, governance participation, and awareness within the Cardano community.",
      "sort_order": 3
    },
    {
      "id": "cat-a1b2c3d4-e5f6-7890-abcd-000000000004",
      "value": "research-standards",
      "name": "Research & Standards",
      "description": "Academic research, protocol-level R&D, and CIP development work.",
      "sort_order": 4
    },
    {
      "id": "cat-a1b2c3d4-e5f6-7890-abcd-000000000005",
      "value": "marketing-adoption",
      "name": "Marketing & Adoption",
      "description": "Campaigns and partnerships aimed at broadening the reach and adoption of Cardano.",
      "sort_order": 5
    }
  ]
}
```

> **Note:** Responses from this endpoint are intended to be cached client-side for the lifetime of the budget cycle. The
`updated_at` field on the parent budget object can be used to detect when a cache invalidation is warranted. The
`sort_order` field dictates the canonical display order in the UI.

---

### 3.3 `GET /proposals/{budget_id}`

Returns a paginated list of all **Live** proposals for a given budget cycle. Draft and withdrawn proposals are excluded
for unauthenticated callers.

#### Path Parameters

| Parameter   | Type          | Required | Description                     |
|-------------|---------------|----------|---------------------------------|
| `budget_id` | string (UUID) | Yes      | Identifier of the budget cycle. |

#### Query Parameters

| Parameter    | Type     | Default | Description                                                                                                                          |
|--------------|----------|---------|--------------------------------------------------------------------------------------------------------------------------------------|
| `page`       | integer  | `1`     | Page index (1-based).                                                                                                                |
| `limit`      | integer  | `20`    | Items per page. Max 100.                                                                                                             |
| `search`     | string   | —       | Free-text search across title, proposer name, and summary.                                                                           |
| `status`     | string   | —       | Filter: `Live` \| `Withdrawn`. Admins may also use `Draft`.                                                                          |
| `category`   | string[] | —       | Multi-select filter (comma-separated). Valid values are the `value` fields returned by `GET /budgets/{budget_id}/categories` (§3.2). |
| `sort_by`    | string   | —       | Sort field: `title` \| `budget` \| `submitted_at` \| `status`.                                                                       |
| `sort_order` | string   | `asc`   | `asc` \| `desc`.                                                                                                                     |

#### Success Response — `200 OK`

```json
{
  "data": [
    {
      "id": "uuid",
      "budget_id": "uuid",
      "title": "string",
      "status": "Draft|Live|Withdrawn by Proposer|Withdrawn by Admin",
      "proposer": {
        "name": "string",
        "wallet_address": "string"
      },
      "total_budget": 0,
      "category_id": "cat-a1b2c3d4-e5f6-7890-abcd-000000000001",
      "submitted_at": "ISO 8601"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 47
  }
}
```

> **Note:** The `status` field is always present, but the set of visible statuses differs by the caller's role —
> see [Section 6](#6-role-based-visibility-rules).

---

### 3.4 `GET /proposals/{budget_id}/{proposal_id}`

Returns the full detail of a single proposal, including budget line items and all narrative fields.

#### Success Response — `200 OK`

```json
{
  "data": {
    "id": "uuid",
    "budget_id": "uuid",
    "title": "string",
    "status": "string",
    "proposer": {
      "name": "string",
      "wallet_address": "string"
    },
    "associated_dreps": [
      "drep1qyv8n2...k4m7p"
    ],
    "contact": "string",
    "total_budget": 0,
    "category_id": "cat-a1b2c3d4-e5f6-7890-abcd-000000000001",
    "line_items": [
      {
        "description": "string",
        "amount": 0,
        "justification": "string"
      }
    ],
    "executive_summary": "string",
    "problem_statement": "string",
    "proposed_solution": "string",
    "expected_outcomes": "string",
    "kpis": "string",
    "attachments": [
      "url"
    ],
    "submitted_at": "ISO 8601",
    "updated_at": "ISO 8601"
  }
}
```

---

### 3.5 `GET /proposals/{budget_id}/{proposal_id}/comments`

Returns the threaded comment list for a proposal. The response is a flat list of top-level comments; each comment may
contain a nested `replies` array.

#### Query Parameters

| Parameter | Type    | Default | Description              |
|-----------|---------|---------|--------------------------|
| `page`    | integer | `1`     | Page index (1-based).    |
| `limit`   | integer | `50`    | Items per page. Max 200. |

#### Success Response — `200 OK`

```json
{
  "data": [
    {
      "id": "c1a2b3c4-d5e6-7890-abcd-ef1234567890",
      "author": {
        "author_type": "drep",
        "drep_id": "drep1qyv8n2...k4m7p",
        "wallet_address": null
      },
      "body": "The KPI targets in line item 3 need clearer measurement criteria before this can move to review.",
      "created_at": "2026-02-10T14:22:08Z",
      "replies": [
        {
          "id": "a2b3c4d5-e6f7-8901-bcde-f12345678901",
          "author": {
            "author_type": "proposer",
            "drep_id": null,
            "wallet_address": "addr1qz7k...m4p1"
          },
          "body": "Agreed — I will revise the KPI section to include quarterly checkpoints and a reporting cadence. Will update by end of week.",
          "created_at": "2026-02-10T16:05:41Z",
          "replies": []
        },
        {
          "id": "d4e5f6a7-b8c9-0123-efab-234567890abc",
          "author": {
            "author_type": "admin",
            "drep_id": null,
            "wallet_address": "addr1qr9m...w6x3"
          },
          "body": "Flagging this thread for review — the KPI revision should be tracked before the proposal moves to Live.",
          "created_at": "2026-02-10T17:41:12Z",
          "replies": []
        }
      ]
    }
  ],
  "meta": {
    "page": 1,
    "limit": 50,
    "total": 23
  }
}
```

> **Note:** `wallet_address` is `null` when a DRep authenticates via DRep credentials without a linked wallet. `drep_id`
> is `null` for all non-DRep author types. The UI should badge comments based on `author_type`.

---

## 4. Authentication Endpoints

The endpoint in this section is unauthenticated — it is the first step in the challenge-response flow and is how clients
obtain a nonce before they can sign anything. It is stateful (it creates and stores server-side state) but does not
itself require a credential. See the companion Integration Plan §4 for the full sequence.

---

### 4.1 `POST /auth/nonce`

Issues a fresh, single-use nonce bound to the provided identifier. The client signs this nonce and submits the signature
against a write endpoint (see §5).

#### Request Body

| Field             | Type   | Required | Description                                                                                                                                        |
|-------------------|--------|----------|----------------------------------------------------------------------------------------------------------------------------------------------------|
| `identifier_type` | string | Yes      | The type of identity the caller will authenticate as. Must be `wallet` or `drep`.                                                                  |
| `identifier`      | string | Yes      | The actual identifier: a Cardano wallet address when `identifier_type` is `wallet`, or a `drep1…` bech32 DRep ID when `identifier_type` is `drep`. |

#### Success Response — `200 OK`

```json
{
  "data": {
    "nonce": "a3f8d2e1b4c9f0a7d6e5b8c1a2f3d4e5",
    "expires_at": "2026-02-11T09:23:33Z"
  }
}
```

> **Note:** Nonces are single-use and valid for exactly 5 minutes from issuance. The client must sign and submit the
> nonce before `expires_at` or request a new one. This endpoint is rate-limited —
> see [Section 7](#7-rate-limiting--caching).

---

## 5. Authenticated (Write) Endpoints

The endpoint below requires a valid authentication credential (see the companion Integration Plan for the full auth
flows). Two schemes are supported, selected by the `Authorization` header:

**Wallet-signature auth** — used by Proposers, Admins, and any DRep who authenticates via a linked wallet:

```
Authorization: Signature <wallet_address>:<signature>:<nonce>
```

**DRep-credential auth** — used by DReps who authenticate via their DRep credentials without a linked wallet:

```
Authorization: DRep <drep_id>:<signature>:<nonce>
```

> **Note:** In both cases the nonce must have been issued by the Budget Module within the preceding 5 minutes. See
> Integration Plan §4 for the full challenge-response sequence.

---

### 5.1 `POST /proposals/{proposal_id}/comment`

Creates a new top-level comment or a threaded reply on a Live proposal.

#### Request Body

| Field       | Type           | Default    | Description                                                       |
|-------------|----------------|------------|-------------------------------------------------------------------|
| `body`      | string         | *required* | Comment text (plaintext, max 4 000 characters).                   |
| `parent_id` | string \| null | `null`     | If non-null, this comment is a reply to the specified comment ID. |

#### Success Response — `201 Created`

```json
{
  "data": {
    "id": "b3c4d5e6-f7a8-9012-cdef-123456789012",
    "author": {
      "author_type": "drep",
      "drep_id": "drep1qyv8n2...k4m7p",
      "wallet_address": null
    },
    "body": "Requesting clarification on the funding timeline for line item 2.",
    "parent_id": null,
    "created_at": "2026-02-11T09:18:33Z"
  }
}
```

---

## 6. Role-Based Visibility Rules

The API enforces access at the data layer, not only in the UI. The table below defines which proposal statuses each role
can observe through the read endpoints.

| Role                     | Draft | Live | Withdrawn (Proposer) | Withdrawn (Admin) |
|--------------------------|-------|------|----------------------|-------------------|
| Proposer (own proposals) | ✓     | ✓    | ✓                    | ✓                 |
| Proposer (others')       | —     | ✓    | —                    | —                 |
| DRep                     | —     | ✓    | ✓                    | ✓                 |
| Viewer                   | —     | ✓    | ✓                    | ✓                 |
| Admin                    | ✓     | ✓    | ✓                    | ✓                 |

> **"—"** indicates the status is filtered out of API responses for that role.

---

## 7. Rate Limiting & Caching

| Endpoint Group                        | Limit                   | Notes                                                                                            |
|---------------------------------------|-------------------------|--------------------------------------------------------------------------------------------------|
| Public read endpoints                 | 200 req / min per IP    | Responses cached at CDN for 30 s.                                                                |
| `GET /budgets/{budget_id}/categories` | 200 req / min per IP    | Cached at CDN for 5 min. Clients should also cache locally for the lifetime of the budget cycle. |
| `POST /auth/nonce`                    | 20 req / min per IP     | No cache. Protects against nonce-flooding.                                                       |
| `POST /comment`                       | 10 req / min per wallet | No cache.                                                                                        |

Responses that exceed the rate limit return **HTTP 429** with a `Retry-After` header.

---

## 8. Error Responses

All error responses share a common envelope. `code` is a machine-readable constant; `message` is a human-readable
explanation intended for logging or display. `retry_after` is included only where applicable.

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable explanation.",
    "retry_after": null
  }
}
```

The table below is a quick-reference index. A full example for every code follows immediately after.

| HTTP Status | Code                      | When                                                                                         |
|-------------|---------------------------|----------------------------------------------------------------------------------------------|
| 400         | `INVALID_QUERY_PARAM`     | A query-string parameter has an unrecognised or out-of-range value.                          |
| 400         | `INVALID_REQUEST_BODY`    | The JSON body is malformed or missing a required field.                                      |
| 400         | `COMMENT_TOO_LONG`        | Comment `body` exceeds the 4 000-character limit.                                            |
| 400         | `INVALID_IDENTIFIER_TYPE` | The `identifier_type` in a nonce request is not `wallet` or `drep`.                          |
| 401         | `MISSING_SIGNATURE`       | The `Authorization` header is absent on a write endpoint.                                    |
| 401         | `INVALID_SIGNATURE`       | The submitted signature does not verify against the nonce and wallet.                        |
| 401         | `NONCE_EXPIRED`           | The nonce referenced in the signature has passed its 5-minute TTL.                           |
| 403         | `INSUFFICIENT_ROLE`       | The authenticated user's role does not permit this action.                                   |
| 403         | `PROPOSAL_NOT_EDITABLE`   | The proposal is in a terminal state (e.g. already withdrawn) and cannot be acted upon.       |
| 404         | `BUDGET_NOT_FOUND`        | No budget cycle exists with the given `budget_id`.                                           |
| 404         | `PROPOSAL_NOT_FOUND`      | No proposal exists with the given `proposal_id`, or it is not visible to the caller.         |
| 404         | `CATEGORY_NOT_FOUND`      | A `category` filter value does not match any category in the budget's `eligible_categories`. |
| 429         | `RATE_LIMIT_EXCEEDED`     | The caller has exceeded the per-endpoint rate limit. Honour the `Retry-After` header.        |
| 500         | `INTERNAL_ERROR`          | An unexpected server-side failure. Retry after a short delay.                                |

### 8.1 Full Examples

#### 400 — `INVALID_QUERY_PARAM`

```json
{
  "error": {
    "code": "INVALID_QUERY_PARAM",
    "message": "Query parameter 'limit' must be an integer between 1 and 100. Received: 'abc'."
  }
}
```

#### 400 — `INVALID_REQUEST_BODY`

```json
{
  "error": {
    "code": "INVALID_REQUEST_BODY",
    "message": "Required field 'body' is missing from the request payload."
  }
}
```

#### 400 — `COMMENT_TOO_LONG`

```json
{
  "error": {
    "code": "COMMENT_TOO_LONG",
    "message": "Comment body is 4 203 characters. Maximum allowed is 4 000."
  }
}
```

#### 400 — `INVALID_IDENTIFIER_TYPE`

```json
{
  "error": {
    "code": "INVALID_IDENTIFIER_TYPE",
    "message": "identifier_type must be 'wallet' or 'drep'. Received: 'dao'."
  }
}
```

#### 401 — `MISSING_SIGNATURE`

```json
{
  "error": {
    "code": "MISSING_SIGNATURE",
    "message": "The Authorization header is required for this endpoint. Use either 'Signature <wallet_address>:<signature>:<nonce>' or 'DRep <drep_id>:<signature>:<nonce>'."
  }
}
```

#### 401 — `INVALID_SIGNATURE`

```json
{
  "error": {
    "code": "INVALID_SIGNATURE",
    "message": "Signature verification failed. The signature does not match the nonce for the provided identifier."
  }
}
```

#### 401 — `NONCE_EXPIRED`

```json
{
  "error": {
    "code": "NONCE_EXPIRED",
    "message": "The nonce has expired. Nonces are valid for 5 minutes. Please request a new nonce and re-sign."
  }
}
```

#### 403 — `INSUFFICIENT_ROLE`

```json
{
  "error": {
    "code": "INSUFFICIENT_ROLE",
    "message": "Your current role (Viewer) does not have permission to perform this action. DRep or Admin access is required."
  }
}
```

#### 403 — `PROPOSAL_NOT_EDITABLE`

```json
{
  "error": {
    "code": "PROPOSAL_NOT_EDITABLE",
    "message": "Proposal b3c4d5e6-f7a8-9012-cdef-123456789012 is in state 'Withdrawn by Admin' and cannot be modified."
  }
}
```

#### 404 — `BUDGET_NOT_FOUND`

```json
{
  "error": {
    "code": "BUDGET_NOT_FOUND",
    "message": "No budget cycle exists with id 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'."
  }
}
```

#### 404 — `PROPOSAL_NOT_FOUND`

```json
{
  "error": {
    "code": "PROPOSAL_NOT_FOUND",
    "message": "No proposal exists with id 'b3c4d5e6-f7a8-9012-cdef-123456789012', or it is not visible to your role."
  }
}
```

#### 404 — `CATEGORY_NOT_FOUND`

```json
{
  "error": {
    "code": "CATEGORY_NOT_FOUND",
    "message": "Category value 'invalid-cat' does not exist in budget a1b2c3d4-e5f6-7890-abcd-ef1234567890. Fetch GET /budgets/{budget_id}/categories for the current set."
  }
}
```

#### 429 — `RATE_LIMIT_EXCEEDED`

```json
{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Rate limit for POST /comment exceeded (10 req/min). Please wait before retrying.",
    "retry_after": 34
  }
}
```

#### 500 — `INTERNAL_ERROR`

```json
{
  "error": {
    "code": "INTERNAL_ERROR",
    "message": "An unexpected error occurred. Please try again shortly. If the problem persists, contact support."
  }
}
```

---

## Revision History

Versioning follows [Semantic Versioning 2.0.0](https://semver.org). While the document remains in `0.x.x`, minor
versions indicate new or restructured sections and patch versions indicate corrections or clarifications with no change
to substance.

| Version | Date       | Author    | Changes                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
|---------|------------|-----------|----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| 0.5.0   | 2026-02-04 | Adam Dean | Added §4 Authentication Endpoints with `POST /auth/nonce` — issues a single-use nonce bound to a `wallet` or `drep` identifier, returning `nonce` and `expires_at`. Renumbered former §4–§7 to §5–§8. Added `POST /auth/nonce` rate-limit row (20 req/min per IP) to §7. Added `INVALID_IDENTIFIER_TYPE` error code to §8 index and §8.1 examples. Fixed duplicate section divider between §3 and §4; added missing divider between §4 and §5.                                                                                                                                                                                                                                                                 |
| 0.4.0   | 2026-02-04 | Adam Dean | DRep IDs converted to `drep1…` bech32 across all examples (§3.4 `associated_dreps`, §3.5 comments, §4.1 POST comment). Author objects now use consistent field order (`author_type`, `drep_id`, `wallet_address`); `wallet_address` is `null` for DRep-credential-authenticated authors, `drep_id` is `null` for non-DRep types. Added Admin author example in §3.5 comments (removed the previous admin-note-only treatment). Added `DRep` credential auth scheme to §4 header alongside existing `Signature` scheme. Expanded §7 from a single-example envelope to a full catalogue: 13 error codes with an index table and a complete JSON example for each (§7.1). Added `drep1…` bech32 convention to §2. |
| 0.3.0   | 2026-02-04 | Adam Dean | Added `GET /budgets/{budget_id}/categories` (§3.2) as the single source of truth for per-budget category definitions. Removed `eligible_categories` from `GET /budgets`. Changed `category` to `category_id` on proposal list (§3.3) and detail (§3.4) responses. Updated §3.3 category filter to reference §3.2. Added dedicated caching row in §6 rate-limit table. Renumbered §3.3–§3.5.                                                                                                                                                                                                                                                                                                                    |
| 0.2.0   | 2026-02-04 | Adam Dean | Added `eligible_categories` array to `GET /budgets` response (§3.1). Each budget cycle now self-describes its valid categories. Updated §3.2 `category` filter description to reference the parent budget's `eligible_categories` as the source of valid values.                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| 0.1.4   | 2026-02-04 | Adam Dean | Removed all internal-facing metadata: Milestone badge, Related Doc, Prepared For, and SOW references from Status. Added Companion Doc row.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| 0.1.3   | 2026-02-04 | Adam Dean | Rewrote §1 intro to remove SOW/milestone-specific framing so the document reads as a standalone public-repo reference.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| 0.1.2   | 2026-02-04 | Adam Dean | Removed `POST /subscribe` endpoint (out of scope per SOW v1.1). Removed corresponding rate-limit row in §6. Updated §4 intro from "Both endpoints" to "The endpoint".                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| 0.1.1   | 2026-02-04 | Adam Dean | Expanded all JSON response examples to be fully documented. Removed all placeholder ellipsis; §3.2 meta, §3.4 comments (nested reply + meta), and §4.1 POST comment (author object) now use realistic example values.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| 0.1.0   | 2026-02-03 | Adam Dean | Initial draft. All public read endpoints (§3), authenticated write endpoints (§4), role-based visibility rules (§5), rate limiting (§6), and error codes (§7) defined.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |