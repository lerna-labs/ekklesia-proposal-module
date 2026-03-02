# Budget 2026 — Strategy Framework (form section)

---

| Field            | Detail                                                                 |
|------------------|------------------------------------------------------------------------|
| **Version**      | 1.0.0                                                                  |
| **Created**      | 2025-03-02                                                             |
| **Last Revised** | 2025-03-02                                                             |
| **Component**    | `__frontend/src/lib/forms/budget2026/FormStrategyFramework.svelte`     |

---

Form section component: `__frontend/src/lib/forms/budget2026/FormStrategyFramework.svelte`.

Describes the form fields used in this section: path in `formData`, type, constraints, and visibility. Categories (strategic pillars) are loaded from the vote and passed as the `categories` prop.

---

## Fields

| Field | formData path | Type | maxLength | required | public |
|-------|----------------|------|-----------|----------|--------|
| Strategic Pillars | `formData.metaData.strategyFramework.pillars` | array (category IDs) | — | yes | yes |
| Rationale for your selection | `formData.metaData.strategyFramework.pillarRationale` | textarea | 15000 | yes | yes |
| Alignment to KPIs | `formData.metaData.strategyFramework.kpiAlignment` | textarea | 10000 | yes | yes |

---

## Field details

### Strategic Pillars
- **Path:** `formData.metaData.strategyFramework.pillars`
- **Label:** Strategic Pillars
- **Description:** Select the pillars that align most with your proposal. Look at the focus areas provided as example for each pillar. Select one or more from the vote’s categories.
- **Type:** multi-select (array of category `_id` values); options come from `categories` prop.
- **maxLength:** —
- **required:** yes
- **public:** yes
- **min/max:** —

### Rationale for your selection
- **Path:** `formData.metaData.strategyFramework.pillarRationale`
- **Label:** Rationale for your selection
- **Description:** Focus on how your proposal provides value towards those pillars.
- **Type:** `textarea`
- **maxLength:** 15000
- **required:** yes
- **public:** yes
- **min/max:** —

### Alignment to KPIs
- **Path:** `formData.metaData.strategyFramework.kpiAlignment`
- **Label:** Alignment to KPIs
- **Description:** Align to existing KPI or describe additional KPIs. Explain specific actions, methods, or approaches per KPI where relevant.
- **Type:** `textarea`
- **maxLength:** 10000
- **required:** yes
- **public:** yes
- **min/max:** —

---

## Revision History

This document follows [Semantic Versioning 2.0.0](https://semver.org/). Version numbers use the form **MAJOR.MINOR.PATCH**.

| Version | Date       | Description |
|---------|------------|-------------|
| 1.0.0   | 2025-03-02 | Initial doc: Fields table and field details for Strategy Framework section. |
