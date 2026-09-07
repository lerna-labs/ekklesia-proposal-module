# Ekklesia Proposal Module — API Specification

---

| Field              | Detail                                                                 |
|--------------------|------------------------------------------------------------------------|
| **Document Title** | API Specification                                                      |
| **Version**        | 1.4.1                                                                  |
| **Created**        | February 3, 2026                                                       |
| **Last Revised**   | September 7, 2026                                                      |
| **Companion Doc**  | [System Architecture Specification](system-architecture.md)            |
| **Prepared By**    | Adam Dean · <adam@crypto2099.io>, Mad Orkestra · <mad@madorkestra.com> |
| **Status**         | Draft                                                                  |

---

## Table of Contents

[//]: # (@formatter:off)
- [Ekklesia Proposal Module — API Specification](#ekklesia-proposal-module--api-specification)
  - [Table of Contents](#table-of-contents)
  - [1. Purpose \& Scope](#1-purpose--scope)
  - [2. Conventions \& Notation](#2-conventions--notation)
  - [3. Public (Read) Endpoints](#3-public-read-endpoints)
    - [3.1 `GET /votes`](#31-get-votes)
      - [Query Parameters](#query-parameters)
      - [Success Response — `200 OK`](#success-response--200-ok)
      - [Error Response — `404 Not Found`](#error-response--404-not-found)
    - [3.2 `GET /votes/{identifier}`](#32-get-votesidentifier)
      - [Path Parameters](#path-parameters)
      - [Success Response — `200 OK`](#success-response--200-ok-1)
      - [Error Response — `400 Bad Request`](#error-response--400-bad-request)
      - [Error Response — `404 Not Found`](#error-response--404-not-found-1)
    - [3.3 `GET /votes/{voteId}/categories`](#33-get-votesvoteidcategories)
      - [Path Parameters](#path-parameters-1)
      - [Success Response — `200 OK`](#success-response--200-ok-2)
      - [Error Response — `400 Bad Request`](#error-response--400-bad-request-1)
      - [Error Response — `404 Not Found`](#error-response--404-not-found-2)
    - [3.4 `GET /proposals`](#34-get-proposals)
      - [Access by role](#access-by-role)
      - [Query Parameters](#query-parameters-1)
      - [Success Response — `200 OK`](#success-response--200-ok-3)
      - [Error Response — `400 Bad Request`](#error-response--400-bad-request-2)
      - [Error Response — `404 Not Found`](#error-response--404-not-found-3)
    - [3.5 `GET /proposals/{proposalId}`](#35-get-proposalsproposalid)
      - [Access by role](#access-by-role-1)
      - [Path Parameters](#path-parameters-2)
      - [Success Response — `200 OK`](#success-response--200-ok-4)
      - [Error Response — `400 Bad Request`](#error-response--400-bad-request-3)
      - [Error Response — `403 Forbidden`](#error-response--403-forbidden)
      - [Error Response — `404 Not Found`](#error-response--404-not-found-4)
    - [3.6 `GET /comments`](#36-get-comments)
      - [Access by role](#access-by-role-2)
      - [Query Parameters](#query-parameters-2)
      - [Success Response — `200 OK`](#success-response--200-ok-5)
      - [Error Response — `400 Bad Request`](#error-response--400-bad-request-4)
      - [Error Response — `404 Not Found`](#error-response--404-not-found-5)
    - [3.7 `GET /comments/{commentId}`](#37-get-commentscommentid)
      - [Access by role](#access-by-role-3)
      - [Path Parameters](#path-parameters-3)
      - [Query Parameters](#query-parameters-3)
      - [Success Response — `200 OK`](#success-response--200-ok-6)
      - [Error Response — `400 Bad Request`](#error-response--400-bad-request-5)
      - [Error Response — `404 Not Found`](#error-response--404-not-found-6)
    - [3.8 `GET /comments/{commentId}/replies`](#38-get-commentscommentidreplies)
      - [Access by role](#access-by-role-4)
      - [Path Parameters](#path-parameters-4)
      - [Query Parameters](#query-parameters-4)
      - [Success Response — `200 OK`](#success-response--200-ok-7)
      - [Error Response — `400 Bad Request`](#error-response--400-bad-request-6)
      - [Error Response — `404 Not Found`](#error-response--404-not-found-7)
  - [4. Authentication Endpoints](#4-authentication-endpoints)
    - [4.1 `POST /session`](#41-post-session)
      - [Request Body](#request-body)
      - [Success Response — `200 OK`](#success-response--200-ok-8)
      - [Error Response — `400 Bad Request`](#error-response--400-bad-request-7)
      - [Error Response — `500 Internal Server Error`](#error-response--500-internal-server-error)
      - [Error Response — `429 Too Many Requests`](#error-response--429-too-many-requests)
    - [4.2 `PUT /session`](#42-put-session)
      - [Request Body](#request-body-1)
      - [Success Response — `200 OK`](#success-response--200-ok-9)
      - [Error Response — `400 Bad Request`](#error-response--400-bad-request-8)
      - [Error Response — `500 Internal Server Error`](#error-response--500-internal-server-error-1)
      - [Error Response — `429 Too Many Requests`](#error-response--429-too-many-requests-1)
    - [4.3 `GET /session`](#43-get-session)
      - [Headers](#headers)
      - [Success Response — `200 OK`](#success-response--200-ok-10)
      - [Error Response — `401 Unauthorized`](#error-response--401-unauthorized)
    - [4.4 `DELETE /session`](#44-delete-session)
      - [Headers](#headers-1)
      - [Success Response — `200 OK`](#success-response--200-ok-11)
      - [Error Response — `401 Unauthorized`](#error-response--401-unauthorized-1)
  - [5. Authenticated (Write) Endpoints](#5-authenticated-write-endpoints)
    - [5.1 `POST /proposals`](#51-post-proposals)
      - [Headers](#headers-2)
      - [Request Body](#request-body-2)
      - [Success Response — `201 Created`](#success-response--201-created)
      - [Error Response — `400 Bad Request`](#error-response--400-bad-request-9)
      - [Error Response — `401 Unauthorized`](#error-response--401-unauthorized-2)
      - [Error Response — `503 Service Unavailable`](#error-response--503-service-unavailable)
      - [Error Response — `500 Internal Server Error`](#error-response--500-internal-server-error-2)
    - [5.2 `PUT /proposals/{proposalId}`](#52-put-proposalsproposalid)
      - [Headers](#headers-3)
      - [Path Parameters](#path-parameters-5)
      - [Request Body](#request-body-3)
      - [Success Response — `200 OK`](#success-response--200-ok-12)
      - [Error Response — `400 Bad Request`](#error-response--400-bad-request-10)
      - [Error Response — `401 Unauthorized`](#error-response--401-unauthorized-3)
      - [Error Response — `403 Forbidden`](#error-response--403-forbidden-1)
      - [Error Response — `404 Not Found`](#error-response--404-not-found-8)
      - [Error Response — `409 Conflict`](#error-response--409-conflict)
      - [Error Response — `503 Service Unavailable`](#error-response--503-service-unavailable-1)
      - [Error Response — `500 Internal Server Error`](#error-response--500-internal-server-error-3)
    - [5.3 `PUT /proposals/{proposalId}/withdraw`](#53-put-proposalsproposalidwithdraw)
      - [Headers](#headers-4)
      - [Path Parameters](#path-parameters-6)
      - [Request Body](#request-body-4)
      - [Success Response — `200 OK`](#success-response--200-ok-13)
      - [Error Response — `400 Bad Request`](#error-response--400-bad-request-11)
      - [Error Response — `401 Unauthorized`](#error-response--401-unauthorized-4)
      - [Error Response — `403 Forbidden`](#error-response--403-forbidden-2)
      - [Error Response — `404 Not Found`](#error-response--404-not-found-9)
      - [Error Response — `500 Internal Server Error`](#error-response--500-internal-server-error-4)
    - [5.4 `DELETE /proposals/{proposalId}`](#54-delete-proposalsproposalid)
      - [Headers](#headers-5)
      - [Path Parameters](#path-parameters-7)
      - [Success Response — `200 OK`](#success-response--200-ok-14)
      - [Error Response — `400 Bad Request`](#error-response--400-bad-request-12)
      - [Error Response — `401 Unauthorized`](#error-response--401-unauthorized-5)
      - [Error Response — `403 Forbidden`](#error-response--403-forbidden-3)
      - [Error Response — `404 Not Found`](#error-response--404-not-found-10)
      - [Error Response — `500 Internal Server Error`](#error-response--500-internal-server-error-5)
    - [5.5 `POST /comments`](#55-post-comments)
      - [Headers](#headers-6)
      - [Request Body](#request-body-5)
      - [Success Response — `201 Created`](#success-response--201-created-1)
      - [Error Response — `400 Bad Request`](#error-response--400-bad-request-13)
      - [Error Response — `401 Unauthorized`, `403 Forbidden`, `404 Not Found`, `500 Internal Server Error`](#error-response--401-unauthorized-403-forbidden-404-not-found-500-internal-server-error)
    - [5.6 `PUT /comments/{commentId}`](#56-put-commentscommentid)
      - [Headers](#headers-7)
      - [Path Parameters](#path-parameters-8)
      - [Request Body](#request-body-6)
      - [Success Response — `200 OK`](#success-response--200-ok-15)
      - [Error Response — `400 Bad Request`](#error-response--400-bad-request-14)
      - [Error Response — `401 Unauthorized`, `403 Forbidden`, `404 Not Found`, `500 Internal Server Error`](#error-response--401-unauthorized-403-forbidden-404-not-found-500-internal-server-error-1)
    - [5.7 `POST /comments/{commentId}/like`](#57-post-commentscommentidlike)
      - [Headers](#headers-8)
      - [Path Parameters](#path-parameters-9)
      - [Request Body](#request-body-7)
      - [Success Response — `200 OK` or `201 Created`](#success-response--200-ok-or-201-created)
      - [Error Response — `400 Bad Request`](#error-response--400-bad-request-15)
      - [Error Response — `401 Unauthorized`, `404 Not Found`, `500 Internal Server Error`](#error-response--401-unauthorized-404-not-found-500-internal-server-error)
    - [5.8 `PUT /comments/{commentId}/withdraw`](#58-put-commentscommentidwithdraw)
      - [Headers](#headers-9)
      - [Path Parameters](#path-parameters-10)
      - [Request Body](#request-body-8)
      - [Success Response — `200 OK`](#success-response--200-ok-16)
      - [Error Response — `400 Bad Request`](#error-response--400-bad-request-16)
      - [Error Response — `401 Unauthorized`, `403 Forbidden`, `404 Not Found`, `500 Internal Server Error`](#error-response--401-unauthorized-403-forbidden-404-not-found-500-internal-server-error-2)
    - [5.9 Notification settings](#59-notification-settings)
      - [5.9.1 `GET /notifications`](#591-get-notifications)
        - [Success Response — `200 OK`](#success-response--200-ok-17)
      - [5.9.2 `PUT /notifications`](#592-put-notifications)
        - [Request Body](#request-body-9)
        - [Success Response — `200 OK`](#success-response--200-ok-18)
        - [Error Response — `400 Bad Request`](#error-response--400-bad-request-17)
        - [Error Response — `409 Conflict`](#error-response--409-conflict-1)
      - [5.9.3 `DELETE /notifications/pending`](#593-delete-notificationspending)
        - [Error Response — `400 Bad Request`](#error-response--400-bad-request-18)
      - [5.9.4 `POST /notifications/resend`](#594-post-notificationsresend)
        - [Success Response — `200 OK`](#success-response--200-ok-19)
        - [Error Response — `400 Bad Request`](#error-response--400-bad-request-19)
      - [5.9.5 `POST /notifications/verify`](#595-post-notificationsverify)
        - [Request Body](#request-body-10)
        - [Success Response — `200 OK`](#success-response--200-ok-20)
        - [Error Response — `400 Bad Request`](#error-response--400-bad-request-20)
      - [5.9.6 `POST /notifications/unsubscribe`](#596-post-notificationsunsubscribe)
        - [Request Body](#request-body-11)
        - [Success Response — `200 OK`](#success-response--200-ok-21)
        - [Error Response — `400 Bad Request`](#error-response--400-bad-request-21)
  - [6. Rate Limiting \& Caching](#6-rate-limiting--caching)
  - [7. Error Responses](#7-error-responses)
    - [7.1 Response format](#71-response-format)
    - [7.2 HTTP status codes](#72-http-status-codes)
  - [Revision History](#revision-history)

---
[//]: # (@formatter:on)

## 1. Purpose & Scope

This document is the API Specification for the Ekklesia Proposal Module. It
provides a complete catalogue of every public and authenticated endpoint,
covering status codes, pagination, and error handling.

This document is the authoritative reference for the Proposal Module's API
surface and should be kept up to date as the module evolves. The module is
standalone (independent auth, database, and session store from the Voting
Module).

---

## 2. Conventions & Notation

- **`{voteId}` / `{proposalId}`** – Path parameters represented as MongoDB
  ObjectIds (24-character hexadecimal strings).
- **`_id` fields** – All `_id` fields in responses are MongoDB ObjectIds (
  24-character hexadecimal strings).
- **DRep identifiers** – All `drep_id` values use the `drep1…` Bech32 encoding
  defined by CIP-0509.
- **Admin addresses** – All `admins` array entries are Bech32 Cardano stake
  addresses (`stake1…`).
- **Base URL** – All paths below are relative to a versioned base, e.g.
  `https://domain.tld/api/v0`.
- **Requests** – Request bodies must be `Content-Type: application/json`. The
  API returns JSON; clients may send `Accept: application/json`.
- **Responses** – All responses return **JSON**.
- **Pagination** – All paginated list endpoints use the same `meta` shape:
  `page`, `limit`, `total`, `totalPages`, `hasNextPage`, `hasPreviousPage`. The
  list of items is in the `data` array.
- All timestamps use **ISO 8601 (UTC)**.
- Monetary amounts are represented as **unsigned integers** in the smallest
  currency unit to avoid floating-point issues.

---

## 3. Public (Read) Endpoints

The endpoints in this section are publicly accessible and do not require
authentication. However, some endpoints provide enhanced functionality or access
to additional data when the caller is authenticated. This section includes
information about authentication roles and how they affect endpoint behavior.

**Authentication Roles:**

- **Public** — Unauthenticated users. Access is limited to publicly visible
  data (e.g., `live` and `withdrawn` proposals/comments).
- **Proposer** — Authenticated users who own proposals. Can access their own
  proposals in all statuses (`live`, `withdrawn`, `draft`, `archived`).
- **Admin** — Authenticated users whose address is in a vote's `vote.admins`
  array. Can access draft proposals and manage comments for their vote.

Rate limiting applies to all public endpoints (see
[Section 6](#6-rate-limiting--caching)).

---

### 3.1 `GET /votes`

Returns a paginated list of all vote cycles that the Proposal Module is
currently tracking. Supports searching by title (case-insensitive partial match)
or `_id` (exact match), and filtering by slug (case-sensitive exact match).

#### Query Parameters

| Parameter | Type    | Default | Description                                                                            |
|-----------|---------|---------|----------------------------------------------------------------------------------------|
| `page`    | integer | `1`     | Page index (1-based).                                                                  |
| `limit`   | integer | `10`    | Items per page. Max 100.                                                               |
| `search`  | string  | —       | Search term to match against title (partial, case-insensitive) or `_id` (exact match). |
| `slug`    | string  | —       | Filter by slug (exact, case-sensitive match).                                          |

#### Success Response — `200 OK`

```json
{
  "data": [
    {
      "_id": "a1b2c3d4e5f67890abcdef12",
      "title": "Cardano Governance Budget – Q1 2026",
      "categories": [
        {
          "_id": "a1b2c3d4e5f67890abcdef13",
          "title": "Core Infrastructure",
          "description": "Projects that maintain or improve the foundational technical layer of the Cardano network."
        },
        {
          "_id": "a1b2c3d4e5f67890abcdef14",
          "title": "Developer Ecosystem",
          "description": "Tools, SDKs, documentation, and programmes that support third-party development on Cardano."
        }
      ],
      "description": "Budget cycle for Q1 2026 governance proposals",
      "slug": "cardano-governance-budget-q1-2026",
      "admins": [
        "stake1ux7k...m4p1",
        "stake1ur9m...w6x3"
      ],
      "submissionStartDate": "2026-01-15T10:00:00Z",
      "submissionEndDate": "2026-02-15T23:59:59Z",
      "feedbackStartDate": "2026-02-16T00:00:00Z",
      "feedbackEndDate": "2026-03-15T23:59:59Z",
      "reviewStartDate": "2026-03-16T00:00:00Z",
      "reviewEndDate": "2026-04-15T23:59:59Z",
      "createdAt": "2026-01-10T08:00:00Z",
      "updatedAt": "2026-01-20T14:30:00Z"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 25,
    "totalPages": 3,
    "hasNextPage": true,
    "hasPreviousPage": false
  }
}
```

> **Note:** Category details for a vote are available via
> `GET /votes/{voteId}/categories` (§3.3). Proposals and filters for that vote
> are scoped to that set.

#### Error Response — `404 Not Found`

Returned when `search` or `slug` parameters are provided but no matching votes
are found.

```json
{
  "status": "error",
  "message": "No votes found matching the provided criteria"
}
```

---

### 3.2 `GET /votes/{identifier}`

Returns a single vote cycle. The {identifier} path segment accepts either a
MongoDB ObjectId or a slug — the server resolves which lookup to perform based
on the shape of the value:

- If the value is a valid 24-character hexadecimal string, it is treated as a
  MongoDB ObjectId and looked up via `_id`.
- Otherwise, it is treated as a slug and looked up via the `slug` field
  (case-sensitive exact match).

Both lookups return the same response shape. This mirrors the behavior of the
`slug` query parameter on `GET /votes` (§3.1), but allows the identifier to be
expressed directly in the path, which is more convenient for client-side
navigation where the slug is already in the URL.

#### Path Parameters

| Parameter    | Type                      | Required | Description                                                                                                                                               |
|--------------|---------------------------|----------|-----------------------------------------------------------------------------------------------------------------------------------------------------------|
| `identifier` | string (ObjectId or Slug) | Yes      | Either a MongoDB ObjectId (24-character hexadecimal string) to look up by `_id`, or any other string to look up as a `slug` (case-sensitive exact match). |

#### Success Response — `200 OK`

```json
{
  "_id": "a1b2c3d4e5f67890abcdef12",
  "title": "Cardano Governance Budget – Q1 2026",
  "description": "Budget cycle for Q1 2026 governance proposals",
  "slug": "cardano-governance-budget-q1-2026",
  "admins": [
    "stake1ux7k...m4p1",
    "stake1ur9m...w6x3"
  ],
  "categories": [
    {
      "_id": "a1b2c3d4e5f67890abcdef13",
      "title": "Core Infrastructure",
      "description": "Projects that maintain or improve the foundational technical layer of the Cardano network."
    },
    {
      "_id": "a1b2c3d4e5f67890abcdef14",
      "title": "Developer Ecosystem",
      "description": "Tools, SDKs, documentation, and programmes that support third-party development on Cardano."
    }
  ],
  "submissionStartDate": "2026-01-15T10:00:00Z",
  "submissionEndDate": "2026-02-15T23:59:59Z",
  "feedbackStartDate": "2026-02-16T00:00:00Z",
  "feedbackEndDate": "2026-03-15T23:59:59Z",
  "reviewStartDate": "2026-03-16T00:00:00Z",
  "reviewEndDate": "2026-04-15T23:59:59Z",
  "createdAt": "2026-01-10T08:00:00Z",
  "updatedAt": "2026-01-20T14:30:00Z"
}
```

> **Note:** Categories for this vote are available via
`GET /votes/{voteId}/categories` (§3.3).

#### Error Response — `400 Bad Request`

Returned only when the identifier is a well-formed 24-character hexadecimal
string (i.e., recognized as an ObjectId attempt) but fails ObjectId validation.
A plain slug string that finds no match returns `404 Not Found`, not `400`.

```json
{
  "status": "error",
  "message": "Invalid voteId parameter. Must be a valid ObjectId."
}
```

#### Error Response — `404 Not Found`

Returned when no vote exists with the provided ObjectId or slug.

```json
{
  "status": "error",
  "message": "Vote not found"
}
```

---

### 3.3 `GET /votes/{voteId}/categories`

Returns the full list of categories defined for a specific vote cycle. This is
the single source of truth for valid category values — clients should fetch and
cache this response for the lifetime of the vote cycle.

#### Path Parameters

| Parameter | Type              | Required | Description                                                           |
|-----------|-------------------|----------|-----------------------------------------------------------------------|
| `voteId`  | string (ObjectId) | Yes      | MongoDB ObjectId of the vote cycle (24-character hexadecimal string). |

#### Success Response — `200 OK`

```json
{
  "data": [
    {
      "_id": "a1b2c3d4e5f67890abcdef13",
      "title": "Core Infrastructure",
      "description": "Projects that maintain or improve the foundational technical layer of the Cardano network.",
      "metaData": {
        "pillar": "Technical Infrastructure",
        "pillarDescription": "Core technical systems and protocols",
        "highLevelThematicArea": "Network Operations",
        "descriptionStrategy": "Focus on scalability and reliability",
        "expectedEnhancement": "Improved network performance",
        "kpis": [
          "Network uptime > 99.9%",
          "Transaction throughput > 1000 TPS"
        ]
      }
    },
    {
      "_id": "a1b2c3d4e5f67890abcdef14",
      "title": "Developer Ecosystem",
      "description": "Tools, SDKs, documentation, and programmes that support third-party development on Cardano.",
      "metaData": {
        "pillar": "Developer Tools",
        "pillarDescription": "Resources for building on Cardano",
        "highLevelThematicArea": "Developer Experience",
        "descriptionStrategy": "Focus on developer onboarding and tooling",
        "expectedEnhancement": "Increased developer adoption",
        "kpis": [
          "Number of active developers",
          "Documentation page views"
        ]
      }
    }
  ]
}
```

> **Note:** Responses from this endpoint are intended to be cached client-side
> for the lifetime of the vote cycle. The `updatedAt` field on the parent vote
> object (available via `GET /votes/{voteId}`) can be used to detect when a
> cache invalidation is warranted. Categories are returned sorted by their
> `sortOrder` field in ascending order, which dictates the canonical display
> order in the UI.

#### Error Response — `400 Bad Request`

Returned when the `voteId` parameter is not a valid MongoDB ObjectId.

```json
{
  "status": "error",
  "message": "Invalid voteId parameter. Must be a valid ObjectId."
}
```

#### Error Response — `404 Not Found`

Returned when no vote exists with the provided `voteId`.

```json
{
  "status": "error",
  "message": "Vote not found"
}
```

---

### 3.4 `GET /proposals`

Returns a paginated list of proposals. Visibility depends on whether the request
is unauthenticated or authenticated and on the caller's role. By default, this
returns proposals from all votes.

#### Access by role

| Role         | Allowed proposal statuses                      | Notes                                                                                                                                                                    |
|--------------|------------------------------------------------|--------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| **Public**   | `live`, `withdrawn`                            | Default. No authentication. Use `status` to filter by `live` or `withdrawn`.                                                                                             |
| **Proposer** | All (`live`, `withdrawn`, `draft`, `archived`) | When authenticated and `proposer` query param matches the authenticated user's ID. Default (no `status` param) returns all statuses for own proposals.                   |
| **Admin**    | `live`, `withdrawn`, `draft` (for their vote)  | When authenticated and the user's address (JWT) is in the vote's `vote.admins` array. Must set `vote` and `status=draft` to see draft proposals; default is `live` only. |

List responses include a shortened `metaData` object containing only
`strategicFocusArea` (category ObjectId), `proposalType`, and `initiativeType`;
full `metaData` is available only from `GET /proposals/{proposalId}`.

#### Query Parameters

| Parameter        | Type    | Default | Description                                                                                                                                                                                                                                                                                                                                                                                                |
|------------------|---------|---------|------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `page`           | integer | `1`     | Page index (1-based).                                                                                                                                                                                                                                                                                                                                                                                      |
| `limit`          | integer | `10`    | Items per page. Max 100.                                                                                                                                                                                                                                                                                                                                                                                   |
| `vote`           | string  | —       | Filter by vote cycle (exact match, must be valid ObjectId). If provided, only returns proposals for the specified vote.                                                                                                                                                                                                                                                                                    |
| `category`       | string  | —       | Filter by category (exact match, accepts multiple comma-separated Category ObjectIds). Filters proposals where `metaData.strategicFocusArea` matches any of the provided Category ObjectIds. Valid values are MongoDB ObjectIds from the Category schema.                                                                                                                                                  |
| `proposalType`   | string  | —       | Filter by proposal type (exact match). Valid values: `Technical (software/IT)`, `Non-technical`.                                                                                                                                                                                                                                                                                                           |
| `initiativeType` | string  | —       | Filter by initiative type (exact match). Valid values: `New Initiative`, `Maintenance`.                                                                                                                                                                                                                                                                                                                    |
| `proposer`       | string  | —       | Filter by proposer ID (exact match, must be valid User ObjectId). When authenticated and `proposer` matches the authenticated user's ID, all statuses (including `draft`, `archived`) can be returned; use `status` to filter.                                                                                                                                                                             |
| `status`         | string  | `live`  | Filter by proposal status. Single value or comma-separated: `live`, `withdrawn` (withdrawn includes both `withdrawnByProposer` and `withdrawnByAdmin`). For **vote admins** or when querying own proposals (`proposer` = authenticated user ID), `draft` may also be included (e.g. `status=live,withdrawn,draft`). Sending `status=draft` without being a vote admin or the proposal owner returns `400`. |
| `search`         | string  | —       | Search term to match against proposal `_id` (exact match), `title`, `summary`, or `metaData.contractingParty.legalEntityName` (partial, case-insensitive).                                                                                                                                                                                                                                                 |
| `sort`           | string  | `date`  | Sort field: `title`, `status`, `date` (submittedAt), `updatedAt`, or `totalBudget`. Case-insensitive.                                                                                                                                                                                                                                                                                                      |
| `direction`      | string  | `desc`  | Sort direction: `asc` or `desc`. Case-insensitive.                                                                                                                                                                                                                                                                                                                                                         |

#### Success Response — `200 OK`

```json
{
  "data": [
    {
      "_id": "b1c2d3e4f5a67890bcdef123",
      "voteId": "a1b2c3d4e5f67890abcdef12",
      "title": "Cardano Node Performance Optimization",
      "summary": "Improving node synchronization and transaction processing efficiency",
      "status": "live",
      "totalBudget": 50000000,
      "submittedAt": "2026-01-20T10:00:00Z",
      "createdAt": "2026-01-15T08:00:00Z",
      "updatedAt": "2026-01-20T10:00:00Z",
      "metaData": {
        "strategicFocusArea": "a1b2c3d4e5f67890abcdef13",
        "proposalType": "Technical (software/IT)",
        "initiativeType": "New Initiative"
      }
    }
  ],
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 47,
    "totalPages": 5,
    "hasNextPage": true,
    "hasPreviousPage": false
  }
}
```

> **Note:** By default, only proposals with `status = "live"` are returned. Use
> the `status` parameter to filter by `live` and/or `withdrawn` (withdrawn
> includes both `withdrawnByProposer` and `withdrawnByAdmin`). The `status`
> parameter accepts comma-separated values (e.g. `live,withdrawn`).
> **Vote admins** (authenticated user in the vote's `admins` array) or
> callers querying their own proposals (`proposer` = authenticated user ID) may
> also include `draft` in `status` (e.g. `status=live,withdrawn,draft`).
> Including `draft`without being a vote admin or the proposal owner returns
> `400 Bad Request`. When `vote` is provided, the endpoint validates that the
> vote exists and returns 404 if it doesn't.

#### Error Response — `400 Bad Request`

Returned when query parameters are invalid.

```json
{
  "status": "error",
  "message": "Invalid vote parameter. Must be a valid ObjectId."
}
```

Or when `category` parameter is invalid or category not found:

```json
{
  "status": "error",
  "message": "Invalid category parameter. The following categories were not found or do not belong to this vote: a1b2c3d4e5f67890abcdef99, b2c3d4e5f67890abcdef123"
}
```

Or when `category` parameter contains invalid ObjectIds:

```json
{
  "status": "error",
  "message": "Invalid category parameter. The following category IDs are not valid ObjectIds: invalid-id-1, invalid-id-2"
}
```

Or when `sort` parameter is invalid:

```json
{
  "status": "error",
  "message": "Invalid sort parameter. Must be one of: title, status, date, updatedAt, totalBudget."
}
```

Or when `direction` parameter is invalid:

```json
{
  "status": "error",
  "message": "Invalid direction parameter. Must be asc or desc."
}
```

Or when `status=draft` is sent by a caller who is neither a vote admin nor the
proposal owner (e.g. `proposer` not set or not matching the authenticated user):

```json
{
  "status": "error",
  "message": "Invalid status parameter. Draft proposals are only accessible to vote admins or the proposal owner."
}
```

Or when `proposer` parameter is invalid:

```json
{
  "status": "error",
  "message": "Invalid proposer parameter. Must be a valid ObjectId."
}
```

#### Error Response — `404 Not Found`

Returned when `vote` is provided but no vote exists with that ID.

```json
{
  "status": "error",
  "message": "Vote not found"
}
```

---

### 3.5 `GET /proposals/{proposalId}`

Returns the full data of a single proposal by its MongoDB ObjectId. Visibility
depends on the caller's role.

#### Access by role

| Role         | Can access proposal when                                                                                                                                |
|--------------|---------------------------------------------------------------------------------------------------------------------------------------------------------|
| **Public**   | Status is `live` or `withdrawn` (anyone).                                                                                                               |
| **Proposer** | Status is any (including `draft`, `archived`) when the authenticated user's ID matches the proposal's `proposerId`.                                     |
| **Admin**    | Status is `draft` when the authenticated user's address (JWT) is in that proposal's vote `admins` array; also has public access for `live`/`withdrawn`. |

If the proposal exists but the requester is not allowed to see it (e.g., draft
or archived and not the proposer or a vote admin), the server returns **403
Forbidden**. If no proposal exists with the given ID, the server returns **404
Not Found**.

#### Path Parameters

| Parameter    | Type   | Description                                |
|--------------|--------|--------------------------------------------|
| `proposalId` | string | MongoDB ObjectId of the proposal (24 hex). |

#### Success Response — `200 OK`

Full proposal document, including full `metaData` and category when available.
Category is included as a full category object (excluding `voteId`, `createdAt`,
`updatedAt`).

```json
{
  "_id": "b1c2d3e4f5a67890bcdef123",
  "voteId": "a1b2c3d4e5f67890abcdef12",
  "proposerId": "stake1ux4...",
  "title": "Cardano Node Performance Optimization",
  "summary": "Executive summary of the proposal.",
  "status": "live",
  "totalBudget": 50000000,
  "submittedAt": "2026-01-20T10:00:00Z",
  "metaData": {},
  "category": {
    "_id": "a1b2c3d4e5f67890abcdef13",
    "title": "Core Infrastructure",
    "description": "Projects that maintain or improve the foundational technical layer of the Cardano network.",
    "metaData": {
      "pillar": "Technical Infrastructure",
      "pillarDescription": "Core technical systems and protocols",
      "highLevelThematicArea": "Network Operations",
      "descriptionStrategy": "Focus on scalability and reliability",
      "expectedEnhancement": "Improved network performance",
      "kpis": [
        "Network uptime > 99.9%",
        "Transaction throughput > 1000 TPS"
      ]
    },
    "sortOrder": 1
  }
}
```

#### Error Response — `400 Bad Request`

Returned when `proposalId` is not a valid ObjectId.

```json
{
  "status": "error",
  "message": "Invalid proposalId parameter. Must be a valid ObjectId."
}
```

#### Error Response — `403 Forbidden`

Returned when a proposal exists with the given ID but the requester is not
allowed to see it (e.g., draft or archived and the requester is not the proposer
or a vote admin for that proposal's vote).

```json
{
  "status": "error",
  "message": "You do not have permission to view or edit this proposal."
}
```

#### Error Response — `404 Not Found`

Returned when no proposal exists with the given ID.

```json
{
  "status": "error",
  "message": "Proposal not found"
}
```

---

### 3.6 `GET /comments`

Returns a paginated list of **top-level comments** (where `parentId` is null)
for a specific proposal. The proposal is specified via the required query
parameter `proposal` (the proposal's MongoDB ObjectId). By default, only
**live** comments are returned; **admins** (authenticated user's address in the
proposal's vote `admins` array) can use the `status` parameter to filter by
`live`, `withdrawn`, or `withdrawnByAdmin`. Sort by `sort` (default `date`, i.e.
`createdAt`), `replyCount`, or `likeCount`, with `direction` `asc` or `desc`;
default is newest first (`direction=desc`). Each comment includes an `author`
object containing **only** `_id`, `name`, and `type` (the comment author's
public display fields; notification preferences, email addresses, unsubscribe
secrets, and other internal user fields are never included). `type` is
`"proposer"` if the author is the proposal's proposer, `"admin"` if the author
is in the vote's `admins` array, otherwise `"user"`. Each comment also includes
`replyCount` and `likeCount`. `proposalId`,
`status`, `parentId`, and `userId` are excluded from each comment.**Comment
authors** see `withdrawalDetails` (if present) for their own comments (e.g. when
withdrawn by admin).

#### Access by role

| Role       | Status filter                                                         | Notes                                                   |
|------------|-----------------------------------------------------------------------|---------------------------------------------------------|
| **Public** | Default `live` only. `status` parameter (if provided) must be `live`. |                                                         |
| **Author** | Default `live` only. Cannot use `status` parameter.                   | Sees `withdrawalDetails` for own comments when present. |
| **Admin**  | Can filter by `status`: `live` or `withdrawnByAdmin`.                 |                                                         |

#### Query Parameters

| Parameter   | Type    | Default | Description                                                                                          |
|-------------|---------|---------|------------------------------------------------------------------------------------------------------|
| `proposal`  | string  | —       | **Required.** Proposal ID (MongoDB ObjectId, 24 hex).                                                |
| `status`    | string  | `live`  | Comment status. Public and Authors: `live` only. Admins: `live`, `withdrawn`, or `withdrawnByAdmin`. |
| `sort`      | string  | `date`  | Sort field: `date` (sorts by `createdAt`), `replyCount`, or `likeCount`.                             |
| `direction` | string  | `desc`  | Sort direction: `asc` or `desc`.                                                                     |
| `page`      | integer | `1`     | Page index (1-based).                                                                                |
| `limit`     | integer | `10`    | Items per page. Max 100.                                                                             |

#### Success Response — `200 OK`

```json
{
  "data": [
    {
      "_id": "c1d2e3f4a5b67890cdef1234",
      "content": "This proposal aligns well with the roadmap.",
      "createdAt": "2026-01-22T14:00:00Z",
      "updatedAt": "2026-01-22T14:00:00Z",
      "replyCount": 3,
      "likeCount": 5,
      "author": {
        "_id": "a1b2c3d4e5f67890abcdef12",
        "name": "Alice",
        "type": "user"
      }
    }
  ],
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 24,
    "totalPages": 3,
    "hasNextPage": true,
    "hasPreviousPage": false
  }
}
```

#### Error Response — `400 Bad Request`

Returned when `proposal` is missing or not a valid ObjectId; when `status` is
invalid or used by non-admin (e.g., only admins can filter by non-live status);
when `sort` or `direction` are invalid; or when `page` or `limit` are invalid
(e.g., non-positive or limit > 100).

```json
{
  "status": "error",
  "message": "Missing proposal parameter."
}
```

Or when `proposal` is invalid:

```json
{
  "status": "error",
  "message": "Invalid proposal parameter. Must be a valid ObjectId."
}
```

Or when `sort` is invalid:

```json
{
  "status": "error",
  "message": "Invalid sort parameter. Must be: date, replyCount, or likeCount."
}
```

Or when `direction` is invalid:

```json
{
  "status": "error",
  "message": "Invalid direction parameter. Must be asc or desc."
}
```

Or when `status` is used by non-admin:

```json
{
  "status": "error",
  "message": "Only admins can filter comments by status other than live."
}
```

#### Error Response — `404 Not Found`

Returned when no proposal exists with the given ID.

```json
{
  "status": "error",
  "message": "Proposal not found"
}
```

---

### 3.7 `GET /comments/{commentId}`

Returns a single comment by its MongoDB ObjectId. **Public:** only comments with
`status` = `live` are returned. **Comment authors** (authenticated user's ID
matches the comment's `userId`) can retrieve their own comments in any status
and see `withdrawalDetails` (if present), but cannot use the `status` parameter.
**Admins** (authenticated user's address in the proposal's vote `admins`
array) can retrieve any comment by ID; optional `status` parameter can be used
to require the comment's status to match (`live`, `withdrawn`, or
`withdrawnByAdmin`). Response shape matches the comment objects in §3.6 (
includes `author` with `type`, `replyCount`, `likeCount`; excludes `proposalId`,
`status`, `parentId`, `userId`). **Comment authors** see `withdrawalDetails` for
their own comments.

#### Access by role

| Role       | Allowed                                                                                               |
|------------|-------------------------------------------------------------------------------------------------------|
| **Public** | Only live comments. Non-live returns 404.                                                             |
| **Author** | Own comments in any status. Sees `withdrawalDetails` for own comments. Cannot use `status` parameter. |
| **Admin**  | Any comment by ID. Optional `status` to require a matching status.                                    |

#### Path Parameters

| Parameter   | Type   | Description                               |
|-------------|--------|-------------------------------------------|
| `commentId` | string | MongoDB ObjectId of the comment (24 hex). |

#### Query Parameters

| Parameter | Type   | Default | Description                                                                                                                                         |
|-----------|--------|---------|-----------------------------------------------------------------------------------------------------------------------------------------------------|
| `status`  | string | —       | Optional. Admins only. Require comment status: `live`, `withdrawn`, or `withdrawnByAdmin`. If the comment's status does not match, 404 is returned. |

#### Success Response — `200 OK`

```json
{
  "_id": "c1d2e3f4a5b67890cdef1234",
  "content": "This proposal aligns well with the roadmap.",
  "createdAt": "2026-01-22T14:00:00Z",
  "updatedAt": "2026-01-22T14:00:00Z",
  "replyCount": 3,
  "likeCount": 5,
  "author": {
    "_id": "a1b2c3d4e5f67890abcdef12",
    "name": "Alice",
    "type": "user"
  }
}
```

#### Error Response — `400 Bad Request`

Returned when `commentId` is not a valid ObjectId.

```json
{
  "status": "error",
  "message": "Invalid commentId parameter. Must be a valid ObjectId."
}
```

#### Error Response — `404 Not Found`

Returned when no comment exists with the given ID, the comment is not live (and
requester is not admin or author), or the requested `status` does not match the
comment's status.

```json
{
  "status": "error",
  "message": "Comment not found"
}
```

> **Note:** When a comment author requests their own comment,
> `withdrawalDetails` (if present) is included in the response. Example:
>
> ```json
> {
>   "_id": "...",
>   "content": "...",
>   "withdrawalDetails": {
>     "category": "Spam",
>     "userId": "...",
>     "comment": "Reason for withdrawal",
>     "date": "2026-01-23T10:00:00Z"
>   }
> }
> ```

---

### 3.8 `GET /comments/{commentId}/replies`

Returns a paginated list of **replies** to a comment (comments where`parentId` =
`commentId`). Default is **live** replies only; **admins** (authenticated user's
address in the proposal's vote `admins` array) can use the `status`
parameter to filter by `live`, `withdrawn`, or `withdrawnByAdmin`. Ordered by
`createdAt` ascending (oldest first). Same response shape per reply as §3.6.
**Reply authors** see `withdrawalDetails` (if present) for their own replies.
The parent comment must exist and be live; otherwise 404 is returned.

#### Access by role

| Role       | Status filter                                                         | Notes                                                  |
|------------|-----------------------------------------------------------------------|--------------------------------------------------------|
| **Public** | Default `live` only. `status` parameter (if provided) must be `live`. |                                                        |
| **Author** | Default `live` only. Cannot use `status` parameter.                   | Sees `withdrawalDetails` for own replies when present. |
| **Admin**  | Can filter by `status`: `live` or `withdrawnByAdmin`.                 |                                                        |

#### Path Parameters

| Parameter   | Type   | Description                             |
|-------------|--------|-----------------------------------------|
| `commentId` | string | MongoDB ObjectId of the parent comment. |

#### Query Parameters

| Parameter | Type    | Default | Description                                                                                        |
|-----------|---------|---------|----------------------------------------------------------------------------------------------------|
| `status`  | string  | `live`  | Reply status. Public and Authors: `live` only. Admins: `live`, `withdrawn`, or `withdrawnByAdmin`. |
| `page`    | integer | `1`     | Page index (1-based).                                                                              |
| `limit`   | integer | `10`    | Items per page. Max 100.                                                                           |

#### Success Response — `200 OK`

```json
{
  "data": [
    {
      "_id": "d2e3f4a5b67890cdef12345",
      "content": "I agree with this point.",
      "createdAt": "2026-01-22T15:00:00Z",
      "updatedAt": "2026-01-22T15:00:00Z",
      "replyCount": 0,
      "likeCount": 1,
      "author": {
        "_id": "b2c3d4e5f67890abcdef123",
        "name": "Bob",
        "type": "user"
      }
    }
  ],
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 3,
    "totalPages": 1,
    "hasNextPage": false,
    "hasPreviousPage": false
  }
}
```

#### Error Response — `400 Bad Request`

Returned when `commentId` is not a valid ObjectId; when `status` is invalid or
used by non-admin; or when `page` or `limit` are invalid.

```json
{
  "status": "error",
  "message": "Invalid commentId parameter. Must be a valid ObjectId."
}
```

#### Error Response — `404 Not Found`

Returned when no comment exists with the given ID or the parent comment is not
live.

```json
{
  "status": "error",
  "message": "Comment not found"
}
```

---

## 4. Authentication Endpoints

> **Note:** All endpoints in this section are relative to the base path
> `/api/v0`. For example, `POST /session` refers to `POST /api/v0/session`.

The endpoints in this section handle authentication and session management. They
use a challenge-response flow where clients first request a nonce, sign it, and
then submit the signature to get a JWT token. The token is stored in an
HTTP-only cookie for later authenticated requests.

**Security Features:**

- **CSRF Protection**: HTTP-only cookies with `SameSite=Strict` in production
  provide protection against Cross-Site Request Forgery (CSRF) attacks
- **Rate Limiting**: Authentication endpoints are rate-limited to prevent brute
  force and nonce flooding attacks
- **Nonce Expiration**: Nonce expire after five minutes and are single-use only
- **Session Cleanup**: Old sessions are automatically cleaned up after one hour

The `userId` field returned by these endpoints can be one of the following
Cardano identifier types:

- **Cardano Bech32 stake address** (`stake1...`) — for standard wallet
  authentication
- **CIP-0129 DRep ID** (`drep1...`) — for DRep credential authentication

---

### 4.1 `POST /session`

Requests a nonce for wallet authentication. Creates a session with a random
nonce that the user must sign to prove identity.

- **Standard:** omit `scriptAddress`. Payment/stake or DRep key addresses only;
  bare script addresses without `scriptAddress` are rejected.
- **Multisig:** include `scriptAddress` (CIP-0129 script / multisig DRep
  address). The nonce is bound to that script address; `signerAddress` is the
  key that will sign.

#### Request Body

| Field           | Type   | Required | Description                                              |
|-----------------|--------|----------|----------------------------------------------------------|
| `signerAddress` | string | Yes      | The address of the signer (must be valid Bech32 address) |
| `signType`      | string | Yes      | Type of signature: `drep`, `stake`                       |
| `scriptAddress` | string | No       | Multisig: CIP-0129 script address used as session identity |

#### Success Response — `200 OK`

```json
{
  "dataHex": "Sign in! a3f8d2e1b4c9f0a7d6e5b8c1a2f3d4e5",
  "userId": "stake1ux9...xyz",
  "userIdHex": "e0a1b2c3d4e5f6...",
  "signerAddressHex": "e0a1b2c3d4e5f6..."
}
```

For multisig requests, `userId` / related fields refer to `scriptAddress`, and
the response also includes `scriptAddress`.

[//]: # (@formatter:off)

> **Note:**
>
> - The `dataHex` field contains a string with the prefix "Sign in! " followed by hex-encoded nonce (e.g.,`"Sign in! a3f8d2e1b4c9f0a7d6e5b8c1a2f3d4e5"`). The client must sign this entire string value and submit it via `PUT /session` to complete authentication.
> - The `userId` field contains a Bech32-encoded Cardano identifier. It can be a stake address (`stake1...`), CIP-0129 DRep ID (`drep1...`), or (multisig) the script address supplied as `scriptAddress`.
> - The `userIdHex` and `signerAddressHex` fields contain hex-encoded versions of the address for clients that require hex formats.

[//]: # (@formatter:on)

#### Error Response — `400 Bad Request`

Returned when:

- Address is a script address and `scriptAddress` was not provided
- Address or `scriptAddress` validation fails

```json
{
  "status": "error",
  "message": "Script address not allowed. Please use the multisig route."
}
```

(Message text may refer to the multisig flow; the supported mechanism is
including `scriptAddress` on this same endpoint.)

#### Error Response — `500 Internal Server Error`

Returned when:

- Database operation fails (e.g., unable to save session)

```json
{
  "status": "error",
  "message": "Failed to create authentication session. Please try again."
}
```

#### Error Response — `429 Too Many Requests`

Returned when the rate limit is exceeded (five requests per minute per IP).

```json
{
  "status": "error",
  "message": "Too many nonce requests. Please try again later."
}
```

> **Note:** Nonce are single-use and stored server-side. They expire after five
> minutes. The client must sign the `dataHex` value and submit it via
> `PUT /session` to complete authentication. This endpoint is rate-limited to
> five requests per minute per IP address.

---

### 4.2 `PUT /session`

Verifies the signature of the nonce and issues a JWT token for authentication.
After successful verification, sets an HTTP-only cookie with the JWT token and
clears the nonce from session records. Also creates or updates the User record
with the user's name (fetched from DRep registry or handle service). Nonce are
atomically marked as used to prevent race conditions.

**Multisig:** When `scriptAddress` is present, the server verifies that the
signer is an **eligible key in the native script** (key-hash membership via
`isPartyToScript`). It does **not** evaluate full native-script semantics
(threshold `all` / `any` / `atLeast`, or timelock `before` / `after`). That is
intentional for this module; see
[system-architecture.md §8.1](system-architecture.md#81-accepted-risks) (F-002).
The issued JWT `userId` is the script address.

#### Request Body

| Field           | Type   | Required | Description                                                                 |
|-----------------|--------|----------|-----------------------------------------------------------------------------|
| `signerAddress` | string | Yes      | The address of the signer (validated by middleware)                         |
| `signType`      | string | Yes      | Type of signature: `drep`, `stake`                                          |
| `signature`     | object | Yes      | Signature object containing the signed nonce (structure varies by signType) |
| `scriptAddress` | string | No       | Multisig: CIP-0129 script address; triggers membership verification         |

#### Success Response — `200 OK`

```json
{
  "expiresIn": "2026-02-11T09:23:33Z",
  "userId": "stake1ux9...xyz"
}
```

> **Note:** The JWT is set only as an HTTP-only cookie named `token` (not in the
> JSON body). Subsequent requests must include this cookie via
> `credentials: 'include'`. The token contains `userId` (stake address, CIP-0129
> DRep ID, or multisig script address) and `signType`.

#### Error Response — `400 Bad Request`

Returned when:

- Script address used without `scriptAddress` in the body
- Multisig: signer is not a party to the script (membership check failed)
- Nonce not found in the database
- Nonce has expired (nonces expire after 5 minutes)
- Invalid signature format (signature is not a valid object)
- Signature verification fails
- Signature verification throws an exception

For security reasons, a generic error message is often returned to prevent
information leakage (multisig membership failure may return a specific
“does not belong to the MultiSig” message):

```json
{
  "status": "error",
  "message": "Authentication failed. Please request a new nonce and try again."
}
```

#### Error Response — `500 Internal Server Error`

Returned when:

- Database operation fails (e.g., unable to fetch or update nonce)
- JWT token creation fails

```json
{
  "status": "error",
  "message": "Authentication failed. Please request a new nonce and try again."
}
```

Or when JWT token creation fails:

```json
{
  "status": "error",
  "message": "Failed to create authentication token. Please try again."
}
```

#### Error Response — `429 Too Many Requests`

Returned when the rate limit is exceeded (ten requests per minute per IP).

```json
{
  "status": "error",
  "message": "Too many authentication attempts. Please try again later."
}
```

> **Note:** This endpoint is rate-limited to 10 requests per minute per IP
> address to prevent brute force attacks.

---

### 4.3 `GET /session`

Validates the JWT token and returns the user's ID and optional profile data.
Used to check if a user is authenticated and to get their user ID, display name,
and (when applicable) the list of vote IDs for which they are an admin.

#### Headers

| Header   | Type   | Required | Description                                     |
|----------|--------|----------|-------------------------------------------------|
| `Cookie` | string | Yes      | HTTP-only cookie containing JWT token (`token`) |

#### Success Response — `200 OK`

```json
{
  "userId": "stake1ux9...xyz",
  "name": "Alice",
  "expiresIn": "2026-02-11T09:23:33Z",
  "adminVoteIds": [
    "a1b2c3d4e5f67890abcdef12",
    "b2c3d4e5f67890abcdef123"
  ]
}
```

| Field          | Type     | Description                                                                                                                                                                                             |
|----------------|----------|---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `userId`       | string   | **Required.** Bech32-encoded Cardano identifier from the validated JWT (stake address, DRep ID, or pool ID).                                                                                            |
| `name`         | string   | **Optional.** User's display name from the User record (e.g. from DRep registry or handle service at login). Omitted if not set.                                                                        |
| `expiresIn`    | string   | **Optional.** ISO timestamp when the session JWT expires (from the cookie token `exp`).                                                                                                               |
| `adminVoteIds` | string[] | **Optional.** Array of vote `_id` values (as strings) for which the authenticated user is in the vote's `admins` array. Present only when the user is an admin of at least one vote; omitted otherwise. |

> **Note:** The `userId` field contains a Bech32-encoded Cardano identifier. It
> can be a stake address (`stake1...`) or CIP-0129 DRep ID (`drep1...`)
> depending on how the user authenticated.

#### Error Response — `401 Unauthorized`

Returned when:

- Token is missing
- Token is invalid or expired

```json
{
  "status": "error",
  "message": "No token provided"
}
```

---

### 4.4 `DELETE /session`

Logs out by clearing the authentication cookie. The cookie is cleared with the
same options used when it was set.

#### Headers

| Header   | Type   | Required | Description                                     |
|----------|--------|----------|-------------------------------------------------|
| `Cookie` | string | Yes      | HTTP-only cookie containing JWT token (`token`) |

#### Success Response — `200 OK`

```json
{
  "status": "success",
  "message": "Logged out successfully"
}
```

#### Error Response — `401 Unauthorized`

Returned when not authenticated.

---

## 5. Authenticated (Write) Endpoints

> **Note:** All endpoints in this section are relative to the base path
> `/api/v0`. For example, `POST /proposals` refers to `POST /api/v0/proposals`.

The endpoints in this section require authentication via JWT token (provided as
an HTTP-only cookie). These endpoints allow authenticated users to create or
update resources. Access control is enforced based on the user's role and
ownership of resources.

**Authentication Requirements:**

- All endpoints require a valid JWT token in the `token` cookie (obtained via
  `PUT /session`).
- The token must contain a valid `userId` (Bech32 Cardano stake or CIP-0129 DRep
  ID).

**Access Control:**

- **Proposer** — Can create and manage their own proposals and comments.
- **Admin** — Can manage proposals and comments within their assigned votes.
- **User** — Can create and manage their own comments.

Rate limiting applies to all authenticated endpoints
(see [Section 6](#6-rate-limiting--caching)).

---

### 5.1 `POST /proposals`

Creates a new proposal. The authenticated user's `userId` is automatically set
as the `proposerId`. New proposals are created with `status: "draft"` by
default. To submit a proposal for review, set the status to `"live"` (requires
all legal declarations to be accepted).

**Submission window:** Proposals (both draft and live) may only be created
before the vote's `submissionEndDate`. The vote defines`submissionStartDate`
and `submissionEndDate` (ISO 8601 timestamps). Creating a proposal (with any
status) is rejected with `400 Bad Request` if the current time is after the
vote's `submissionEndDate`. Submitting with `status: "live"`is also rejected if
the current time is before the vote's `submissionStartDate` (the submission
window has not yet opened). Draft proposals may be created or updated only while
the current time is before`submissionEndDate`.

#### Headers

| Header   | Type   | Required | Description                                     |
|----------|--------|----------|-------------------------------------------------|
| `Cookie` | string | Yes      | HTTP-only cookie containing JWT token (`token`) |

#### Request Body

| Field      | Type   | Required | Description                                                                                                                                                                                           |
|------------|--------|----------|-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `voteId`   | string | Yes      | MongoDB ObjectId of the vote cycle (24-character hexadecimal string)                                                                                                                                  |
| `title`    | string | Yes      | Title of the proposal                                                                                                                                                                                 |
| `summary`  | string | Yes*     | Executive summary. Max 2000 chars. Required when `status` is `"live"`; optional for draft.                                                                                                            |
| `metaData` | object | Yes      | Proposal metadata (see structure below)                                                                                                                                                               |
| `status`   | string | No       | Proposal status. Defaults to `"draft"`. Valid values: `"draft"`, `"live"`. To submit as `"live"`, all legal declarations must be accepted. Once set to `"live"`, status cannot be changed (see §5.2). |

**Request body shape** is defined
by [proposal-schema-description.md](proposal-schema-description.md). For draft,
only `voteId`, `title`, and `status` are required; full validation applies when
`status` is `"live"`. **Server-set fields (not in request body):** Responses
include `_id`, `proposerId` (from JWT), `createdAt`, `updatedAt`, `version`,
`versions`, `submittedAt`, `totalBudget`, `signature`, `withdrawalDetails` (when
withdrawn). See [schema/Proposal.js](../schema/Proposal.js) for internal
tracking and versioning.

**`metaData` Object Structure:**

| Field                        | Type   | Required (when live) | Description                                                              |
|------------------------------|--------|----------------------|--------------------------------------------------------------------------|
| `trackRecord`                | string | No                   | Max 650 chars.                                                           |
| `strategicFocusArea`         | string | Yes                  | Category ObjectId (24 hex). Must be a Category from the proposal's vote. |
| `keyPerformanceIndicators`   | array  | Yes (min 1)          | Each: `{ kpi ` (max 400), `contributionStrategy` (max 800) }.            |
| `executionRoadmap`           | object | Yes                  | `projectStartDate`, `projectEndDate` (ISO 8601), `workPackages` (array). |
| `financialAndAdministrative` | object | Yes                  | See below.                                                               |
| `contractingParty`           | object | Yes                  | See below.                                                               |
| `primaryContact`             | object | Yes                  | See below.                                                               |
| `signatoryContact`           | object | Yes                  | See below.                                                               |
| `proposalType`               | string | Yes                  | `"Technical (software/IT)"` \| `"Non-technical"`.                        |
| `kycInfo`                    | object | Yes                  | See below.                                                               |
| `legalDeclarations`          | object | Yes when live        | See below.                                                               |

**`contractingParty`:** `legalEntityType` (required): `"company"` or
`"individual"`. Company: `legalEntityName`, `legalEntityRegistrationNumber`,
`legalEntityCountry`, `legalEntityAddress` (each max 100). Individual:
`countryOfResidence`, `govtIssuedIdNumber`, `fullResidentialAddress` (each max
100). See [proposal-schema-description.md](proposal-schema-description.md).

**`primaryContact`:** `name`, `email` (required, max 100); `title`,
`socialMedia` (optional, max 100).

**`signatoryContact`:** `name`, `title`, `email` (required, max 100),
`authorization` (required, boolean, must be true).

**`kycInfo`:** `submitted` (boolean, required), `email` (required when
`submitted` is false, max 100, valid email).

**`keyPerformanceIndicators`:** Each element: `kpi` (max 400),
`contributionStrategy` (max 800).

**`executionRoadmap`:** `projectStartDate`, `projectEndDate` (ISO 8601; required
when live), `workPackages` (array). Per-work-package structure:
see [proposal-schema-description.md](proposal-schema-description.md) §3.

**`financialAndAdministrative`:** `conversionRate` (number),
`intersectAdministrator` (boolean), `otherAdministrators` (max 400),
`initiativeType`: `"New Initiative"` or `"Maintenance"`, `priorFunding` (max
800), `treasuryRepayment` (boolean), `treasuryRepaymentCondition` (max 800),
`treasuryDonationHash` (required when live), `thirdPartyAssurers` (max 600),
`supportingDocuments`: array of `{ title` (max 255), `url }`. Full field
list: [proposal-schema-description.md](proposal-schema-description.md) §4.

**`legalDeclarations` Object (Required when `status` is `"live"`):**

Matches the CBC Proposal Template FORM Final DRAFT PDF: four checkboxes (two
under §1 Data Protection, two under §8 Declaration of Submitter) plus submitter
text fields. All four boolean fields must be `true` to submit a proposal as
`"live"`.

| Field                      | Type    | Required | Description                                                               |
|----------------------------|---------|----------|---------------------------------------------------------------------------|
| `dataProtection`           | boolean | Yes*     | Data protection consent (PDF §1, first checkbox).                         |
| `publicVisibilityConsent`  | boolean | Yes*     | Public visibility consent (PDF §1, second checkbox).                      |
| `authorizationEntity`      | boolean | Yes*     | Authorized to submit on behalf of vendor entity (PDF §8, first checkbox). |
| `authorizationAttestation` | boolean | Yes*     | Authorized to attest to all legal declarations (PDF §8, second checkbox). |
| `submitterName`            | string  | No       | Declaration of submitter – name (PDF §8). Max 100 chars.                  |
| `submitterRole`            | string  | No       | Declaration of submitter – role (PDF §8). Max 100 chars.                  |
| `submitterEmail`           | string  | No       | Declaration of submitter – email (PDF §8). Max 100 chars, valid email.    |

\* Required when `status` is `"live"`, optional for `"draft"` proposals.

#### Success Response — `201 Created`

Returns the created proposal document with all fields:

```json
{
  "_id": "b1c2d3e4f5a67890bcdef123",
  "proposerId": "stake1ux9...xyz",
  "voteId": "a1b2c3d4e5f67890abcdef12",
  "title": "Cardano Node Performance Optimization",
  "summary": "Improving node synchronization and transaction processing efficiency",
  "status": "draft",
  "version": 1,
  "metaData": {
    "contractingParty": {
      "legalEntityName": "Example Corp",
      "legalEntityType": "company",
      "legalEntityRegistrationNumber": "12345678",
      "legalEntityCountry": "US",
      "legalEntityAddress": "123 Main St"
    },
    "primaryContact": {
      "name": "John Doe",
      "title": "CTO",
      "email": "john@example.com",
      "socialMedia": "@johndoe"
    },
    "signatoryContact": {
      "name": "Jane Smith",
      "title": "CEO",
      "email": "jane@example.com",
      "authorization": true
    },
    "proposalType": "Technical (software/IT)",
    "kycInfo": {
      "submitted": true,
      "email": "kyc@example.com"
    },
    "strategicFocusArea": "a1b2c3d4e5f67890abcdef13",
    "keyPerformanceIndicators": [
      {
        "kpi": "Network uptime > 99.9%",
        "contributionStrategy": "Improved node reliability"
      }
    ]
  },
  "createdAt": "2026-02-04T10:00:00Z",
  "updatedAt": "2026-02-04T10:00:00Z"
}
```

> **Note:** The `proposerId` is automatically set from the authenticated user's
> `userId` (from the JWT token). The `status` defaults to `"draft"` if not
> provided. To submit a proposal for review, create it with `status: "live"`
> (requires all legal declarations to be `true`).

#### Error Response — `400 Bad Request`

Returned when:

- Required fields are missing
- Invalid field values (e.g., invalid enum values, invalid ObjectId format)
- Invalid `voteId` (vote does not exist)
- Invalid `strategicFocusArea` (category does not exist or is not part of the
  specified vote)
- `status` is `"live"` but legal declarations are missing or not all `true`
- The current time is after the vote's `submissionEndDate` (proposals, including
  drafts, cannot be created after the submission deadline)
- `status` is `"live"` but the current time is before the vote's
  `submissionStartDate` (the submission window has not yet opened)
- `status` is not `"draft"` or `"live"` for new proposals
- `status` is `"live"` and the vote requires a treasury donation, but on-chain
  verification of `metaData.treasuryDonationTxHash` fails a genuine check
  (missing/invalid hash, wrong stake key, insufficient donation, transaction
  not found on chain, or hash already used by another non-draft / non-archived
  proposal globally — including under concurrent promote races).
  These responses include an `errors` tree for `metaData.treasuryDonationTxHash`.

```json
{
  "status": "error",
  "message": "Invalid voteId parameter. Vote not found."
}
```

Or when legal declarations are missing for `"live"` status:

```json
{
  "status": "error",
  "message": "legalDeclarations is required when status is live"
}
```

Or when submitting outside the vote's submission window:

```json
{
  "status": "error",
  "message": "Proposals cannot be submitted after the vote submission deadline (submissionEndDate)."
}
```

Or when the vote's submission window has not yet opened:

```json
{
  "status": "error",
  "message": "Proposals cannot be submitted before the vote submission window opens (submissionStartDate)."
}
```

Or when treasury donation verification fails a genuine on-chain check:

```json
{
  "status": "error",
  "message": "Validation failed",
  "errors": {
    "properties": {
      "metaData": {
        "properties": {
          "treasuryDonationTxHash": {
            "errors": ["Transaction not found"]
          }
        }
      }
    }
  }
}
```

#### Error Response — `401 Unauthorized`

Returned when:

- Token is missing
- Token is invalid or expired

```json
{
  "status": "error",
  "message": "No token provided"
}
```

#### Error Response — `503 Service Unavailable`

Returned when `status` is `"live"`, the vote requires a treasury donation, and
chain-data providers cannot complete verification (outage, throttle, or rejected
credentials after fallback). This is not a client validation failure; the
proposer should retry. When the provider sent a retry delay, the response
includes a `Retry-After` header (seconds). Provider error detail is never
included in the body.

```json
{
  "status": "error",
  "message": "Unable to verify treasury donation right now. Please retry shortly."
}
```

#### Error Response — `500 Internal Server Error`

Returned when:

- Database operation fails
- Internal server error occurs

```json
{
  "status": "error",
  "message": "Internal server error"
}
```

---

### 5.2 `PUT /proposals/{proposalId}`

Updates an existing proposal. Only the proposal owner (authenticated user's
`userId` must match the proposal's `proposerId`) can update. Updates are allowed
until the vote's `reviewEndDate`; after that, the proposal is locked.

**Versioning when updating a live proposal:** If the proposal's current `status`
is `"live"`, the server preserves the current version with an optimistic
compare-and-swap (CAS):

1. The server records the proposal's current `version` as the expected version
   (default `1` if unset).
2. The current proposal document is copied into a new document with
   `status: "archived"` (and a new `_id`).
3. The live document is updated atomically via `findOneAndUpdate` filtered on
   `{ _id, status: "live", version: expectedVersion }`: fields are `$set` from
   the request, `version` is `$inc`'d by 1, and `versions` is `$push`'d with
   `{ _id: <archivedDocumentId>, createdAt: <archivedDocumentCreatedAt> }`.
4. If the CAS misses (another writer changed the live proposal first), the
   orphan archived copy is deleted and the API returns **409 Conflict**. The
   client should re-fetch and retry.

For proposals that are not yet live (e.g. `"draft"`), the document is updated in
place and no archived copy is created.

#### Headers

| Header   | Type   | Required | Description                                     |
|----------|--------|----------|-------------------------------------------------|
| `Cookie` | string | Yes      | HTTP-only cookie containing JWT token (`token`) |

#### Path Parameters

| Parameter    | Type   | Required | Description                                          |
|--------------|--------|----------|------------------------------------------------------|
| `proposalId` | string | Yes      | MongoDB ObjectId of the proposal to update (24 hex). |

#### Request Body

Same structure as `POST /proposals` (see §5.1). Send the full proposal fields to
retain, plus any changes. The `proposerId` and `voteId` cannot be changed. If
updating to `status: "live"`, the submission window rules apply (current time
must be within `submissionStartDate` and `submissionEndDate`), and all required
legal declarations must be present and accepted. **Once a proposal's status
is `"live"`, the `status` field cannot be changed at all;** the server must
ignore or reject any request that attempts to set a different `status` on a
proposal that is already `"live"`. Attempting to change status on a live
proposal returns `400 Bad Request`.

#### Success Response — `200 OK`

Returns the updated proposal document (the one at `proposalId`). If the proposal
was previously `"live"`, the response will include an updated `versions` array
with a new entry referencing the archived previous version.

```json
{
  "_id": "b1c2d3e4f5a67890bcdef123",
  "proposerId": "stake1ux9...xyz",
  "voteId": "a1b2c3d4e5f67890abcdef12",
  "title": "Cardano Node Performance Optimization (Revised)",
  "summary": "Updated scope and timeline.",
  "status": "live",
  "metaData": {},
  "version": 2,
  "versions": [
    {
      "_id": "c2d3e4f5a67890bcdef1234",
      "createdAt": "2026-02-01T12:00:00Z"
    }
  ],
  "createdAt": "2026-02-01T10:00:00Z",
  "updatedAt": "2026-02-04T14:30:00Z"
}
```

> **Note:** The `versions` array entries reference previous versions by their
> document `_id` and `createdAt`. The archived document has `status: "archived"`
> and can be fetched by ID for history/audit.

#### Error Response — `400 Bad Request`

Returned when:

- Request body validation fails (same rules as `POST /proposals` where
  applicable).
- The proposal's current status is `"live"` and the request attempts to change
  `status` to any other value (once live, status is immutable).
- Updating to `status: "live"` outside the vote's submission window (after
  `submissionEndDate` or before `submissionStartDate`).
- Updating to `status: "live"` without required legal declarations.
- Current time is after the vote's `reviewEndDate` (the proposal is locked and
  cannot be updated).
- Promoting to `status: "live"` when the vote requires a treasury donation and
  on-chain verification of `metaData.treasuryDonationTxHash` fails a genuine
  check (same cases as `POST /proposals` §5.1, including concurrent reuse of
  a hash already claimed by another non-draft / non-archived proposal). These
  responses include an `errors` tree for `metaData.treasuryDonationTxHash`.

```json
{
  "status": "error",
  "message": "Proposal status cannot be changed once the proposal is live."
}
```

Or when the proposal is locked after the review period:

```json
{
  "status": "error",
  "message": "Proposal cannot be updated after the vote review period has ended (reviewEndDate)."
}
```

#### Error Response — `401 Unauthorized`

Returned when:

- Token is missing or invalid or expired.

```json
{
  "status": "error",
  "message": "No token provided"
}
```

#### Error Response — `403 Forbidden`

Returned when:

- The authenticated user is not the proposal owner (`proposerId` does not match
  the token's `userId`).

```json
{
  "status": "error",
  "message": "You do not have permission to update this proposal."
}
```

#### Error Response — `404 Not Found`

Returned when:

- No proposal exists with the given `proposalId`.

```json
{
  "status": "error",
  "message": "Proposal not found"
}
```

#### Error Response — `409 Conflict`

Returned when a live proposal update loses the optimistic version CAS (another
request archived/updated the same live proposal concurrently). The client should
re-fetch the proposal and retry.

```json
{
  "status": "error",
  "message": "Proposal was modified concurrently. Please retry."
}
```

#### Error Response — `503 Service Unavailable`

Returned when promoting to `status: "live"`, the vote requires a treasury
donation, and chain-data providers cannot complete verification (same semantics
as `POST /proposals` §5.1). Optional `Retry-After` header; provider detail is
never included in the body.

```json
{
  "status": "error",
  "message": "Unable to verify treasury donation right now. Please retry shortly."
}
```

#### Error Response — `500 Internal Server Error`

Returned when:

- Database or internal server error occurs.

```json
{
  "status": "error",
  "message": "Internal server error"
}
```

---

### 5.3 `PUT /proposals/{proposalId}/withdraw`

Allows the proposal owner (proposer) or a **vote admin** to withdraw a **live
** proposal. The request body is stored in `withdrawalDetails`. No other fields
of the proposal may be changed; this endpoint only performs the withdrawal.

**Who can withdraw:**

- **Proposer** — Authenticated user's `userId` matches the proposal's
  `proposerId`. The proposal's status is set to `"withdrawnByProposer"`.
  Withdrawal is allowed until the vote's `reviewEndDate`.
- **Vote admin** — Authenticated user's `userId` is in the proposal's vote
  `admins` array. The proposal's status is set to `"withdrawnByAdmin"`.
  Withdrawal is allowed only **before** the vote's `votingStartDate`.

**Constraints:**

- Only the proposer or a vote admin can call this endpoint.
- The proposal's current status must be `"live"`. Draft, already withdrawn, or
  archived proposals cannot be withdrawn via this endpoint.
- **Proposer:** withdrawal only allowed until the vote's `reviewEndDate`.
  **Vote admin:** withdrawal only allowed before the vote's `votingStartDate`.

#### Headers

| Header   | Type   | Required | Description                                     |
|----------|--------|----------|-------------------------------------------------|
| `Cookie` | string | Yes      | HTTP-only cookie containing JWT token (`token`) |

#### Path Parameters

| Parameter    | Type   | Required | Description                                            |
|--------------|--------|----------|--------------------------------------------------------|
| `proposalId` | string | Yes      | MongoDB ObjectId of the proposal to withdraw (24 hex). |

#### Request Body

| Field      | Type   | Required | Description                                                                                                              |
|------------|--------|----------|--------------------------------------------------------------------------------------------------------------------------|
| `category` | string | Yes      | Reason category. One of: `"Inappropriate content"`, `"Spam"`, `"Policy violation"`, `"Duplicate submission"`, `"Other"`. |
| `comment`  | string | No       | Optional free-text reason or explanation for the withdrawal.                                                             |

The server sets `withdrawalDetails.userId` to the authenticated user's `userId`
and `withdrawalDetails.date` to the current time (ISO 8601).

#### Success Response — `200 OK`

Returns the updated proposal document. The `status` is `"withdrawnByProposer"`
when the proposer withdrew, or `"withdrawnByAdmin"` when a vote admin withdrew.
The `withdrawalDetails` object is populated in both cases.

Example (proposer withdrawal):

```json
{
  "_id": "b1c2d3e4f5a67890bcdef123",
  "proposerId": "stake1ux9...xyz",
  "voteId": "a1b2c3d4e5f67890abcdef12",
  "title": "Cardano Node Performance Optimization",
  "description": "...",
  "status": "withdrawnByProposer",
  "withdrawalDetails": {
    "category": "Duplicate submission",
    "userId": "stake1ux9...xyz",
    "comment": "Submitted a revised version under a different proposal.",
    "date": "2026-02-10T14:00:00Z"
  },
  "metaData": {},
  "createdAt": "2026-02-01T10:00:00Z",
  "updatedAt": "2026-02-10T14:00:00Z"
}
```

When a vote admin withdraws, `status` is `"withdrawnByAdmin"` and
`withdrawalDetails.userId` is the admin's address.

#### Error Response — `400 Bad Request`

Returned when:

- The proposal's current status is not `"live"` (e.g., already withdrawn, or
  still draft).
- **Proposer** calls after the vote's `reviewEndDate` (the proposer withdrawal
  window has closed).
- **Vote admin** calls on or after the vote's `votingStartDate` (the admin
  withdrawal window has closed).
- `category` is missing or not one of the allowed values.

```json
{
  "status": "error",
  "message": "Only live proposals can be withdrawn."
}
```

Or when the proposer withdrawal window has closed:

```json
{
  "status": "error",
  "message": "Proposer withdrawal is not allowed after the vote review period has ended (reviewEndDate)."
}
```

Or when the admin withdrawal window has closed:

```json
{
  "status": "error",
  "message": "Admin withdrawal is only allowed before voting starts (votingStartDate)."
}
```

#### Error Response — `401 Unauthorized`

Returned when the token is missing or invalid or expired.

```json
{
  "status": "error",
  "message": "No token provided"
}
```

#### Error Response — `403 Forbidden`

Returned when the authenticated user is neither the proposal owner nor a vote
admin for the proposal's vote.

```json
{
  "status": "error",
  "message": "You do not have permission to withdraw this proposal."
}
```

#### Error Response — `404 Not Found`

Returned when no proposal exists with the given `proposalId`.

```json
{
  "status": "error",
  "message": "Proposal not found"
}
```

#### Error Response — `500 Internal Server Error`

Returned when a database or internal server error occurs.

```json
{
  "status": "error",
  "message": "Internal server error"
}
```

---

### 5.4 `DELETE /proposals/{proposalId}`

Allows the proposal owner (proposer) to delete a proposal. Only proposals with
`status: "draft"` can be deleted. Live, withdrawn, or archived proposals cannot
be deleted via this endpoint.

**Constraints:**

- Only the proposer (authenticated user's `userId` must match the proposal's
  `proposerId`) can call this endpoint.
- The proposal's current status must be `"draft"`. Proposals in any other status
  return `400 Bad Request` if the client attempts to delete them.

#### Headers

| Header   | Type   | Required | Description                                     |
|----------|--------|----------|-------------------------------------------------|
| `Cookie` | string | Yes      | HTTP-only cookie containing JWT token (`token`) |

#### Path Parameters

| Parameter    | Type   | Required | Description                                          |
|--------------|--------|----------|------------------------------------------------------|
| `proposalId` | string | Yes      | MongoDB ObjectId of the proposal to delete (24 hex). |

#### Success Response — `200 OK`

The proposal was deleted.

```json
{
  "status": "success",
  "message": "Proposal deleted"
}
```

#### Error Response — `400 Bad Request`

Returned when the proposal's current status is not `"draft"` (only draft
proposals can be deleted).

```json
{
  "status": "error",
  "message": "Only draft proposals can be deleted."
}
```

#### Error Response — `401 Unauthorized`

Returned when the token is missing or invalid or expired.

```json
{
  "status": "error",
  "message": "No token provided"
}
```

#### Error Response — `403 Forbidden`

Returned when the authenticated user is not the proposal owner.

```json
{
  "status": "error",
  "message": "You do not have permission to delete this proposal."
}
```

#### Error Response — `404 Not Found`

Returned when no proposal exists with the given `proposalId`.

```json
{
  "status": "error",
  "message": "Proposal not found"
}
```

#### Error Response — `500 Internal Server Error`

Returned when a database or internal server error occurs.

```json
{
  "status": "error",
  "message": "Internal server error"
}
```

---

### 5.5 `POST /comments`

Creates a new comment on a proposal. Authenticated users and vote admins can
comment. Comments can only be created on proposals with `status: "live"` and
only until the vote's `feedbackEndDate`.

**Constraints:**

- Requires authentication.
- The proposal must exist and have `status: "live"`.
- The current time must be before the proposal's vote `feedbackEndDate`.
- To create a **reply**, set `parentId` to the parent comment's ObjectId; omit
  `parentId` for a top-level comment.

#### Headers

| Header   | Type   | Required | Description                                     |
|----------|--------|----------|-------------------------------------------------|
| `Cookie` | string | Yes      | HTTP-only cookie containing JWT token (`token`) |

#### Request Body

| Field        | Type   | Required | Description                                                                   |
|--------------|--------|----------|-------------------------------------------------------------------------------|
| `proposalId` | string | Yes      | MongoDB ObjectId of the proposal (24 hex).                                    |
| `content`    | string | Yes      | The comment text.                                                             |
| `parentId`   | string | No       | MongoDB ObjectId of the parent comment (24 hex). Omit for top-level comments. |

#### Success Response — `201 Created`

Returns the created comment document.

```json
{
  "_id": "c1d2e3f4a5b67890cdef1234",
  "proposalId": "b1c2d3e4f5a67890bcdef123",
  "parentId": null,
  "userId": "stake1ux9...xyz",
  "content": "This proposal aligns well with the roadmap.",
  "status": "live",
  "createdAt": "2026-02-10T14:00:00Z",
  "updatedAt": "2026-02-10T14:00:00Z"
}
```

#### Error Response — `400 Bad Request`

Returned when the proposal is not live, the current time is after the vote's
`feedbackEndDate`, or request validation fails (e.g., missing `proposalId` or
`content`, invalid ObjectId).

```json
{
  "status": "error",
  "message": "Comments can only be added to live proposals before the vote feedback period ends (feedbackEndDate)."
}
```

[//]: # (@formatter:off)
#### Error Response — `401 Unauthorized`, `403 Forbidden`, `404 Not Found`, `500 Internal Server Error`
[//]: # (@formatter:on)

As per other authenticated endpoints (token required; proposal or parent comment
not found; server error).

---

### 5.6 `PUT /comments/{commentId}`

Updates a comment's `content`. Only the comment author can update, and only
within **15 minutes** of the comment's `createdAt`. Comments cannot be deleted.

**Constraints:**

- Requires authentication.
- The authenticated user must be the comment author (`userId` matches the
  comment's `userId`).
- The comment must have been created no more than 15 minutes ago (
  `now - createdAt <= 15 minutes`).
- Only `content` can be updated; no other fields are accepted or changed.

#### Headers

| Header   | Type   | Required | Description                                     |
|----------|--------|----------|-------------------------------------------------|
| `Cookie` | string | Yes      | HTTP-only cookie containing JWT token (`token`) |

#### Path Parameters

| Parameter   | Type   | Required | Description                                         |
|-------------|--------|----------|-----------------------------------------------------|
| `commentId` | string | Yes      | MongoDB ObjectId of the comment to update (24 hex). |

#### Request Body

| Field     | Type   | Required | Description           |
|-----------|--------|----------|-----------------------|
| `content` | string | Yes      | The new comment text. |

#### Success Response — `200 OK`

Returns the updated comment document.

```json
{
  "_id": "c1d2e3f4a5b67890cdef1234",
  "proposalId": "b1c2d3e4f5a67890bcdef123",
  "parentId": null,
  "userId": "stake1ux9...xyz",
  "content": "Updated comment text.",
  "status": "live",
  "createdAt": "2026-02-10T14:00:00Z",
  "updatedAt": "2026-02-10T14:12:00Z"
}
```

#### Error Response — `400 Bad Request`

Returned when the 15-minute edit window has passed or request validation fails.

```json
{
  "status": "error",
  "message": "Comments can only be updated within 15 minutes of creation."
}
```

[//]: # (@formatter:off)
#### Error Response — `401 Unauthorized`, `403 Forbidden`, `404 Not Found`, `500 Internal Server Error`
[//]: # (@formatter:on)

As per other authenticated endpoints (token required; not the author; comment
not found; server error).

---

### 5.7 `POST /comments/{commentId}/like`

Toggles a like from the authenticated user on the comment. If the user has not
already liked the comment, the like is added. If the user has already liked the
comment, the like is removed. Only **live** comments can be liked (withdrawn
comments cannot be liked). The comment must belong to a proposal with
`status: "live"`, and the current time must be before the proposal's vote
`feedbackEndDate`. At most one like per user per comment.

**Constraints:**

- Requires authentication.
- The comment must exist, have `status: "live"` (only live comments can be
  liked), and its proposal must be `live`.
- Current time must be before the proposal's vote `feedbackEndDate`.

#### Headers

| Header   | Type   | Required | Description                                     |
|----------|--------|----------|-------------------------------------------------|
| `Cookie` | string | Yes      | HTTP-only cookie containing JWT token (`token`) |

#### Path Parameters

| Parameter   | Type   | Required | Description                                       |
|-------------|--------|----------|---------------------------------------------------|
| `commentId` | string | Yes      | MongoDB ObjectId of the comment to like (24 hex). |

#### Request Body

None.

#### Success Response — `200 OK` or `201 Created`

- `201 Created` when a new like was added.
- `200 OK` when the user had already liked the comment and the like was
  removed (toggle off).

Response can include the updated like count and whether the like was added or
removed, e.g.:

```json
{
  "status": "success",
  "message": "Comment liked.",
  "liked": true,
  "likeCount": 6
}
```

When the like was removed (the user had already liked):

```json
{
  "status": "success",
  "message": "Like removed.",
  "liked": false,
  "likeCount": 5
}
```

#### Error Response — `400 Bad Request`

Returned when the comment's status is not `"live"` (e.g., withdrawn by admin),
the comment's proposal is not live, or the current time is after the vote's
`feedbackEndDate`.

```json
{
  "status": "error",
  "message": "Only live comments can be liked."
}
```

Or when the feedback period has ended:

```json
{
  "status": "error",
  "message": "Comments on this proposal can no longer be liked (feedback period has ended)."
}
```

[//]: # (@formatter:off)
#### Error Response — `401 Unauthorized`, `404 Not Found`, `500 Internal Server Error`
[//]: # (@formatter:on)

As per other authenticated endpoints.

---

### 5.8 `PUT /comments/{commentId}/withdraw`

Allows a **vote admin** to withdraw a **live** comment. The comment's status is
set to `"withdrawnByAdmin"` and the request body is stored in
`withdrawalDetails`. No other fields of the comment may be changed.

**Constraints:**

- Only a vote admin (authenticated user's `userId` is in the comment's proposal
  vote `admins` array) can call this endpoint.
- The comment's current status must be `"live"`.
- Withdrawal is only allowed until the proposal's vote `feedbackEndDate`.

#### Headers

| Header   | Type   | Required | Description                                     |
|----------|--------|----------|-------------------------------------------------|
| `Cookie` | string | Yes      | HTTP-only cookie containing JWT token (`token`) |

#### Path Parameters

| Parameter   | Type   | Required | Description                                           |
|-------------|--------|----------|-------------------------------------------------------|
| `commentId` | string | Yes      | MongoDB ObjectId of the comment to withdraw (24 hex). |

#### Request Body

| Field      | Type   | Required | Description                                                                                                   |
|------------|--------|----------|---------------------------------------------------------------------------------------------------------------|
| `category` | string | Yes      | Reason category. One of: `"Inappropriate content"`, `"Spam"`, `"Policy violation"`, `"Duplicate"`, `"Other"`. |
| `comment`  | string | No       | Optional free-text reason or explanation for the withdrawal.                                                  |

The server sets `withdrawalDetails.userId` to the admin's `userId` and
`withdrawalDetails.date` to the current time (ISO 8601).

#### Success Response — `200 OK`

Returns the updated comment document with `status: "withdrawnByAdmin"` and
`withdrawalDetails` populated.

```json
{
  "_id": "c1d2e3f4a5b67890cdef1234",
  "proposalId": "b1c2d3e4f5a67890bcdef123",
  "userId": "stake1ux9...xyz",
  "content": "This proposal aligns well with the roadmap.",
  "status": "withdrawnByAdmin",
  "withdrawalDetails": {
    "category": "Spam",
    "userId": "stake1ur9m...w6x3",
    "comment": "Removed per policy.",
    "date": "2026-02-12T10:00:00Z"
  },
  "createdAt": "2026-02-10T14:00:00Z",
  "updatedAt": "2026-02-12T10:00:00Z"
}
```

#### Error Response — `400 Bad Request`

Returned when the comment is not live, the current time is after the vote's
`feedbackEndDate`, or `category` is missing or invalid.

```json
{
  "status": "error",
  "message": "Only live comments can be withdrawn by an admin."
}
```

Or when the withdrawal window has closed:

```json
{
  "status": "error",
  "message": "Comments cannot be withdrawn by an admin after the vote feedback period has ended (feedbackEndDate)."
}
```

[//]: # (@formatter:off)
#### Error Response — `401 Unauthorized`, `403 Forbidden`, `404 Not Found`, `500 Internal Server Error`
[//]: # (@formatter:on)

As per other authenticated endpoints (403 when the user is not a vote admin for
the comment's proposal).

---

### 5.9 Notification settings

Email notification preferences and verification. Implementation details (cron
milestones, mail transport, eligibility) are in
[notification-system-implementation.md](notification-system-implementation.md).
User field reference:
[user-schema-description.md](user-schema-description.md).

**Shared notification state shape** (returned by GET/PUT and nested under
`notification` on verify/unsubscribe success):

| Field          | Type            | Description                                                                 |
|----------------|-----------------|-----------------------------------------------------------------------------|
| `email`        | string \| null  | Active delivery address (verified).                                         |
| `pendingEmail` | string \| null  | Address awaiting magic-link verification.                                   |
| `schedule`     | string          | `never` \| `6h` \| `daily` (default `daily`).                               |
| `verifiedAt`   | string \| null  | ISO 8601 when `email` was confirmed; required for broadcast sends.          |
| `locale`       | string          | Mail catalog locale (e.g. `en`).                                            |

#### 5.9.1 `GET /notifications`

Returns the authenticated user's notification settings.

**Auth:** Cookie JWT required.

##### Success Response — `200 OK`

```json
{
  "email": "proposer@example.com",
  "pendingEmail": null,
  "schedule": "daily",
  "verifiedAt": "2026-05-01T12:00:00.000Z",
  "locale": "en"
}
```

#### 5.9.2 `PUT /notifications`

Updates schedule and/or email. Setting a new email (different from current
`email` / `pendingEmail`) stores it as `pendingEmail` and sends a verification
magic link (30m TTL) to `FRONTEND_URL/notifications/verify?token=...`. Clearing
email (`email: ""`) unsets `email`, `pendingEmail`, `verifiedAt`, and
`verificationIssuedAt`; it does **not** rotate or clear
`notification.unsubscribeSecret`.

**Auth:** Cookie JWT required. Dedicated write / verify-dispatch rate limits
apply.

##### Request Body

| Field      | Type   | Required | Description                                                                 |
|------------|--------|----------|-----------------------------------------------------------------------------|
| `schedule` | string | No       | One of `never`, `6h`, `daily`.                                              |
| `email`    | string | No       | New address to verify, or `""` to clear notification email fields.          |

##### Success Response — `200 OK`

Notification state plus `emailSendFailed` (boolean) when a verification send was
attempted.

```json
{
  "email": null,
  "pendingEmail": "new@example.com",
  "schedule": "daily",
  "verifiedAt": null,
  "locale": "en",
  "emailSendFailed": false
}
```

##### Error Response — `400 Bad Request`

Invalid schedule or email format.

##### Error Response — `409 Conflict`

A different `pendingEmail` is already awaiting confirmation
(`code: "PENDING_EMAIL_EXISTS"`). Verify, resend, or cancel pending first.

```json
{
  "status": "error",
  "code": "PENDING_EMAIL_EXISTS",
  "message": "A confirmation is already pending for old@example.com. Verify it, resend the link, or cancel the pending email before changing it."
}
```

#### 5.9.3 `DELETE /notifications/pending`

Cancels the pending email verification (`pendingEmail` and
`verificationIssuedAt` unset). Returns updated notification state.

**Auth:** Cookie JWT required.

##### Error Response — `400 Bad Request`

No pending email to cancel.

#### 5.9.4 `POST /notifications/resend`

Resends the verification email for the current `pendingEmail`. Rotates
`verificationIssuedAt` (invalidates prior magic links).

**Auth:** Cookie JWT required. Dedicated resend rate limit.

##### Success Response — `200 OK`

```json
{
  "status": "success",
  "emailSendFailed": false
}
```

##### Error Response — `400 Bad Request`

No pending email address to verify.

#### 5.9.5 `POST /notifications/verify`

Confirms a pending email using the magic-link token (no session cookie
required). On success, sets `notification.email`, `verifiedAt`, rotates
`unsubscribeSecret`, and clears `pendingEmail`.

##### Request Body

| Field   | Type   | Required | Description                          |
|---------|--------|----------|--------------------------------------|
| `token` | string | Yes      | JWT from the verification email URL. |

##### Success Response — `200 OK`

```json
{
  "status": "success",
  "notification": {
    "email": "new@example.com",
    "pendingEmail": null,
    "schedule": "daily",
    "verifiedAt": "2026-07-23T18:00:00.000Z",
    "locale": "en"
  }
}
```

##### Error Response — `400 Bad Request`

Missing, invalid, expired, or stale token (e.g. superseded by resend).

#### 5.9.6 `POST /notifications/unsubscribe`

Sets `notification.schedule` to `never` using a signed unsubscribe token from
email links (no session cookie required). Token must match the user's current
`unsubscribeSecret`.

##### Request Body

| Field   | Type   | Required | Description                           |
|---------|--------|----------|---------------------------------------|
| `token` | string | Yes      | JWT with purpose `notification-unsubscribe`. |

##### Success Response — `200 OK`

```json
{
  "status": "success",
  "notification": {
    "email": "proposer@example.com",
    "pendingEmail": null,
    "schedule": "never",
    "verifiedAt": "2026-05-01T12:00:00.000Z",
    "locale": "en"
  }
}
```

##### Error Response — `400 Bad Request`

Missing, invalid, expired, or secret-mismatched token.

---

## 6. Rate Limiting & Caching

Rate limiting is applied per IP or per authenticated user as indicated below.
When a limit is exceeded, the server responds with **429 Too Many Requests** and
should include rate-limit headers where supported: `RateLimit-Limit` (limit per
window), `RateLimit-Remaining` (remaining in the current window), and
`RateLimit-Reset` or `Retry-After` (when the window resets or seconds until
retry). Clients should use exponential backoff when retrying after a 429.

Server-side cache TTLs apply to responses for the listed endpoints; cached data
must be invalidated when the underlying data changes or when the TTL expires.
Client-side caching may follow the same TTLs or use `Cache-Control` when
present; session and write endpoints must not be cached.

| Endpoint / scope                                                                                                                                                                                                                                                                         | Rate limit  | Window | Cache (server) |
|------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|-------------|--------|----------------|
| **Public read (Section 3)** — `GET /votes`, `GET /votes/{voteId}`, `GET /votes/{voteId}/categories`, `GET /proposals`, `GET /proposals/{proposalId}`, `GET /comments`, `GET /comments/{commentId}`, `GET /comments/{commentId}/replies`                                                  | 200 per IP  | 1 min  | 30 s           |
| `POST /session` (request nonce)                                                                                                                                                                                                                                                          | 5 per IP    | 1 min  | —              |
| `PUT /session` (complete sign-in)                                                                                                                                                                                                                                                        | 10 per IP   | 1 min  | —              |
| `GET /session` (check session)                                                                                                                                                                                                                                                           | 60 per IP   | 1 min  | —              |
| `DELETE /session` (logout)                                                                                                                                                                                                                                                               | 20 per IP   | 1 min  | —              |
| **Authenticated write (Section 5)** — `POST /proposals`, `PUT /proposals/{proposalId}`, `PUT /proposals/{proposalId}/withdraw`, `DELETE /proposals/{proposalId}`, `POST /comments`, `PUT /comments/{commentId}`, `POST /comments/{commentId}/like`, `PUT /comments/{commentId}/withdraw` | 10 per user | 1 min  | —              |
| `GET/PUT /notifications`, `DELETE /notifications/pending`                                                                                                                                                                                                                                | Dedicated per-user write / verify-dispatch limiters | — | — |
| `POST /notifications/resend`, `POST /notifications/verify`, `POST /notifications/unsubscribe`                                                                                                                                                                                            | Dedicated route limiters (resend / verify / unsubscribe) | — | — |

---

## 7. Error Responses

All error responses use the same JSON shape and a single HTTP status code.
Individual endpoints document their specific error cases; this section
summarizes the overall behavior.

### 7.1 Response format

Error responses are JSON objects with at least:

| Field     | Type   | Description                                    |
|-----------|--------|------------------------------------------------|
| `status`  | string | Always `"error"`.                              |
| `message` | string | Human-readable description of what went wrong. |

Implementations may add extra fields (e.g. `code`, `details`) for debugging or
validation; clients should not rely on them.

### 7.2 HTTP status codes

| Status                        | Meaning                             | Typical use in this API                                                                                                                                                                                    |
|-------------------------------|-------------------------------------|------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| **400 Bad Request**           | Invalid or disallowed request.      | Invalid path/query/body (e.g. bad ObjectId, missing required field), validation failures, business-rule violations (e.g. submission window closed, live proposal status change, comment not withdrawable). |
| **401 Unauthorized**          | Authentication required or invalid. | Missing or invalid JWT (cookie), expired session, or unauthenticated access to an endpoint that requires a session.                                                                                        |
| **403 Forbidden**             | Authenticated but not allowed.      | User is logged in but lacks permission (e.g. not the proposer, not a vote admin) for the requested action.                                                                                                 |
| **404 Not Found**             | Resource not found.                 | No resource for the given id. For `GET /proposals/{proposalId}`, when the proposal exists but the caller is not allowed to see it, the API returns **403 Forbidden** instead.                              |
| **409 Conflict**              | Concurrent or state conflict.       | Live proposal update lost optimistic version CAS (retry after re-fetch); notification `PUT` while a different `pendingEmail` is awaiting verification (`PENDING_EMAIL_EXISTS`).                            |
| **429 Too Many Requests**     | Rate limit exceeded.                | Per-IP or per-user limit exceeded (see Section 6).                                                                                                                                                         |
| **503 Service Unavailable**   | Temporary dependency failure.       | Live proposal submit/update cannot verify treasury donation because chain-data providers are unavailable or throttled (retry; honour `Retry-After` when present). Also used when a vote validation script cannot be loaded. |
| **500 Internal Server Error** | Server-side failure.                | Unexpected errors (e.g. database failure). The `message` may be generic; details are not guaranteed. Provider outages during treasury verification use **503**, not 500.                                      |

Success responses use **200 OK** or **201 Created** (for create endpoints). Some 200 responses
return a resource body; others (e.g., logout, draft delete) may return an envelope such as
`{ "status": "success", "message": "..." }`. Redirects and other status codes
are not used for the endpoints defined in this specification.

---

## Revision History

This document follows [Semantic Versioning 2.0.0](https://semver.org/). Version
numbers use the form **MAJOR.MINOR.PATCH**:

- **MAJOR** — Incompatible specification or API changes (e.g., breaking
  request/response contracts or removed endpoints).
- **MINOR** — Backwards-compatible additions (e.g., new endpoints, new optional
  fields, new sections).
- **PATCH** — Backwards-compatible fixes and clarifications (e.g., typo
  corrections, clarified wording, no contract change).

| Version | Date       | Description                                                                                                                                                                                                                                                                                                                                                                                                                            |
|---------|------------|----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| 1.4.1   | 2026-09-07 | Clarify treasury donation hash uniqueness is global (any vote) for non-draft/non-archived proposals; concurrent draft→live promotes that collide return the same `400` `errors` tree for `metaData.treasuryDonationTxHash` (#418). |
| 1.4.0   | 2026-07-24 | Document `503` on live `POST`/`PUT /proposals` when treasury donation verification cannot reach chain-data providers (fixed retry message; optional `Retry-After`). Clarify genuine verification failures remain `400` with `errors` for `metaData.treasuryDonationTxHash`. Add `503` to §7.2. |
| 1.3.0   | 2026-07-23 | Live `PUT /proposals/{proposalId}`: optimistic version CAS and `409 Conflict` on concurrent update (F-006). Added §5.9 notification settings endpoints. Documented `409` in §7.2. Aligned proposal withdraw windows with implementation (proposer ≤ `reviewEndDate`; admin before `votingStartDate`). Removed dangling Ekklesia Integration Plan reference. |
| 1.2.2   | 2026-07-23 | `DELETE /proposals/{proposalId}` success documented as `200 OK` JSON (`status`/`message`), matching implementation (F-027). Removed obsolete 204 No Content convention.                                                                                                                                                                                                                                                                  |
| 1.2.1   | 2026-07-17 | Clarify multisig `scriptAddress` on `POST`/`PUT /session`: membership-only native-script check by design (F-002); link to system-architecture §8.1.                                                                                                                                                                                                                                                                                      |
| 1.2.0   | 2026-02-23 | Comment response: `user` renamed to `author`; top-level `userId` and `authorType` removed. Withdrawn comments visible to admin and comment author; `excludeWithdrawn` query param for comments and replies. Replies to withdrawn comments rejected with 400. `withdrawalDetails._id` excluded from response. |
| 1.1.0   | 2026-02-20 | Some updates to spec to bring alignment with latest deployed changes                                                                                                                                                                                                                                                                                                                                                                   |
| 1.0.0   | 2026-02-20 | Publish version "1.0.0" to represent initial MVP status of API endpoints                                                                                                                                                                                                                                                                                                                                                               |
| 0.2.7   | 2026-02-20 | Terminology update - Rename "Budget" item to "Vote" to better align future use cases                                                                                                                                                                                                                                                                                                                                                   |
| 0.2.6   | 2026-02-19 | Updates to grammar and formatting.                                                                                                                                                                                                                                                                                                                                                                                                     |
| 0.2.5   | 2026-02-18 | `GET /proposals`: `status` parameter documented as accepting comma-separated values (e.g. `live,withdrawn`) to return proposals in any of the given statuses. Note updated accordingly.                                                                                                                                                                                                                                                |
| 0.2.4   | 2026-02-18 | `GET /session`: success response now includes optional `name` (user display name from User record) and optional `adminVoteIds` (array of vote IDs where the user is an admin; present only when non-empty). `GET /proposals` list: clarified shortened `metaData` (strategicFocusArea, proposalType, initiativeType); list item example uses `summary` and trimmed metaData. `GET /proposals/{proposalId}` example includes `summary`. |
| 0.2.3   | 2026-02-18 | `GET /proposals/{proposalId}`: when the proposal exists but the requester is not allowed to see it (e.g. draft/archived, not proposer or vote admin), the API returns **403 Forbidden** with a permission message; **404 Not Found** is returned only when no proposal exists with the given ID. §7.2 updated accordingly.                                                                                                             |
| 0.2.2   | 2026-02-16 | Proposal request/response aligned with [proposal-schema-description.md](proposal-schema-description.md): `summary` (not `description`), full `metaData` structure and max lengths; server-set fields (`_id`, `proposerId`, `version`, `versions`, `submittedAt`, etc.) documented; references to schema/Proposal.js for internal tracking.                                                                                             |
| 0.2.1   | 2026-02-16 | Legal declarations aligned with CBC Proposal Template PDF: four checkboxes (`dataProtection`, `publicVisibilityConsent`, `authorizationEntity`, `authorizationAttestation`) plus optional `submitterName`, `submitterRole`, `submitterEmail`.                                                                                                                                                                                          |
| 0.2.0   | 2026-02-04 | Rate limiting & caching (Section 6), Error responses (Section 7), Revision history.                                                                                                                                                                                                                                                                                                                                                    |
| 0.1.0   | 2026-02-03 | Initial specification: public endpoints (§3), authentication (§4), authenticated write endpoints (§5).                                                                                                                                                                                                                                                                                                                                 |
