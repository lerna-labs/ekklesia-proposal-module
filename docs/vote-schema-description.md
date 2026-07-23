# Vote schema – field reference

---

| Field              | Detail                                                                                                  |
|--------------------|---------------------------------------------------------------------------------------------------------|
| **Document Title** | Vote Schema – Field Reference                                                                           |
| **Version**        | 0.2.0                                                                                                   |
| **Created**        | February 18, 2026                                                                                       |
| **Last Revised**   | July 23, 2026                                                                                       |
| **Companion Doc**  | [System Architecture Specification](system-architecture.md) · [API Specification](api-specification.md) |
| **Prepared By**    | Adam Dean · <adam@crypto2099.io>, Mad Orkestra · <mad@madorkestra.com>                                  |
| **Status**         | Draft                                                                                                   |

---

This document lists every Vote field (formerly Budget): **schema path**, *
*required** status, **type**, and **validation** notes. Votes represent funding
cycles with submission, feedback, and review windows.
Implementation: [../schema/Vote.js](../schema/Vote.js).

---

## Top-level (vote root)

| Field             | Schema path              | Required | Type            | Validation / notes                                                                                                                                                              |
|-------------------|--------------------------|----------|-----------------|---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| Title             | `title`                  | Yes      | String          | Display name of the vote cycle.                                                                                                                                                 |
| Description       | `description`            | Yes      | String          | Description of the vote.                                                                                                                                                        |
| Slug              | `slug`                   | Yes      | String          | URL-friendly identifier; used in `GET /api/v0/votes/:slug` and frontend routes (e.g. `/votes/{slug}`). Must be unique; exact match in list filter.                              |
| Admins            | `admins`                 | Yes      | Array of String | Bech32 addresses (stake/DRep/pool) of users who can administer this vote (e.g. withdraw proposals, manage comments). Used for `GET /session` `adminVoteIds` and access control. |
| Submission start  | `submissionStartDate`    | Yes      | Date            | ISO 8601. Live proposals can be submitted from this instant onward (draft create/edit may still be allowed earlier; see API).                                                      |
| Submission end    | `submissionEndDate`      | Yes      | Date            | ISO 8601. No draft create/update and no new live submits after this date.                                                                                                        |
| Feedback start    | `feedbackStartDate`      | Yes      | Date            | ISO 8601. Start of feedback (e.g. comments on live proposals).                                                                                                        |
| Feedback end      | `feedbackEndDate`        | Yes      | Date            | ISO 8601. End of feedback period (e.g. comments).                                                                                                                      |
| Review start      | `reviewStartDate`        | Yes      | Date            | ISO 8601. Start of review period.                                                                                                                                               |
| Review end        | `reviewEndDate`          | Yes      | Date            | ISO 8601. End of review period; proposer re-submit and proposer withdrawal of **live** proposals are allowed only until this date.                                                                                                                                                 |
| Voting start      | `votingStartDate`        | Yes      | Date            | ISO 8601. When on-chain/platform voting begins; vote **admin** withdrawal of **live** proposals is allowed only **before** this instant.                                                                                                                                               |
| Voting end        | `votingEndDate`          | Yes      | Date            | ISO 8601. When voting ends (for scheduling/display; enforcement may expand later).                                                                                                                                           |
| Validation Script | `validationScript`       | Yes      | String          | Path under `validation/` to the form validation script (e.g. `budget2026/validationScript.js`). Used for POST/PUT proposal validation. |
| Exclude Script    | `excludeScript`          | No       | String          | Optional path to a script that strips non-public fields on public proposal APIs. If set but unloadable, public viewers get `metaData: {}` (fail closed). |
| List Projection Script | `listProjectionScript` | No    | String          | Optional script to shape `GET /proposals` list item payloads. See [proposal-list-projection-contract.md](proposal-list-projection-contract.md). |
| Voting URL        | `votingUrl`              | No       | String          | URL to the Ekklesia Voting Platform for this vote. |
| Results URL       | `resultsUrl`             | No       | String          | External results page (used in results notifications). |
| Results published | `resultsPublishedAt`     | No       | Date \| null    | Set when results are officially published; drives results milestone emails. |
| Notification dispatch | `notificationDispatch.votingOpenedSentAt` | No | Date \| null | Idempotency: set after voting-opened emails sent. |
| — | `notificationDispatch.resultsPublishedSentAt` | No | Date \| null | Idempotency: set after results-published emails sent. |
| Deposit options | `depositOptions.treasuryDonation` | Yes | Number | Mint donation amount in lovelace. |
| — | `depositOptions.depositAddress` | No | String | Bech32 deposit address, or empty for no deposit. |
| — | `depositOptions.depositAmount` | Yes | Number | Min deposit in lovelace (0 = none). |
| Form | `form` | Yes | String | Frontend form folder name (e.g. `budget2026`, `cc-vote2026`). |
| Comments enabled | `commentsEnabled` | Yes | Boolean | Default `true`. |
| Sort options | `sortOptions` | No | Array | Optional; defaults to title / commentCount / submittedAt / updatedAt. |
| Filter options | `filterOptions` | No | Array | Optional SearchFilter config; defaults include status filter. |
| Search options | `searchOptions` | No | Array | Optional free-text search fields; defaults include title, summary, proposerId, `_id`. |
| Meta data | `metaData` | No | Mixed | Vote-specific payload (e.g. strategyFramework.pillars). |
| (timestamps)      | `createdAt`, `updatedAt` | —        | Date            | Set by Mongoose `timestamps: true`.                                                                                                                                             |

---

## Enums and constraints

- **`admins`**: Array of non-empty strings (Bech32 addresses). No enum;
  validated by auth layer.
- **Dates**: Typically `submissionStartDate` ≤ `submissionEndDate`,
  `feedbackStartDate` ≤ `feedbackEndDate`, `reviewStartDate` ≤ `reviewEndDate`;
  ordering may be enforced in application or seeding logic.

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
  "votingStartDate": "2026-04-16T00:00:00Z",
  "votingEndDate": "2026-05-15T23:59:59Z",
  "votingUrl": "https://ekklesia.vote/cardano-governance-budget-q1-2026",
  "createdAt": "2026-01-10T08:00:00Z",
  "updatedAt": "2026-01-20T14:30:00Z"
}
```

---

## Related docs

- [api-specification.md](api-specification.md)
  - `GET /votes` - [API Specification §3.1](api-specification.md#31-get-votes)
  - `GET /votes/{identifier}` - [API Specification §3.2](api-specification.md#32-get-votesidentifier)
  - `GET /votes/{voteId}/categories` - [API Specification §3.3](api-specification.md#33-get-votesvoteidcategories)
- [notification-system-implementation.md](notification-system-implementation.md) — `notificationDispatch`, `resultsPublishedAt`
- [proposal-list-projection-contract.md](proposal-list-projection-contract.md) — `listProjectionScript`
- Schema implementation: 
  - [../schema/Vote.js](../schema/Vote.js).

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
| 0.2.0   | 2026-07-23 | Document `excludeScript`, `listProjectionScript`, `notificationDispatch`, results URLs/dates, `depositOptions`, `form`, filter/sort/search options. |
| 0.1.4   | 2026-04-14 | Document `votingStartDate` / `votingEndDate`; align window notes with API (drafts, feedback, review, admin withdraw) |
| 0.1.3   | 2026-02-20 | Update missing `validationScript` and `votingUrl` from schema                  |
| 0.1.2   | 2026-02-20 | Terminology updates to rename from Budgets to Votes for future-proofing        |
| 0.1.1   | 2026-02-19 | Grammar and formatting updates.                                                |
| 0.1.0   | 2026-02-18 | Initial schema description: metadata block, field reference, revision history. |
