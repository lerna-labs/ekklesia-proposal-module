# Proposal schema – field reference (CBC template 2026)

This document lists every proposal field with **PDF source**, **schema path**, **required** status, **max length** (or type constraints), and **validation** notes. It is based on the CBC Proposal Template FORM Final DRAFT PDF. Legend: **\*** = mandatory in PDF; **Not Public** = PDF marks field as not public (yellow).

---

## Top-level (proposal root)

| PDF section | PDF field | Schema path | Required | Max length / type | Validation / notes |
|-------------|-----------|-------------|----------|-------------------|---------------------|
| — | (proposer) | `proposerId` | Yes | String (ref User) | Set from authenticated user. |
| — | (budget) | `budgetId` | Yes | ObjectId (ref Budget) | Must be valid budget. |
| 1 | Proposal Title * | `title` | Yes | 100 chars | Short text. |
| 1 | Executive Summary * | `summary` | Yes | 2000 chars | Text area. |
| — | (status) | `status` | Yes | enum | `draft`, `live`, `withdrawnByProposer`, `withdrawnByAdmin`, `archived`. |
| — | (submitted at) | `submittedAt` | No | Date | Set on submit. |
| — | (total budget) | `totalBudget` | No | Number | Computed or stored. |
| — | (signature) | `signature` | No | String | Optional. |
| — | (version) | `version` | No | Number, default 1 | Incremented on save. |
| — | (withdrawal) | `withdrawalDetails` | No | Object | See below. |
| — | (versions) | `versions` | No | Array | References to archived versions. |

### withdrawalDetails (when present)

| PDF | Schema path | Required | Max / type | Notes |
|-----|-------------|----------|------------|-------|
| — | `withdrawalDetails.category` | — | enum | `"Inappropriate content"`, `"Spam"`, `"Policy violation"`, `"Duplicate submission"`, `"Other"`. |
| — | `withdrawalDetails.userId` | — | String | User who withdrew. |
| — | `withdrawalDetails.comment` | — | String | Free text. |
| — | `withdrawalDetails.date` | — | Date | When withdrawn. |

---

## 1. Project Definition (metaData)

| PDF field | Schema path | Required | Max length / type | Validation / notes |
|-----------|-------------|----------|-------------------|---------------------|
| Track Record | `metaData.trackRecord` | No | 650 chars | Text area. |

---

## 2. Strategic Roadmap Alignment (metaData)

| PDF field | Schema path | Required | Max length / type | Validation / notes |
|-----------|-------------|----------|-------------------|---------------------|
| Strategic Focus Area * | `metaData.strategicFocusArea` | Yes | ObjectId (ref Category) | Select one; must be category from budget. |
| Key Performance Indicators * | `metaData.keyPerformanceIndicators` | Yes | Array (min 1) | Each item below. |
| — (per KPI) | `[].kpi` | Yes | String (KPI title or custom) | Pre-filled from category or custom; custom max 400 chars in PDF. |
| Contribution Strategy * (per KPI) | `[].contributionStrategy` | Yes | 800 chars | Text area per KPI. |

---

## 3. Execution Roadmap (metaData.executionRoadmap)

| PDF field | Schema path | Required | Max length / type | Validation / notes |
|-----------|-------------|----------|-------------------|---------------------|
| Timeline * (Start) | `metaData.executionRoadmap.projectStartDate` | Yes | Date (ISO 8601) | Date range start. |
| Timeline * (End) | `metaData.executionRoadmap.projectEndDate` | Yes | Date (ISO 8601) | Date range end; typically ≥ start. |
| Work Packages | `metaData.executionRoadmap.workPackages` | No | Array | Each work package below. |

### Work package (each element of workPackages)

| PDF field | Schema path | Required | Max length / type | Validation / notes |
|-----------|-------------|----------|-------------------|---------------------|
| Work Package * | `workPackages[].title` | Yes | 100 chars | Short text. |
| Scope of Work * | `workPackages[].scope` | Yes | 2000 chars | Text area. |
| Supporting Documentation Link | `workPackages[].supportingDocuments` | No | Array of `{ title, url }` | Title + URL per link; external links need disclaimer. |
| (WP duration) | `workPackages[].estimatedDuration` | No | String | e.g. "3 months". |
| Core Objectives * | `workPackages[].coreObjectives` | Yes | Array of strings, each max 400 chars | Repeatable long text. |
| Expected Value (ROI) * | `workPackages[].expectedValue` | Yes | 600 chars | Long text. |
| Metric * | `workPackages[].metric` | Yes | 600 chars | Long text. |
| Milestones | `workPackages[].milestones` | No | Array | Each milestone below. |
| Budget Breakdown | `workPackages[].budgetBreakdown` | No | Array | Each row below. |

### Milestone (each element of workPackages[].milestones)

| PDF field | Schema path | Required | Max length / type | Validation / notes |
|-----------|-------------|----------|-------------------|---------------------|
| Milestone (and reference name) | `milestones[].milestoneName` | Yes | 100 chars | Short text. |
| Deliverables | `milestones[].deliverables` | Yes | 600 chars | Long text. |
| Acceptance Criteria | `milestones[].acceptanceCriteria` | Yes | 600 chars | Long text. |
| Duration | `milestones[].duration` | Yes | String (e.g. 200 chars) | Short text; e.g. "2 weeks". |

### Budget row (each element of workPackages[].budgetBreakdown)

| PDF field | Schema path | Required | Max length / type | Validation / notes |
|-----------|-------------|----------|-------------------|---------------------|
| Cost Category * | `budgetBreakdown[].costCategory` | Yes | String (from category list) | Select. |
| Item Description | `budgetBreakdown[].description` | Yes | String | e.g. 600 chars. |
| Qty | `budgetBreakdown[].quantity` | Yes | Number | ≥ 0. |
| Unit Cost (ada) | `budgetBreakdown[].unitPrice` | Yes | Number | ADA. |
| Total (ada) | `budgetBreakdown[].total` | Yes | Number | ADA; can be computed. |

---

## 4. Financial summary & Administrative (metaData.financialAndAdministrative)

| PDF field | Schema path | Required | Max length / type | Validation / notes |
|-----------|-------------|----------|-------------------|---------------------|
| ada/USD Conversion Rate * | `financialAndAdministrative.conversionRate` | Yes | Number | Used for USD estimations. |
| Intersect Administrator? * | `financialAndAdministrative.intersectAdministrator` | Yes | Boolean | Yes/No; default Yes. |
| Other Administrators? | `financialAndAdministrative.otherAdministrators` | No | 400 chars | Text area; when not Intersect. Not Public. |
| Initiative Type * | `financialAndAdministrative.initiativeType` | Yes | enum | `"New Initiative"` \| `"Maintenance"`. |
| Type of Proposal | `financialAndAdministrative` / `metaData.proposalType` | Yes | enum | `"Technical (software/IT)"` \| `"Non-technical"`. (Stored in metaData.) |
| Prior Funding * | `financialAndAdministrative.priorFunding` | Yes | 800 chars | Long text; "N/A" allowed. |
| Treasury Repayment? * | `financialAndAdministrative.treasuryRepayment` | Yes | Boolean | Yes/No. |
| Repayment Circumstances | `financialAndAdministrative.treasuryRepaymentCondition` | No | 800 chars | Text area; when repayment Yes. |
| Treasury Donation Verification Hash * | `financialAndAdministrative.treasuryDonationHash` | Yes | String | Transaction hash (1000 ada donation). |
| Third Party Assurers | `financialAndAdministrative.thirdPartyAssurers` | No | 600 chars | Text area. |
| Other Supporting Info | `financialAndAdministrative.supportingDocuments` | No | Array of `{ title, url }` | Link title + URL; external link disclaimer. |
| (legacy) | `financialAndAdministrative.administrator` | No | String | Legacy / optional. |

---

## 4. Administrative & Verification – Contracting party (metaData.contractingParty)

| PDF field | Schema path | Required | Max length / type | Validation / notes |
|-----------|-------------|----------|-------------------|---------------------|
| Contracting Party Details * | `contractingParty.legalEntityType` | Yes | enum | `"company"` \| `"individual"`. |
| Legal Entity Name * (Company) | `contractingParty.legalEntityName` | Yes (if company) | 100 chars | Not Public (company). |
| Registration Number * (Company) | `contractingParty.legalEntityRegistrationNumber` | Yes (if company) | 100 chars | Tax ID / UEN. Not Public. |
| Country of Incorporation * (Company) | `contractingParty.legalEntityCountry` | Yes (if company) | 100 chars (or 2 for code) | Not Public. |
| Registered Address * (Company) | `contractingParty.legalEntityAddress` | Yes (if company) | 100 chars | Not Public. |
| Country of Residence * (Individual) | (same or `countryOfResidence`) | Yes (if individual) | 100 chars | Not Public. PDF: distinct field for individual. |
| Govt Issued ID Number * (Individual) | (same or `govtIssuedIdNumber`) | Yes (if individual) | 100 chars | Not Public. PDF: distinct field. |
| Full Residential Address * (Individual) | (same or `fullResidentialAddress`) | Yes (if individual) | 100 chars | Not Public. PDF: distinct field. |

*Note:* Current schema reuses `legalEntityName`, `legalEntityRegistrationNumber`, `legalEntityCountry`, `legalEntityAddress` for both company and individual; PDF defines separate labels for individual (country of residence, govt ID, full residential address). Application may map accordingly.

---

## 4. Administrative – Contacts (metaData.primaryContact, metaData.signatoryContact)

| PDF field | Schema path | Required | Max length / type | Validation / notes |
|-----------|-------------|----------|-------------------|---------------------|
| Primary Contact Full Name * | `primaryContact.name` | Yes | 100 chars | |
| Primary Contact Email * | `primaryContact.email` | Yes | 100 chars (PDF); 255 typical | Not Public. |
| Primary Contact (title) | `primaryContact.title` | No | String | PDF does not require for primary. |
| X Handle | `primaryContact.socialMedia` | No | 100 chars | Tagged in communications. |
| Signatory Name * | `signatoryContact.name` | Yes | 100 chars | Not Public. |
| Signatory Title * | `signatoryContact.title` | Yes | 100 chars | Not Public. |
| Signatory Email * | `signatoryContact.email` | Yes | 100 chars (PDF); 255 typical | Not Public. |
| Signatory Authorization * | `signatoryContact.authorization` | Yes | Boolean | Checkbox; must be true. Not Public. |

---

## 4. Administrative – KYC & count (metaData.kycInfo, totalProposalsSubmitted)

| PDF field | Schema path | Required | Max length / type | Validation / notes |
|-----------|-------------|----------|-------------------|---------------------|
| KYC/KYB Submitted? * | `metaData.kycInfo.submitted` | Yes | Boolean | Yes/No. Not Public. |
| KYC Contact Email (If No) * | `metaData.kycInfo.email` | Yes if submitted=false | 100 chars | Not Public. |
| Total Proposals Submitted | (not in schema yet) | No | Number / 100 chars | Count this funding round. Not Public. |

---

## 5. Legal Declarations (metaData.legalDeclarations)

All declaration fields below must be `true` when submitting with `status: "live"`. Required when status is live; optional for draft.

| PDF § | PDF field | Schema path | Required (when live) | Type | Validation / notes |
|-------|-----------|-------------|------------------------|------|---------------------|
| 1 | Data Protection (consent) | `legalDeclarations.dataProtection` | Yes | Boolean | PDF has two checkboxes; schema currently single boolean. |
| 1 | (public visibility consent) | (e.g. `publicVisibilityConsent`) | Yes | Boolean | PDF: second checkbox; not yet split in schema. |
| 2 | Anti-Bribery and Anti-Corruption | `legalDeclarations.antiBribery` | Yes | Boolean | Must be true. |
| 3 | Proposal Authenticity and IP | `legalDeclarations.authenticity`, `legalDeclarations.ipOwnership` | Yes | Boolean each | Both must be true. |
| 4 | Conflicts with Existing Obligations | `legalDeclarations.conflicts` | Yes | Boolean | Must be true. |
| 5 | Compliance with Laws and Regulations | `legalDeclarations.compliance` | Yes | Boolean | Must be true. |
| 6 | Sanctions / Restricted Parties | `legalDeclarations.sanctions` | Yes | Boolean | Must be true. |
| 7 | No Contract Formation / Limitation of Liability | `legalDeclarations.noContract`, `legalDeclarations.noGuarantee` | Yes | Boolean each | Both must be true. |
| 8 | Authorized to submit (entity) | `legalDeclarations.authorizationEntity` | Yes | Boolean | Must be true. |
| 8 | Authorized to attest | `legalDeclarations.authorizationAttestation` | Yes | Boolean | Must be true. |

### Declaration of Submitter (PDF §8 – not yet in schema)

| PDF field | Schema path | Required | Max length / type | Validation / notes |
|-----------|-------------|----------|-------------------|---------------------|
| Name | (e.g. `submitterName`) | Yes | 100 chars | Text input. |
| Role | (e.g. `submitterRole`) | Yes | 100 chars | Text input. |
| Email | (e.g. `submitterEmail`) | Yes | 100 chars, email | Text input. |

---

## Enums summary

| Schema path | Allowed values |
|-------------|----------------|
| `status` | `draft`, `live`, `withdrawnByProposer`, `withdrawnByAdmin`, `archived` |
| `metaData.proposalType` | `"Technical (software/IT)"`, `"Non-technical"` |
| `metaData.financialAndAdministrative.initiativeType` | `"New Initiative"`, `"Maintenance"` |
| `metaData.contractingParty.legalEntityType` | `"company"`, `"individual"` |
| `withdrawalDetails.category` | `"Inappropriate content"`, `"Spam"`, `"Policy violation"`, `"Duplicate submission"`, `"Other"` |

---

## Character limits (PDF)

| Max length | PDF fields |
|------------|------------|
| 100 | Proposal Title; Work Package name; Milestone name; Legal entity name, Registration number, Country of Incorporation, Registered Address; Country of Residence, Govt Issued ID, Full Residential Address (individual); Primary Contact Name, Email, X Handle; Signatory Name, Title, Email; KYC Contact Email; Total Proposals Submitted (input); Declaration of Submitter Name, Role, Email. |
| 400 | Custom KPI; each Core Objective; Other Administrators. |
| 600 | Expected Value (ROI); Metric; Deliverables; Acceptance Criteria; Third Party Assurers. |
| 650 | Track Record. |
| 800 | Contribution Strategy (per KPI); Prior Funding; Repayment Circumstances. |
| 2000 | Executive Summary; Scope of Work. |

---

## Related docs

- [proposal-schema-gap-analysis.md](proposal-schema-gap-analysis.md) – Gap analysis vs CBC template and improvement list.
- [api-specification.md](api-specification.md) – API request/response for proposals.
- Schema implementation: [../schema/Proposal.js](../schema/Proposal.js).
