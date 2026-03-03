# Budget 2026 — Legal Declarations (form section)

---

| Field            | Detail                                                                 |
|------------------|------------------------------------------------------------------------|
| **Version**      | 1.0.0                                                                  |
| **Created**      | 2025-03-02                                                             |
| **Last Revised** | 2025-03-02                                                             |
| **Component**    | `__frontend/src/lib/forms/budget2026/FormLegalDeclarations.svelte`   |

---

Form section component: `__frontend/src/lib/forms/budget2026/FormLegalDeclarations.svelte`.

This section is **not** part of the accordion. It is shown in a **dialog** that opens only on submit or re-submit when all other validation errors have been cleared. Legal declarations must be re-submitted on every submit/re-submit (no prefill from proposal).

Describes the form fields: path in `formData`, type, constraints, and visibility.

---

## Fields

| Field | formData path | Type | maxLength | required | public |
|-------|----------------|------|-----------|----------|--------|
| Data protection consent | `formData.metaData.legalDeclarations.dataProtection` | checkbox | — | yes | yes |
| Public visibility consent | `formData.metaData.legalDeclarations.publicVisibilityConsent` | checkbox | — | yes | yes |
| Submitter name | `formData.metaData.legalDeclarations.submitterName` | text (Input) | 100 | yes | yes |
| Submitter email | `formData.metaData.legalDeclarations.submitterEmail` | email (Input) | 100 | yes | yes |
| Submitter role | `formData.metaData.legalDeclarations.submitterRole` | text (Input) | 100 | yes | yes |
| Authorization (entity) | `formData.metaData.legalDeclarations.authorizationEntity` | checkbox | — | yes | yes |
| Authorization (attestation) | `formData.metaData.legalDeclarations.authorizationAttestation` | checkbox | — | yes | yes |

---

## Field details

### Data protection consent
- **Path:** `formData.metaData.legalDeclarations.dataProtection`
- **Label:** I acknowledge and consent to the above data processing and sharing.
- **Description:** Section 1 (Data Protection): personal data may be shared with internal stakeholders for evaluation, voting, contracting, and treasury execution.
- **Type:** checkbox (Checkbox)
- **required:** yes
- **public:** yes

### Public visibility consent
- **Path:** `formData.metaData.legalDeclarations.publicVisibilityConsent`
- **Label:** By submitting this form, you acknowledge and agree that the legal entity name, personal name, and X (Twitter) handle entered will be publicly visible in connection with this budget request.
- **Description:** Consent for public visibility of entity name, personal name, and X handle.
- **Type:** checkbox (Checkbox)
- **required:** yes
- **public:** yes

### Submitter name
- **Path:** `formData.metaData.legalDeclarations.submitterName`
- **Label:** Name
- **Description:** Full name of the person submitting the proposal (Declaration of Submitter, section 8).
- **Type:** text (Input)
- **maxLength:** 100
- **required:** yes
- **public:** yes

### Submitter email
- **Path:** `formData.metaData.legalDeclarations.submitterEmail`
- **Label:** Email
- **Description:** Email of the submitter for the Declaration of Submitter (section 8).
- **Type:** email (Input, type="email")
- **maxLength:** 100
- **required:** yes
- **public:** yes

### Submitter role
- **Path:** `formData.metaData.legalDeclarations.submitterRole`
- **Label:** Role
- **Description:** Role of the submitter (Declaration of Submitter, section 8).
- **Type:** text (Input)
- **maxLength:** 100
- **required:** yes
- **public:** yes

### Authorization (entity)
- **Path:** `formData.metaData.legalDeclarations.authorizationEntity`
- **Label:** I confirm that I am authorized to submit this proposal on behalf of the vendor entity. I acknowledge that submission does not constitute authority to bind the entity contractually.
- **Description:** Confirmation of authority to submit on behalf of the vendor (section 8).
- **Type:** checkbox (Checkbox)
- **required:** yes
- **public:** yes

### Authorization (attestation)
- **Path:** `formData.metaData.legalDeclarations.authorizationAttestation`
- **Label:** I confirm that I am authorized to submit and attest to all legal declarations above on behalf of the vendor.
- **Description:** Confirmation of authority to attest to all legal declarations (section 8).
- **Type:** checkbox (Checkbox)
- **required:** yes
- **public:** yes

---

## Revision History

This document follows [Semantic Versioning 2.0.0](https://semver.org/). Version numbers use the form **MAJOR.MINOR.PATCH**.

| Version | Date       | Description |
|---------|------------|-------------|
| 1.0.0   | 2025-03-02 | Initial doc: Fields table and field details for Legal Declarations (dialog) section. |
