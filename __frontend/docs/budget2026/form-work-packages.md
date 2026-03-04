# Budget 2026 — Work Packages (form section)

---

| Field            | Detail                                                                 |
|------------------|------------------------------------------------------------------------|
| **Version**      | 1.0.0                                                                  |
| **Created**      | 2025-03-03                                                             |
| **Last Revised** | 2025-03-03                                                             |
| **Component**    | `__frontend/src/lib/forms/budget2026/FormWorkPackages.svelte`          |

---

Form section component: `__frontend/src/lib/forms/budget2026/FormWorkPackages.svelte`.

List editor for work packages: add, edit (dialog), and delete. Each work package is edited in an `AlertDialog`; list items are rendered as `FormWorkPackagesCard` (name, milestones, budget breakdown, edit/delete). Pattern matches `LinkListEditor`: list of items, edit via dialog, trash to remove, Add button.

Data path: `formData.metaData.proposalDetails.workPackages` (array of work package objects). Validation uses `workPackageSchema` from `Schema.js`.

---

## Fields (per work package)

| Field                 | formData path (per item)     | Type              | maxLength   | required | public |
|-----------------------|------------------------------|-------------------|-------------|----------|--------|
| Work Package Name     | `workPackages[].name`         | text              | 100         | yes      | yes    |
| Work Package Summary  | `workPackages[].summary`     | textarea          | 10000       | yes      | yes    |
| Initiative Type       | `workPackages[].initiativeType` | radio          | —           | yes      | yes    |
| Type of Proposal      | `workPackages[].proposalType` | radio             | —           | yes      | yes    |
| Supporting Documents  | `workPackages[].supportingDocuments` | array of link | title 100   | no       | yes    |
| Core Objectives       | `workPackages[].coreObjectives` | array of text   | 1000 each   | min 1    | yes    |
| Expected Value (ROI)  | `workPackages[].expectedValue` | textarea         | 1000        | yes      | yes    |
| Metric                | `workPackages[].metric`      | textarea          | 600         | yes      | yes    |
| Milestones            | `workPackages[].milestones`   | array (see below) | —           | no*      | yes    |
| Budget Breakdown      | `workPackages[].budgetBreakdown` | array (see Schema) | —        | no       | yes    |
| No Milestones Option  | `workPackages[].noMilestonesBreakdown` | boolean   | —           | no       | yes    |
| Milestone Alternative | `workPackages[].milestoneAlternative` | textarea   | 4000        | if no milestones | yes |

\* When `noMilestonesBreakdown` is false, at least one milestone is typically expected (enforced on backend on submit). When true, `milestoneAlternative` is required.

**Initiative Type** options: `New Initiative`, `Maintenance`.  
**Type of Proposal** options: `Technical (software/IT)`, `Non-technical`.

---

## Field details

### Work Package Name
- **Path:** `workPackages[].name`
- **Label:** Work Package Name
- **Description:** A descriptive name for this specific work package.
- **Type:** `text` (Input)
- **maxLength:** 100
- **required:** yes
- **public:** yes

### Work Package Summary
- **Path:** `workPackages[].summary`
- **Label:** Work Package Summary
- **Description:** High-level description of the work: main activities and, where relevant, key outputs or deliverables. Goal is to give reviewers enough context without a detailed delivery plan.
- **Type:** `textarea`
- **maxLength:** 10000
- **required:** yes
- **public:** yes

### Initiative Type
- **Path:** `workPackages[].initiativeType`
- **Label:** Initiative Type
- **Description:** Is this a brand new project or the continuation/maintenance of an existing one?
- **Type:** radio (RadioGroup)
- **Options:** New Initiative, Maintenance
- **required:** yes
- **public:** yes

### Type of Proposal
- **Path:** `workPackages[].proposalType`
- **Label:** Type of Proposal
- **Description:** Classification of the proposal type (technical vs non-technical).
- **Type:** radio (RadioGroup)
- **Options:** Technical (software/IT), Non-technical
- **required:** yes
- **public:** yes

### Supporting Documentation
- **Path:** `workPackages[].supportingDocuments`
- **Label:** Supporting Documentation
- **Description:** Link any relevant diagrams, technical specs, or planning documents (PDF, PNG, JPG).
- **Type:** array of `{ title: string, url: string }` (LinkListEditor)
- **Per-item:** title max 100, url valid URL
- **required:** no (list may be empty)
- **public:** yes

### Core Objectives
- **Path:** `workPackages[].coreObjectives`
- **Label:** (via FormWorkPackagesObjectives)
- **Description:** What this work package is intended to achieve; at least one objective required.
- **Type:** array of strings (FormWorkPackagesObjectives)
- **maxLength per item:** 1000
- **required:** at least one objective
- **public:** yes

### Expected Value (ROI)
- **Path:** `workPackages[].expectedValue`
- **Label:** Expected Value (ROI)
- **Description:** What will change or improve for Cardano as a result of this work package; may be qualitative or quantitative, not necessarily financial.
- **Type:** `textarea`
- **maxLength:** 1000
- **required:** yes
- **public:** yes

### Metric
- **Path:** `workPackages[].metric`
- **Label:** Metric
- **Description:** How success will be measured; one or more metrics to demonstrate whether expected value has been achieved.
- **Type:** `textarea`
- **maxLength:** 600
- **required:** yes
- **public:** yes

### Milestones
- **Path:** `workPackages[].milestones`
- **Label:** (per milestone: name, deliverables, acceptance criteria, duration)
- **Description:** Optional list of milestones; each has name (max 100), deliverables (max 4000), acceptance criteria (max 4000), duration (max 100). Edited in FormWorkPackagesCard / FormWorkPackagesMilestones.
- **Type:** array of `{ name, deliverables, acceptanceCriteria, duration }`
- **required:** no (unless noMilestonesBreakdown is false; backend may require at least one on submit)
- **public:** yes

### Budget Breakdown
- **Path:** `workPackages[].budgetBreakdown`
- **Label:** (per row: costCategory, name, description, quantity, unitPrice; total derived)
- **Description:** Optional budget rows per work package; schema in `Schema.js` (`budgetRowSchema`). Edited in FormWorkPackagesCard / FormWorkPackagesBudget.
- **Type:** array of budget row objects
- **required:** no
- **public:** yes

### No Milestones / Milestone Alternative
- **Path:** `workPackages[].noMilestonesBreakdown`, `workPackages[].milestoneAlternative`
- **Label:** (checkbox + text when “no milestones” is selected)
- **Description:** When the proposer does not use milestones breakdown, an alternative description is required (max 4000).
- **Type:** boolean + textarea
- **milestoneAlternative maxLength:** 4000
- **required:** milestoneAlternative required when noMilestonesBreakdown is true
- **public:** yes

---

## Subcomponents

- **FormWorkPackagesCard** — Renders one work package in the list (name, expand/edit for milestones and budget, edit/delete actions).
- **FormWorkPackagesObjectives** — Core objectives editor used inside the Add/Edit dialog.
- **FormWorkPackagesMilestones** / **FormWorkPackagesBudget** — Used inside the card or dialog for milestones and budget rows (see their docs if present).

---

## Versioning

Keep this doc in sync with the component and `Schema.js` when you change fields or constraints. Use the same scheme as [api-specification.md](../../../docs/api-specification.md):

1. **Semantic versioning** — Bump **MAJOR** for incompatible field/contract changes. Bump **MINOR** for backwards-compatible additions. Bump **PATCH** for clarifications or typo fixes only.
2. **Metadata** — Update **Version** and **Last Revised** in the table at the top when you change this file.
3. **Revision history** — Add a row to the Revision History table below.
4. **Component anchor** — In `FormWorkPackages.svelte`, add a comment that references this doc and the current **Version**, e.g. `/** @see __frontend/docs/budget2026/form-work-packages.md Version: 1.0.0 */`.

---

## Revision History

This document follows [Semantic Versioning 2.0.0](https://semver.org/). Version numbers use the form **MAJOR.MINOR.PATCH**.

| Version | Date       | Description |
|---------|------------|-------------|
| 1.0.0   | 2025-03-03 | Initial doc: Fields table and field details for Work Packages section (FormWorkPackages.svelte). |
