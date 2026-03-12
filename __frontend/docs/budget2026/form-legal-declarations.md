# Budget 2026 — Legal Declarations (form section)

---

| Field            | Detail                                                                 |
|------------------|------------------------------------------------------------------------|
| **Version**      | 1.2.0                                                                  |
| **Created**      | 2025-03-02                                                             |
| **Last Revised** | 2025-03-12                                                             |
| **Component**    | `__frontend/src/lib/forms/budget2026/FormLegalDeclarations.svelte`   |

---

Form section component: `__frontend/src/lib/forms/budget2026/FormLegalDeclarations.svelte`.

This section is **accordion section 9** ("Legal declarations") in the budget2026 form. Legal declarations must be re-submitted on every submit/re-submit (no prefill from proposal).

Describes the form fields: path in `formData`, type, constraints, and visibility.

---

## Fields

| Field | formData path | Type | maxLength | required | public |
|-------|----------------|------|-----------|----------|--------|
| Submitter name | `formData.metaData.legalDeclarations.submitterName` | text (Input) | 100 | yes | no |
| Submitter email | `formData.metaData.legalDeclarations.submitterEmail` | email (Input) | 254 | yes | no |
| Submitter role | `formData.metaData.legalDeclarations.submitterRole` | text (Input) | 100 | yes | no |
| Authorization (entity) | `formData.metaData.legalDeclarations.authorizationEntity` | checkbox | — | yes | no |
| Authorization (attestation) | `formData.metaData.legalDeclarations.authorizationAttestation` | checkbox | — | yes | no |

---

## Field details

### Submitter name
- **Path:** `formData.metaData.legalDeclarations.submitterName`
- **Label:** Name
- **Description:** Full name of the person submitting the proposal (Declaration of Submitter, section 8).
- **Type:** text (Input)
- **maxLength:** 100
- **required:** yes
- **public:** no

### Submitter email
- **Path:** `formData.metaData.legalDeclarations.submitterEmail`
- **Label:** Email
- **Description:** Email of the submitter for the Declaration of Submitter (section 8).
- **Type:** email (Input, type="email")
- **maxLength:** 254
- **required:** yes
- **public:** no

### Submitter role
- **Path:** `formData.metaData.legalDeclarations.submitterRole`
- **Label:** Role
- **Description:** Role of the submitter (Declaration of Submitter, section 8).
- **Type:** text (Input)
- **maxLength:** 100
- **required:** yes
- **public:** no

### Authorization (entity)
- **Path:** `formData.metaData.legalDeclarations.authorizationEntity`
- **Label:** I confirm that I am authorized to submit this proposal on behalf of the vendor entity. I acknowledge that submission does not constitute authority to bind the entity contractually.
- **Description:** Confirmation of authority to submit on behalf of the vendor (section 8).
- **Type:** checkbox (Checkbox)
- **required:** yes
- **public:** no

### Authorization (attestation)
- **Path:** `formData.metaData.legalDeclarations.authorizationAttestation`
- **Label:** I confirm that I am authorized to submit and attest to all legal declarations above on behalf of the vendor.
- **Description:** Confirmation of authority to attest to all legal declarations (section 8).
- **Type:** checkbox (Checkbox)
- **required:** yes
- **public:** no

---

## Revision History

This document follows [Semantic Versioning 2.0.0](https://semver.org/). Version numbers use the form **MAJOR.MINOR.PATCH**.

| Version | Date       | Description |
|---------|------------|-------------|
| 1.0.0   | 2025-03-02 | Initial doc: Fields table and field details for Legal Declarations (dialog) section. |
| 1.1.0   | 2025-03-03 | Align with component: dataProcessingConsent (id and path); rename Data protection → Data processing consent. |
| 1.2.0   | 2025-03-12 | Legal declarations moved to accordion section 9; dialog removed. Data processing consent and public visibility consent checkboxes removed. |
