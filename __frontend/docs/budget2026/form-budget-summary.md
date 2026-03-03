# Budget 2026 — Budget Summary (form section)

---

| Field            | Detail                                                                 |
|------------------|------------------------------------------------------------------------|
| **Version**      | 1.0.0                                                                  |
| **Created**      | 2025-03-03                                                             |
| **Last Revised** | 2025-03-03                                                             |
| **Component**    | `__frontend/src/lib/forms/budget2026/FormBudgetSummary.svelte`       |

---

Form section component: `__frontend/src/lib/forms/budget2026/FormBudgetSummary.svelte`.

Describes the form fields used in this section: path in `formData`, type, constraints, and visibility.

---

## Fields

| Field | formData path | Type | maxLength | required | public |
|-------|----------------|------|-----------|----------|--------|
| Treasury Repayment | `formData.metaData.treasuryRepayment` | choice (radio) | — | yes | yes |
| Repayment Circumstances | `formData.metaData.treasuryRepaymentCircumstances` | textarea | 10000 | no | yes |
| Prior Funding | `formData.metaData.priorFunding` | textarea | 10000 | yes | yes |

---

## Field details

### Treasury Repayment
- **Path:** `formData.metaData.treasuryRepayment`
- **Label:** Treasury Repayment
- **Description:** Select whether your proposal includes any form of treasury repayment (for example, unused funds, profit-sharing, or conditional returns).
- **Type:** choice (RadioGroup)
- **Options:** `"Yes"`, `"No"`
- **maxLength:** —
- **required:** yes
- **public:** yes

### Repayment Circumstances
- **Path:** `formData.metaData.treasuryRepaymentCircumstances`
- **Label:** Repayment Circumstances
- **Description:** Describe the specific conditions or triggers that would result in funds being returned to the Treasury. Helps DReps understand downside protection and fiscal responsibility.
- **Type:** textarea (Textarea)
- **maxLength:** 10000
- **required:** no
- **public:** yes

### Prior Funding
- **Path:** `formData.metaData.priorFunding`
- **Label:** Prior Funding
- **Description:** List any prior funding received from Catalyst, Treasury withdrawals, Intersect programs, or other Cardano ecosystem grants. Enter "N/A" if not applicable.
- **Type:** textarea (Textarea)
- **maxLength:** 10000
- **required:** yes
- **public:** yes

---

## Revision History

This document follows [Semantic Versioning 2.0.0](https://semver.org/). Version numbers use the form **MAJOR.MINOR.PATCH**.

| Version | Date       | Description |
|---------|------------|-------------|
| 1.0.0   | 2025-03-03 | Initial doc: Fields table and field details for Budget Summary section. |
