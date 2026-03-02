# Budget 2026 — [Section Name] (form section)

---

| Field            | Detail                                                                 |
|------------------|------------------------------------------------------------------------|
| **Version**      | 1.0.0                                                                  |
| **Created**      | YYYY-MM-DD                                                             |
| **Last Revised** | YYYY-MM-DD                                                             |
| **Component**    | `__frontend/src/lib/forms/budget2026/Form[SectionName].svelte`        |

---

Form section component: `__frontend/src/lib/forms/budget2026/Form[SectionName].svelte`.

Describes the form fields used in this section: path in `formData`, type, constraints, and visibility.

---

## Fields

| Field | formData path | Type | maxLength | required | public |
|-------|----------------|------|-----------|----------|--------|
| … | `formData.…` | text / textarea / number / etc. | — | yes / no | yes / no |

---

## Field details

### [Field label]
- **Path:** `formData.…`
- **Label:** …
- **Description:** …
- **Type:** `text` (Input) / `textarea` / `number` (Input) / etc.
- **maxLength:** … (or —)
- **required:** yes / no
- **public:** yes / no
- **min/max:** … (if applicable)

---

## Versioning

Keep this doc in sync with the component when you change fields or constraints. Use the same scheme as [api-specification.md](../../../docs/api-specification.md):

1. **Semantic versioning** — Version numbers use **MAJOR.MINOR.PATCH**. Bump **MAJOR** for incompatible field/contract changes (e.g. rename or remove field, change path). Bump **MINOR** for backwards-compatible additions (e.g. new field). Bump **PATCH** for clarifications or typo fixes only.
2. **Metadata** — Update **Version** and **Last Revised** in the table at the top when you change this file.
3. **Revision history** — Add a row to the Revision History table below with the new version, date, and description.
4. **Component anchor** — In the section’s Svelte file, add a comment that references this doc and the current **Version**, e.g. `/** @see __frontend/docs/budget2026/form-[section-slug].md Version: 1.0.0 */`, so a quick search finds the pair.

---

## Revision History

This document follows [Semantic Versioning 2.0.0](https://semver.org/). Version numbers use the form **MAJOR.MINOR.PATCH** as described in the Versioning section above.

| Version | Date       | Description |
|---------|------------|-------------|
| 1.0.0   | YYYY-MM-DD | Initial doc: Fields table and field details for [Section Name] section. |
