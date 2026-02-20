# Vote schema – field reference

---

| Field              | Detail                                                                                                  |
|--------------------|---------------------------------------------------------------------------------------------------------|
| **Document Title** | Vote Schema – Field Reference                                                                           |
| **Version**        | 0.1.2                                                                                                   |
| **Created**        | February 18, 2026                                                                                       |
| **Last Revised**   | February 20, 2026                                                                                       |
| **Companion Doc**  | [System Architecture Specification](system-architecture.md) · [API Specification](api-specification.md) |
| **Prepared By**    | Adam Dean · <adam@crypto2099.io>, Mad Orkestra · <mad@madorkestra.com>                                  |
| **Status**         | Draft                                                                                                   |

---

This document lists every Vote field (formerly Budget): **schema path**, *
*required** status, **type**, and **validation** notes. Votes represent funding
cycles with submission, feedback, and review windows.
Implementation: [../schema/Vote.js](../schema/Vote.js).

> MongoDB collection name remains `budgets` for backward compatibility.

---

## Top-level (vote root)

| Field            | Schema path              | Required | Type            | Validation / notes                                                                                                                                                              |
|------------------|--------------------------|----------|-----------------|---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| Title            | `title`                  | Yes      | String          | Display name of the vote cycle.                                                                                                                                                 |
| Description      | `description`            | Yes      | String          | Description of the vote.                                                                                                                                                        |
| Slug             | `slug`                   | Yes      | String          | URL-friendly identifier; used in `GET /api/v0/votes/:slug` and frontend routes (e.g. `/votes/{slug}`). Must be unique; exact match in list filter.                              |
| Admins           | `admins`                 | Yes      | Array of String | Bech32 addresses (stake/DRep/pool) of users who can administer this vote (e.g. withdraw proposals, manage comments). Used for `GET /session` `adminVoteIds` and access control. |
| Submission start | `submissionStartDate`    | Yes      | Date            | ISO 8601. Proposals can be submitted (as live) from this date.                                                                                                                  |
| Submission end   | `submissionEndDate`      | Yes      | Date            | ISO 8601. No new proposals (including drafts) after this date.                                                                                                                  |
| Feedback start   | `feedbackStartDate`      | Yes      | Date            | ISO 8601. Start of feedback period (e.g. comments, proposer withdrawal).                                                                                                        |
| Feedback end     | `feedbackEndDate`        | Yes      | Date            | ISO 8601. End of feedback period; proposer withdrawal and admin comment withdrawal typically allowed only until this date.                                                      |
| Review start     | `reviewStartDate`        | Yes      | Date            | ISO 8601. Start of review period.                                                                                                                                               |
| Review end       | `reviewEndDate`          | Yes      | Date            | ISO 8601. End of review period.                                                                                                                                                 |
| (timestamps)     | `createdAt`, `updatedAt` | —        | Date            | Set by Mongoose `timestamps: true`.                                                                                                                                             |

---

## Enums and constraints

- **`admins`**: Array of non-empty strings (Bech32 addresses). No enum;
  validated by auth layer.
- **Dates**: Typically `submissionStartDate` ≤ `submissionEndDate`,
  `feedbackStartDate` ≤ `feedbackEndDate`, `reviewStartDate` ≤ `reviewEndDate`;
  ordering may be enforced in application or seeding logic.

---

---

## Example Vote Payload

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
  "submissionStartDate": "2026-01-15T10:00:00Z",
  "submissionEndDate": "2026-02-15T23:59:59Z",
  "feedbackStartDate": "2026-02-16T00:00:00Z",
  "feedbackEndDate": "2026-03-15T23:59:59Z",
  "reviewStartDate": "2026-03-16T00:00:00Z",
  "reviewEndDate": "2026-04-15T23:59:59Z",
  "votingUrl": "https://ekklesia.vote/cardano-governance-budget-q1-2026",
  "createdAt": "2026-01-10T08:00:00Z",
  "updatedAt": "2026-01-20T14:30:00Z"
}
```

## Related docs

- [api-specification.md](api-specification.md)
  -
  `GET /votes` - [API Specification §3.1](api-specification.md#31-get-votes)
  -
  `GET /votes/{voteId}` - [API Specification §3.2](api-specification.md#32-get-votesvoteid)
  -
  `GET /votes/{voteId}/categories` - [API Specification §3.3](api-specification.md#33-get-votesvoteidcategories)
  -
  `GET /votes?slug={slug}` [API Specification §3.1](api-specification.md#31-get-votes)
- Schema implementation: [../schema/Vote.js](../schema/Vote.js).

---

## Revision History

This document follows [Semantic Versioning 2.0.0](https://semver.org/). Version
numbers use the form **MAJOR.MINOR.PATCH**:

- **MAJOR** — Incompatible schema or field changes (e.g., renamed paths, removed
  fields).
- **MINOR** — Backwards-compatible additions (e.g., new fields, new
  constraints).
- **PATCH** — Backwards-compatible fixes and clarifications (e.g., typo
  corrections, clarified wording).

| Version | Date       | Description                                                                    |
|---------|------------|--------------------------------------------------------------------------------|
| 0.1.2   | 2026-02-20 | Terminology updates to rename from Budgets to Votes for future-proofing        |
| 0.1.1   | 2026-02-19 | Grammar and formatting updates.                                                |
| 0.1.0   | 2026-02-18 | Initial schema description: metadata block, field reference, revision history. |
