# Budget 2026 — Proposer Details (form section)

---

| Field            | Detail                                                                 |
|------------------|------------------------------------------------------------------------|
| **Version**      | 1.1.0                                                                  |
| **Created**      | 2025-03-02                                                             |
| **Last Revised** | 2025-03-03                                                             |
| **Component**    | `__frontend/src/lib/forms/budget2026/FormProposerDetails.svelte`      |

---

Form section component: `__frontend/src/lib/forms/budget2026/FormProposerDetails.svelte`.

Describes the form fields used in this section: path in `formData`, type, constraints, and visibility.

---

## Fields

| Field | formData path | Type | maxLength | required | public |
|-------|----------------|------|-----------|----------|--------|
| Proposer Public Name | `formData.metaData.proposerDetails.name` | text (Input) | 100 | yes | yes |
| Social Media Links | `formData.metaData.proposerDetails.links` | array of link | per item: title 100, url — | no (list optional) | yes |
| Primary Contact Email | `formData.metaData.proposerDetails.email` | email (Input) | 255 | yes | no |

Each **link** item in `links` has:
- **title:** text, required, max 100 characters
- **url:** URL, required, valid URL (https:// auto-prefixed if omitted)

---

## Field details

### Proposer Public Name
- **Path:** `formData.metaData.proposerDetails.name`
- **Label:** Proposer Public Name
- **Description:** This name will be public on your proposal page. Depending if you are submitting as an individual or a company, this could be your name or your company name.
- **Type:** text (Input)
- **Placeholder:** Enter Name
- **maxLength:** 100
- **required:** yes
- **public:** yes

### Social Media Links
- **Path:** `formData.metaData.proposerDetails.links`
- **Label:** Social Media Links
- **Description:** Social media links to be tagged in Intersect communications on project progress. Rendered as a list of links (title + URL); each link validated before add (title required, max 100; URL required and valid).
- **Type:** array of `{ title: string, url: string }` (LinkListEditor)
- **Per-item constraints:** title max 100; url must be valid (scheme optional, https:// auto-prefixed).
- **required:** no (list may be empty)
- **public:** yes

### Primary Contact Email
- **Path:** `formData.metaData.proposerDetails.email`
- **Label:** Primary Contact Email
- **Description:** The primary email address used for notifications and official correspondence related to this proposal. Used for anything related to this proposal submission.
- **Type:** email (Input, type="email")
- **Placeholder:** Enter Email
- **maxLength:** 255
- **required:** yes
- **public:** no

---

## Revision History

This document follows [Semantic Versioning 2.0.0](https://semver.org/). Version numbers use the form **MAJOR.MINOR.PATCH**.

| Version | Date       | Description |
|---------|------------|-------------|
| 1.0.0   | 2025-03-02 | Initial doc: Fields table and field details for Proposer Details section. |
| 1.1.0   | 2025-03-03 | Primary Contact Email: public → no (notPublic); add placeholders for name and email. |
