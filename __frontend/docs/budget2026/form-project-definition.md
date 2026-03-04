# Budget 2026 — Project Definition (form section)

---

| Field            | Detail                                                                 |
|------------------|------------------------------------------------------------------------|
| **Version**      | 1.0.0                                                                  |
| **Created**      | 2025-03-02                                                             |
| **Last Revised** | 2025-03-02                                                             |
| **Component**    | `__frontend/src/lib/forms/budget2026/FormProjectDefinition.svelte`    |

---

Form section component: `__frontend/src/lib/forms/budget2026/FormProjectDefinition.svelte`.

Describes the form fields used in this section: path in `formData`, type, constraints, and visibility.

---

## Fields

| Field | formData path | Type | maxLength | required | public |
|-------|----------------|------|-----------|----------|--------|
| Proposal Title | `formData.title` | text | 100 | yes | yes |
| Executive Summary | `formData.summary` | textarea | 2000 | yes | yes |
| Track Record | `formData.metaData.trackRecord` | textarea | 650 | no | yes |
| Estimated Duration | `formData.metaData.estimatedDuration` | number | — | yes | yes |

---

## Field details

### Proposal Title
- **Path:** `formData.title`
- **Label:** Proposal Title
- **Description:** The official name of your project as it will appear in governance voting.
- **Type:** `text` (Input)
- **maxLength:** 100
- **required:** yes
- **public:** yes (not passed to component; defaults to public)
- **min/max:** —

### Executive Summary
- **Path:** `formData.summary`
- **Label:** Executive Summary
- **Description:** A high-level overview of the problem, solution, and impact. This is the first thing voters read.
- **Type:** `textarea`
- **maxLength:** 2000
- **required:** yes
- **public:** yes

### Track Record
- **Path:** `formData.metaData.trackRecord`
- **Label:** Track Record
- **Description:** Proven history of delivery. Mention previous successful proposals, mainnet deployments, or relevant enterprise experience.
- **Type:** `textarea`
- **maxLength:** 650
- **required:** no
- **public:** yes

### Estimated Duration
- **Path:** `formData.metaData.estimatedDuration`
- **Label:** Estimated Duration
- **Description:** Estimated duration of the project proposal in months.
- **Type:** `number` (Input)
- **min:** 1
- **maxLength:** —
- **required:** yes
- **public:** yes

---

## Revision History

This document follows [Semantic Versioning 2.0.0](https://semver.org/). Version numbers use the form **MAJOR.MINOR.PATCH**.

| Version | Date       | Description |
|---------|------------|-------------|
| 1.0.0   | 2025-03-02 | Initial doc: Fields table and field details for Project Definition section. |
