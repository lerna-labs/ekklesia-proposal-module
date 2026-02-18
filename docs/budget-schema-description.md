# Budget schema – field reference

---

| Field              | Detail                                                                 |
|--------------------|----------------------------------------------------------------------- |
| **Document Title** | Budget Schema – Field Reference                                       |
| **Version**        | 0.1.0                                                                 |
| **Created**        | February 18, 2026                                                     |
| **Last Revised**   | February 18, 2026                                                     |
| **Companion Doc**  | Ekklesia Integration Plan · [API Specification](api-specification.md)  |
| **Prepared By**    | Adam Dean · <adam@crypto2099.io>, Mad Orkestra · <mad@madorkestra.com> |
| **Status**         | Draft                                                                 |

---

This document lists every Budget field: **schema path**, **required** status, **type**, and **validation** notes. Budgets represent funding cycles with submission, feedback, and review windows. Implementation: [../schema/Budget.js](../schema/Budget.js).

---

## Top-level (budget root)

| Field | Schema path | Required | Type | Validation / notes |
|-------|-------------|----------|------|--------------------|
| Title | `title` | Yes | String | Display name of the budget cycle. |
| Description | `description` | Yes | String | Description of the budget. |
| Slug | `slug` | Yes | String | URL-friendly identifier; used in `GET /api/v0/budgets/:slug` and frontend routes (e.g. `/budgets/{slug}`). Must be unique; exact match in list filter. |
| Admins | `admins` | Yes | Array of String | Bech32 addresses (stake/DRep/pool) of users who can administer this budget (e.g. withdraw proposals, manage comments). Used for `GET /session` `adminBudgetIds` and access control. |
| Submission start | `submissionStartDate` | Yes | Date | ISO 8601. Proposals can be submitted (as live) from this date. |
| Submission end | `submissionEndDate` | Yes | Date | ISO 8601. No new proposals (including drafts) after this date. |
| Feedback start | `feedbackStartDate` | Yes | Date | ISO 8601. Start of feedback period (e.g. comments, proposer withdrawal). |
| Feedback end | `feedbackEndDate` | Yes | Date | ISO 8601. End of feedback period; proposer withdrawal and admin comment withdrawal typically allowed only until this date. |
| Review start | `reviewStartDate` | Yes | Date | ISO 8601. Start of review period. |
| Review end | `reviewEndDate` | Yes | Date | ISO 8601. End of review period. |
| (timestamps) | `createdAt`, `updatedAt` | — | Date | Set by Mongoose `timestamps: true`. |

---

## Enums and constraints

- **`admins`**: Array of non-empty strings (Bech32 addresses). No enum; validated by auth layer.
- **Dates**: Typically `submissionStartDate` ≤ `submissionEndDate`, `feedbackStartDate` ≤ `feedbackEndDate`, `reviewStartDate` ≤ `reviewEndDate`; ordering may be enforced in application or seeding logic.

---

## Related docs

- [api-specification.md](api-specification.md) – `GET /budgets`, `GET /budgets/{budgetId}`, `GET /budgets/{budgetId}/categories`, `GET /budgets/:slug`.
- Schema implementation: [../schema/Budget.js](../schema/Budget.js).

---

## Revision History

This document follows [Semantic Versioning 2.0.0](https://semver.org/). Version numbers use the form **MAJOR.MINOR.PATCH**:

- **MAJOR** — Incompatible schema or field changes (e.g. renamed paths, removed fields).
- **MINOR** — Backwards-compatible additions (e.g. new fields, new constraints).
- **PATCH** — Backwards-compatible fixes and clarifications (e.g. typo corrections, clarified wording).

| Version | Date       | Description |
|---------|------------|-------------|
| 0.1.0   | 2026-02-18 | Initial schema description: metadata block, field reference, revision history. |
