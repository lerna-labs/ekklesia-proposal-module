# Budget 2026 — Frontend vs backend validation review

---

| Field            | Detail                                                                 |
|------------------|------------------------------------------------------------------------|
| **Version**      | 2.1.0                                                                  |
| **Created**      | 2025-03-03                                                             |
| **Last Revised** | 2025-03-15                                                             |
| **Backend**      | `validation/budget2026/validationScript.js`                             |
| **Frontend**     | `__frontend/src/lib/forms/budget2026/` (Schema.js + form components)  |

---

**Backend validation is the source of truth.** The validation script runs on the server for every proposal create/update; it defines the real rules and error messages. The frontend can improve UX by mirroring some rules (e.g. min/max length, required fields) so users see errors before submit, but **only the backend determines whether a payload is accepted**. This document describes what the backend enforces and where the frontend currently aligns or differs.

---

## 1. Backend validation (source of truth)

The backend ([validation/budget2026/validationScript.js](../../../validation/budget2026/validationScript.js)) validates the full proposal body for **status `"live"`** (submit); for **drafts** it requires `voteId` and optionally `title` (title can be empty). Key rules:

- **Form-level:** `title` min 1 max 100, `summary` min 1 max 2000, `status` enum draft/live.
- **metaData:** `trackRecord` max 5000, `estimatedDuration` (number 1–60 months), `strategyFramework` (pillars, pillarRationale max 10000, kpiAlignment max 10000), `proposalDetails` (conversionRate number > 0, max 2 decimals, workPackages min 1), `treasuryRepayment` Yes/No, `treasuryRepaymentCircumstances` max 10000, `priorFunding` max 10000, `proposerDetails`, `supportingInfoLinks`, `legalDeclarations`, etc.
- **Work packages:** name max 100, summary max 2000, initiativeType, proposalType, supportingDocuments (link title max 100), coreObjectives (min 1, each max 1000), expectedValue max 2000, metric max 2000, milestones (name max 100, deliverables max 4000, acceptanceCriteria max 4000, duration 1–240 weeks), budgetBreakdown **min 1** (item name max 100, description max 1000, quantity > 0 max 2 decimals, unitPrice ≥ 0.001), noMilestonesBreakdown + milestoneAlternative max 4000 when applicable; when not “no milestones”, **at least one milestone** required.
- **Milestones:** field name is `name` (not `milestoneName`).

All limits and “at least one” rules above are enforced only on the backend; the frontend may or may not mirror them.

---

## 2. Where the frontend differs or could improve

These are **not** bugs in the backend; they are gaps or UX improvements on the frontend. Backend will reject invalid payloads regardless.

| Topic | Backend | Frontend | Note |
|-------|---------|----------|------|
| Budget rows per work package | min 1 required | Optional (no min) | User can submit with 0 rows; backend rejects. Optional: enforce in UI or work package schema. |
| At least one milestone | Required when not “no milestones” | Not enforced | Same as above; backend error only at submit. |
| conversionRate | number > 0, max 2 decimals | InputNumber, maxDecimals 2, normalizes comma/dot | Aligned. |
| estimatedDuration | number 1–60 | InputNumber, min 1 max 60, step 1, maxDecimals 0 | Aligned. |
| Title / summary required | min 1 (non-empty) | required, no minLength | Aligned. |
| Work package supporting doc title | max 100 | max 100 (LinkListEditor) | Aligned. |
| Additional Info link title | max 100 | max 100 | Aligned. |
| Budget item name | max 100 | max 100 | Aligned. |

---

## 3. Reference: backend vs frontend limits

| Field / rule | Backend | Frontend |
|--------------|---------|----------|
| Title | min 1, max 100 | required, max 100 |
| Summary | min 1, max 2000 | required, max 2000 |
| Track record | max 5000 | max 5000 |
| Estimated duration | 1–60 months, integer | min 1, max 60, step 1, maxDecimals 0 |
| Milestone title field | `name` | `name` |
| Milestone deliverables / acceptanceCriteria / duration | 4000 / 4000 / 1–240 weeks | 4000 / 4000 / 1–240, step 1 |
| Work package name / summary | 100 / 2000 | 100 / 2000 |
| Work package coreObjectives (each) / expectedValue / metric | 1000 / 2000 / 2000 | 1000 / 2000 / 2000 |
| Work package budget item name / description | 100 / 1000 | 100 / 1000 |
| Work package budgetBreakdown | min 1 | optional |
| At least one milestone (when not “no milestones”) | required | not enforced |
| Strategy pillarRationale / kpiAlignment | 10000 / 10000 | 10000 / 10000 |
| conversionRate | number > 0, max 2 decimals | maxDecimals 2, normalizes input |
| Additional Info link title | 100 | 100 |
| Work package supporting doc title | 100 | 100 |

---

## 4. Optional improvements

- **Cost categories:** `costCategories.json` exists under both `validation/budget2026/` and `__frontend/.../budget2026/`. Keep them in sync when categories change.
- **Keep in sync:** Link title max (100) is defined in both backend validation and frontend Schema.js / LinkListEditor; keep them aligned if the limit ever changes.
- **Optional UX improvement:** Mirror more backend rules on the client (e.g. budget row count, milestone count) so users see errors before submit; backend remains the authority.

---

## Revision History

| Version | Date       | Description |
|---------|------------|-------------|
| 1.0.0   | 2025-03-03 | Initial review. |
| 2.0.0   | 2025-03-03 | Reworked: backend as single source of truth; removed fixed-issue tracking; document focuses on current backend rules and frontend alignment/differences. |
| 2.1.0   | 2025-03-15 | Updated limits to match current backend and frontend: WP summary/expectedValue/metric 2000; milestone duration 1–240; budget item name 100; strategy 10000/10000; conversionRate and estimatedDuration frontend alignment. |
