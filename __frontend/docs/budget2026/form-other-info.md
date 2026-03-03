# Budget 2026 — Other Info (form section)

---

| Field            | Detail                                                                 |
|------------------|------------------------------------------------------------------------|
| **Version**      | 1.0.0                                                                  |
| **Created**      | 2025-03-02                                                             |
| **Last Revised** | 2025-03-02                                                             |
| **Component**    | `__frontend/src/lib/forms/budget2026/FormOtherInfo.svelte`             |

---

Form section component: `__frontend/src/lib/forms/budget2026/FormOtherInfo.svelte`.

Describes the form fields used in this section: path in `formData`, type, constraints, and visibility.

---

## Fields

| Field | formData path | Type | maxLength | required | public |
|-------|----------------|------|-----------|----------|--------|
| Initiative Type | `formData.metaData.initiativeType` | choice (radio) | — | yes | yes |
| Type of Proposal | `formData.metaData.proposalType` | choice (radio) | — | yes | yes |
| Other Supporting Info | `formData.metaData.supportingInfoLinks` | array of link | per item: title 100, url — | no (list optional) | configurable (notPublic prop) |

Each **supporting info link** item has:
- **title:** text, required, max 100 characters
- **url:** URL, required, valid URL (https:// auto-prefixed if omitted)

---

## Field details

### Initiative Type
- **Path:** `formData.metaData.initiativeType`
- **Label:** Initiative Type
- **Description:** New Initiative for new work; Maintenance for ongoing or sustaining work.
- **Type:** choice (RadioGroup)
- **Options:** `"New Initiative"`, `"Maintenance"`
- **maxLength:** —
- **required:** yes
- **public:** yes

### Type of Proposal
- **Path:** `formData.metaData.proposalType`
- **Label:** Type of Proposal
- **Description:** Technical (software/IT) or non-technical (e.g. community, governance, education).
- **Type:** choice (RadioGroup)
- **Options:** `"Technical (software/IT)"`, `"Non-technical"`
- **maxLength:** —
- **required:** yes
- **public:** yes

### Other Supporting Info (links)
- **Path:** `formData.metaData.supportingInfoLinks`
- **Label:** Other Supporting Info
- **Description:** Any other details relevant to the proposal. Rendered as a list of links (title + URL); each link validated before add (title required, max 100; URL required and valid).
- **Type:** array of `{ title: string, url: string }` (LinkListEditor)
- **Per-item constraints:** title max 100; url must be valid (scheme optional, https:// auto-prefixed).
- **required:** no (list may be empty)
- **public:** configurable via section `notPublic` prop

---

## Revision History

This document follows [Semantic Versioning 2.0.0](https://semver.org/). Version numbers use the form **MAJOR.MINOR.PATCH**.

| Version | Date       | Description |
|---------|------------|-------------|
| 1.0.0   | 2025-03-02 | Initial doc: Fields table and field details for Other Info section. |
