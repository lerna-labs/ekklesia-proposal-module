# Budget 2026 — Budget Administration (form section)

---

| Field            | Detail                                                                 |
|------------------|------------------------------------------------------------------------|
| **Version**      | 1.0.0                                                                  |
| **Created**      | 2025-03-04                                                             |
| **Last Revised** | 2025-03-04                                                             |
| **Component**    | `__frontend/src/lib/forms/budget2026/FormBudgetAdmin.svelte`           |

---

Form section component: `__frontend/src/lib/forms/budget2026/FormBudgetAdmin.svelte`.

Describes the form fields used in the Budget Administration section: path in `formData`, type, constraints, and visibility. This section is split by administrator choice: when **Intersect** is selected, `FormBudgetAdminIntersect.svelte` renders (fee consent, contracting party type, entity/identity details, primary contact, signatory, KYC). When **Other** is selected, `FormBudgetAdminOther.svelte` renders (other administrator textarea, contracting party type). The **Independent audits** textarea is shown in both cases. Changing the administrator after data has been entered triggers a confirmation dialog; on confirm, all admin-subsection data is reset.

---

## Fields

| Field | formData path | Type | maxLength | required | public |
|-------|----------------|------|-----------|----------|--------|
| Administrator | `formData.metaData.administrator` | choice (radio) | — | yes | yes |
| Intersect fee consent | `formData.metaData.intersectAdministratorFeeConsent` | checkbox | — | yes (when Intersect) | no |
| Other administrator details | `formData.metaData.otherAdministrator` | textarea | 4000 | yes (when Other) | no |
| Contracting party type | `formData.metaData.contractingParty.legalEntityType` | choice (radio) | — | yes | no |
| Legal Entity Name | `formData.metaData.contractingParty.legalEntityName` | text (Input) | 100 | yes (when company) | no |
| Registration Number | `formData.metaData.contractingParty.legalEntityRegistrationNumber` | text (Input) | 100 | yes (when company) | no |
| Country of Incorporation | `formData.metaData.contractingParty.legalEntityCountry` | text (Input) | 100 | yes (when company) | no |
| Registered Address line 1 | `formData.metaData.contractingParty.legalEntityAddressLine1` | text (Input) | 100 | yes (when company) | no |
| Registered Address line 2 | `formData.metaData.contractingParty.legalEntityAddressLine2` | text (Input) | 100 | no | no |
| Registered Address line 3 | `formData.metaData.contractingParty.legalEntityAddressLine3` | text (Input) | 100 | no | no |
| Government-issued ID number | `formData.metaData.contractingParty.govtIssuedIdNumber` | text (Input) | 100 | yes (when individual) | no |
| Country of Residence | `formData.metaData.contractingParty.countryOfResidence` | country (SelectCountries) | — | yes (when individual) | no |
| Residential Address line 1 | `formData.metaData.contractingParty.residentialAddressLine1` | text (Input) | 100 | yes (when individual) | no |
| Residential Address line 2 | `formData.metaData.contractingParty.residentialAddressLine2` | text (Input) | 100 | no | no |
| Residential Address line 3 | `formData.metaData.contractingParty.residentialAddressLine3` | text (Input) | 100 | no | no |
| Primary Contact Full Name | `formData.metaData.primaryContact.name` | text (Input) | 100 | yes | no |
| Primary Contact Email | `formData.metaData.primaryContact.email` | text (Input) | 100 | yes | no |
| Signatory Title or Role | `formData.metaData.signatoryContact.title` | text (Input) | 100 | yes | no |
| Authorized signatory name | `formData.metaData.signatoryContact.name` | text (Input) | 100 | yes | no |
| Authorized signatory email | `formData.metaData.signatoryContact.email` | text (Input) | 100 | yes | no |
| Signatory authorization | `formData.metaData.signatoryContact.authorization` | checkbox | — | yes | no |
| KYC/KYB Submitted? | `formData.metaData.kycInfo.submitted` | choice (radio) | — | yes | no |
| KYC Contact Email | `formData.metaData.kycInfo.email` | text (Input) | 100 | yes (when submitted No) | no |
| Total Proposals Submitted | `formData.metaData.kycInfo.totalProposalsSubmitted` | number (Input) | — | no | no |
| Third Party Assurers | `formData.metaData.independentAudits` | textarea (Textarea) | 1000 | yes | yes |

---

## Field details

### Administrator
- **Path:** `formData.metaData.administrator`
- **Label:** Who will be your administrator for this proposal?
- **Description:** Choose who will be your administrator for this proposal?
- **Type:** choice (RadioGroup)
- **Options:** `"Intersect"`, `"Other"`
- **required:** yes
- **public:** yes
- **Behaviour:** Bound to a local value; changing selection when subsection data exists opens a confirmation dialog. On confirm, admin subsection (contracting party, primary contact, signatory, kycInfo, fee consent, other administrator) is reset; `independentAudits` is not cleared.

### Intersect fee consent
- **Path:** `formData.metaData.intersectAdministratorFeeConsent`
- **Label:** I understand that selecting Intersect as the Administrator will result in a 3% administration fee being applied to the total budget, and I agree to this fee.
- **Type:** checkbox (Checkbox)
- **required:** yes when administrator is Intersect
- **public:** no
- **Shown:** Only when administrator is **Intersect** (FormBudgetAdminIntersect).

### Other administrator details
- **Path:** `formData.metaData.otherAdministrator`
- **Label:** Details about other administrator
- **Description:** Please specify who is your administrator
- **Type:** textarea (Textarea)
- **maxLength:** 4000
- **required:** yes when administrator is Other
- **public:** no
- **Shown:** Only when administrator is **Other** (FormBudgetAdminOther).

### Contracting party type (Proposal's Party Details)
- **Path:** `formData.metaData.contractingParty.legalEntityType`
- **Label:** Proposal's Party Details
- **Description:** Are you applying as a registered company or an individual?
- **Type:** choice (RadioGroup)
- **Options:** `"company"`, `"individual"`
- **required:** yes
- **public:** no
- **Shown:** In both Intersect and Other flows.

### Entity details (when company)

Shown when contracting party type is **company** (Intersect and, if implemented, Other).

- **Legal Entity Name** — `formData.metaData.contractingParty.legalEntityName`. Input, max 100, required, not public. Placeholder: Registered Company Name.
- **Registration Number** — `formData.metaData.contractingParty.legalEntityRegistrationNumber`. Input, max 100, required, not public. Placeholder: Tax ID / UEN.
- **Country of Incorporation** — `formData.metaData.contractingParty.legalEntityCountry`. Input, max 100, required, not public. Placeholder: Jurisdiction.
- **Registered Address line 1** — `formData.metaData.contractingParty.legalEntityAddressLine1`. Input, max 100, required, not public.
- **Registered Address line 2** — `formData.metaData.contractingParty.legalEntityAddressLine2`. Input, max 100, not required, not public.
- **Registered Address line 3** — `formData.metaData.contractingParty.legalEntityAddressLine3`. Input, max 100, not required, not public.

### Identity & Legal Details (when individual)

Shown when contracting party type is **individual**.

- **Government-issued ID number** — `formData.metaData.contractingParty.govtIssuedIdNumber`. Input, max 100, required, not public. Placeholder: ID / Passport #.
- **Country of Residence** — `formData.metaData.contractingParty.countryOfResidence`. SelectCountries, required, not public. Placeholder: Country.
- **Residential Address line 1** — `formData.metaData.contractingParty.residentialAddressLine1`. Input, max 100, required, not public.
- **Residential Address line 2** — `formData.metaData.contractingParty.residentialAddressLine2`. Input, max 100, not required, not public.
- **Residential Address line 3** — `formData.metaData.contractingParty.residentialAddressLine3`. Input, max 100, not required, not public.

### Primary Contact
- **Primary Contact Full Name** — `formData.metaData.primaryContact.name`. Input, max 100, required, not public. Placeholder: Enter Name.
- **Email** — `formData.metaData.primaryContact.email`. Input, max 100, required, not public. Placeholder: Enter Email.

Shown in FormBudgetAdminIntersect (and shared structure allows same in Other if needed).

### Authorized Signatory Details
- **Signatory Title or Role** — `formData.metaData.signatoryContact.title`. Input, max 100, required, not public. Placeholder: Enter Title.
- **Authorized signatory name** — `formData.metaData.signatoryContact.name`. Input, max 100, required, not public. Placeholder: Enter Name.
- **Authorized signatory email** — `formData.metaData.signatoryContact.email`. Input, max 100, required, not public. Placeholder: Enter Email.
- **Signatory authorization** — `formData.metaData.signatoryContact.authorization`. Checkbox, required, not public. Label: I confirm that the above individual is authorized to execute a binding agreement on behalf of the vendor entity, subject to selection and contract execution.

Shown in FormBudgetAdminIntersect.

### KYC/KYB Submission Status
- **KYC/KYB Submitted?** — `formData.metaData.kycInfo.submitted`. RadioGroup, options Yes/No, required, not public.
- **KYC Contact Email** — `formData.metaData.kycInfo.email`. Input, max 100, required when submitted is No, not public. Placeholder: Enter Email. Shown only when submitted is **No**.
- **Total Proposals Submitted** — `formData.metaData.kycInfo.totalProposalsSubmitted`. Input type number, not required, not public. Placeholder: Enter Count.

Shown in FormBudgetAdminIntersect.

### Third Party Assurers (Independent audits)
- **Path:** `formData.metaData.independentAudits`
- **Label:** Third Party Assurers
- **Description:** Who is your Third Party Assurer? This person can be a person or organization.
- **Type:** textarea (Textarea)
- **maxLength:** 1000
- **required:** yes
- **public:** yes
- **Note:** Not cleared when the user changes administrator and confirms reset.

---

## Versioning

Keep this doc in sync with the component when you change fields or constraints. Use the same scheme as [api-specification.md](../../../docs/api-specification.md):

1. **Semantic versioning** — Version numbers use **MAJOR.MINOR.PATCH**. Bump **MAJOR** for incompatible field/contract changes (e.g. rename or remove field, change path). Bump **MINOR** for backwards-compatible additions (e.g. new field). Bump **PATCH** for clarifications or typo fixes only.
2. **Metadata** — Update **Version** and **Last Revised** in the table at the top when you change this file.
3. **Revision history** — Add a row to the Revision History table below with the new version, date, and description.
4. **Component anchor** — In the section's Svelte file, add a comment that references this doc and the current **Version**, e.g. `/** @see __frontend/docs/budget2026/form-budget-admin.md Version: 1.0.0 */`, so a quick search finds the pair.

---

## Revision History

This document follows [Semantic Versioning 2.0.0](https://semver.org/). Version numbers use the form **MAJOR.MINOR.PATCH** as described in the Versioning section above.

| Version | Date       | Description |
|---------|------------|-------------|
| 1.0.0   | 2025-03-04 | Initial doc: Fields table and field details for Budget Administration section. |
