# Budget 2026 — Frontend vs backend validation review

---

| Field            | Detail                                                                 |
|------------------|------------------------------------------------------------------------|
| **Version**      | 2.0.0                                                                  |
| **Created**      | 2025-03-03                                                             |
| **Last Revised** | 2025-03-03                                                             |
| **Backend**      | `validation/budget2026/validationScript.js`                             |
| **Frontend**     | `__frontend/src/lib/forms/budget2026/` (Schema.js + form components)  |

---

**Backend validation is the source of truth.** The validation script runs on the server for every proposal create/update; it defines the real rules and error messages. The frontend can improve UX by mirroring some rules (e.g. min/max length, required fields) so users see errors before submit, but **only the backend determines whether a payload is accepted**. This document describes what the backend enforces and where the frontend currently aligns or differs.

---

## 1. Backend validation (source of truth)

The backend ([validation/budget2026/validationScript.js](../../../validation/budget2026/validationScript.js)) validates the full proposal body for **status `"live"`** (submit); for **drafts** it requires `voteId` and optionally `title` (title can be empty). Key rules:

- **Form-level:** `title` min 2 max 100, `summary` min 2 max 2000, `status` enum draft/live.
- **metaData:** `trackRecord`, `estimatedDuration` (number ≥ 1), `strategyFramework` (pillars, pillarRationale max 15000, kpiAlignment max 10000), `proposalDetails` (conversionRate number > 0, workPackages min 1), `treasuryRepayment` Yes/No, `treasuryRepaymentCircumstances`, `priorFunding`, `proposerDetails`, `supportingInfoLinks`, `legalDeclarations`, etc.
- **Work packages:** name, summary, initiativeType, proposalType, supportingDocuments, coreObjectives (min 1, each max 1000), expectedValue max 1000, metric max 600, milestones (name, deliverables max 4000, acceptanceCriteria max 4000, duration max 100), budgetBreakdown **min 1**, noMilestonesBreakdown + milestoneAlternative when applicable; when not “no milestones”, **at least one milestone** required.
- **Milestones:** field name is `name` (not `milestoneName`).

All limits and “at least one” rules above are enforced only on the backend; the frontend may or may not mirror them.

---

## 2. Where the frontend differs or could improve

These are **not** bugs in the backend; they are gaps or UX improvements on the frontend. Backend will reject invalid payloads regardless.

| Topic | Backend | Frontend | Note |
|-------|---------|----------|------|
| Budget rows per work package | min 1 required | Optional (no min) | User can submit with 0 rows; backend rejects. Optional: enforce in UI or work package schema. |
| At least one milestone | Required when not “no milestones” | Not enforced | Same as above; backend error only at submit. |
| conversionRate | number > 0 | String, no client check | Empty or invalid value → backend reject. Optional: validate/coerce before submit. |
| estimatedDuration | number ≥ 1 | Can be `""` | Empty → backend reject. Optional: initialise or coerce to number before submit. |
| Title / summary min length | min 2 | minLength 2 in FormProjectDefinition | Aligned. |
| Work package supporting doc title | max 100 | max 100 | Aligned. |
| Additional Info link title | max 100 | max 100 | Aligned. |

---

## 3. Reference: backend vs frontend limits

| Field / rule | Backend | Frontend |
|--------------|---------|----------|
| Title | min 2, max 100 | minLength 2, max 100 |
| Summary | min 2, max 2000 | minLength 2, max 2000 |
| Milestone title field | `name` | `name` |
| Milestone deliverables / acceptanceCriteria / duration | 4000 / 4000 / 100 | 4000 / 4000 / 100 |
| Work package coreObjectives (each) / expectedValue | 1000 / 1000 | 1000 / 1000 |
| Work package budgetBreakdown | min 1 | optional |
| At least one milestone (when not “no milestones”) | required | not enforced |
| Strategy pillarRationale / kpiAlignment | 15000 / 10000 | 15000 / 10000 |
| conversionRate | number > 0 | string, no schema |
| estimatedDuration | number ≥ 1 | can be "" |
| Additional Info link title | 100 | 100 |
| Work package supporting doc title | 100 | 100 |

---

## 4. Optional improvements

- **Cost categories:** `costCategories.json` exists under both `validation/budget2026/` and `__frontend/.../budget2026/`. Keep them in sync when categories change.
- **form-additional-info.md:** Link title max is **100** everywhere (validation, Schema.js, form-additional-info.md, form-work-packages.md).
- **Client-side hints:** Optionally mirror backend rules (conversion rate, estimated duration, budget row count, milestone count) so users see errors before submit; backend remains the authority.

---

## Revision History

| Version | Date       | Description |
|---------|------------|-------------|
| 1.0.0   | 2025-03-03 | Initial review. |
| 2.0.0   | 2025-03-03 | Reworked: backend as single source of truth; removed fixed-issue tracking; document focuses on current backend rules and frontend alignment/differences. |
