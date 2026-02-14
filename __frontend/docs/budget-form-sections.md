# Budget Proposal Form – Sections and Fields

This document describes the structure of the budget proposal form (`Form.svelte`) and all its subcomponents: sections, fields, validation rules, character limits, and required/optional status. Validation is defined in `Schema.js` and used across the form.

---

## Form flow

1. User fills the main form (sections 1–5).
2. **Save Draft** submits the form; the main form is validated with `mainFormSchema` (excludes legal declarations).
3. If validation passes, the **Proposal Submission Legal Declarations** dialog opens.
4. User completes legal declarations and clicks **Confirm and submit**; `declarationsSchema` is validated.
5. On success, the dialog closes (API submit is TODO).

---

## Section 1: Project Definition

**Component:** `Form.svelte` (direct use of `Input`, `Textarea`)  
**Section id:** `project-definition`

| Field id    | Label             | Component | Required | Min | Max   | Notes |
|------------|-------------------|-----------|----------|-----|-------|--------|
| `title`    | Proposal Title    | Input     | Yes      | 2   | 255   | Official name of the project for governance voting. |
| `summary`  | Proposal Summary  | Textarea  | Yes      | 2   | 2000  | High-level overview (problem, solution, impact). |
| `trackRecord` | Track Record   | Textarea  | No       | 2   | 650   | Previous proposals, mainnet deployments, relevant experience. |

---

## Section 2: Strategic Roadmap Alignment

**Components:** `FormFocusArea.svelte`, `FormFocusAreaKPI.svelte`  
**Section id:** `strategic-roadmap-alignment`

### 2.1 Strategic Focus Area

| Field id  | Label                 | Component     | Required | Constraints | Notes |
|-----------|-----------------------|---------------|----------|-------------|--------|
| `category`| Strategic Focus Area  | FormFocusArea (Select) | Yes | Length 24, MongoDB ObjectId regex | Primary Cardano strategic pillar (e.g. L1, DeFi, RWA). Options come from `categories` prop. |

Choosing a focus area resets `kpis` (via parent `onUpdate`). If the user has already added KPIs and selects a different focus area, an alert dialog asks for confirmation before applying the change and clearing KPIs. KPIs are only shown when a category is selected. FormFocusArea receives `bind:value={formData.category}` and `hasKpis` so it can show the confirmation when needed.

### 2.2 Key Performance Indicators (KPIs)

| Field id | Label   | Component | Required | Constraints | Notes |
|----------|---------|-----------|----------|-------------|--------|
| `kpis`   | Key Performance Indicators | FormFocusAreaKPI | Yes (at least one) | Array of `{ title, contributionStrategy }` | KPI list is driven by selected category’s `metaData.kpis`. Bound via `bind:value={formData.kpis}`. |

**Per KPI item (schema):**

- `title`: 3–255 characters (from category KPI list; user selects and adds). Optional custom KPIs can be added.
- `contributionStrategy`: 100–1000 characters, required for each selected KPI.

**KPI target descriptions:** `FormFocusAreaKPI` shows 2030 target badges for known KPIs; titles and descriptions are loaded from `targets.json` (array of `{ title, description }`).

---

## Section 3: Execution Roadmap

**Components:** `FormTimeline.svelte`, `FormWorkPackages.svelte`, `FormFinancialSummary.svelte`  
**Section id:** `execution-roadmap`

### 3.1 Timeline

| Field id       | Label      | Component | Required | Constraints | Notes |
|----------------|------------|-----------|----------|-------------|--------|
| `timeline.startDate` | Start Date | DatePicker | Yes | Date, min = today | |
| `timeline.endDate`   | End Date   | DatePicker | Yes | Date, min = startDate | Project duration. |

### 3.2 Work Package Breakdown

**Component:** `FormWorkPackages.svelte`  
**Schema:** `workPackageSchema` (array, optional, default `[]`).

Work packages are listed as collapsible cards (title + total ADA badge + edit/delete). **Add Work Package** opens a dialog. Each package has:

- **Name**, **Scope of Work**, **Core Objectives**, **Expected Value (ROI)**, **Metric**
- **Supporting Documentation Links** (optional list of title + URL)
- **Milestones** (optional list; add via **Add Milestone**)
- **Budget rows** (optional list; add via **Add Budget Position**)

#### Work package dialog fields (add/edit)

| Field id                       | Label                      | Required | Min | Max  | Notes |
|--------------------------------|----------------------------|----------|-----|------|--------|
| `name`                         | Work Package               | Yes      | 1   | 100  | Descriptive name (e.g. WP1 Node Performance Improvements). |
| `scopeOfWork`                  | Scope of Work              | Yes      | 1   | 2000 | High-level description of work, activities, outputs. |
| `supportingDocumentationLinks` | Supporting Documentation Link | No   | —   | —    | Array of `{ title, url }`. Title 1–255, URL valid URL. |
| `coreObjectives`               | Core Objectives           | Yes      | —   | —    | At least one objective; each objective max 400 chars. |
| `expectedValueRoi`             | Expected Value (ROI)       | Yes      | 1   | 600  | What will change or improve (qualitative/quantitative). |
| `metric`                       | Metric                     | Yes      | 1   | 600  | How success is measured. |
| `milestones`                   | Milestones                 | No       | —   | —    | Array of milestone objects (see below). |
| `budgetRows`                   | (Budget)                   | No       | —   | —    | Array of budget row objects (see below). |

**Subcomponent – Core Objectives:** `FormWorkPackagesObjectives.svelte` (list of strings).  
**Subcomponent – Supporting links:** `FormLinks.svelte` (uses `supportingInfoLinkSchema`: title 1–255, url valid URL).

#### Milestone (per work package)

**Component:** `FormWorkPackagesMilestones.svelte`; add/edit via dialog.  
**Schema:** `milestoneSchema`.

| Field id             | Label                | Required | Min | Max | Notes |
|----------------------|----------------------|----------|-----|-----|--------|
| `milestoneName`      | Milestone (and reference name) | Yes | 1 | 100 | e.g. Milestone 1 – Design Approval. |
| `deliverables`       | Deliverables         | Yes      | 1   | 600 | Concrete outputs (reports, code, docs, etc.). |
| `acceptanceCriteria` | Acceptance Criteria  | Yes      | 1   | 600 | Objective conditions for approval and payment. |
| `duration`           | Duration             | Yes      | 1   | 200 | e.g. 2 weeks. |

#### Budget row (per work package)

**Component:** `FormWorkPackagesBudget.svelte`; add/edit via dialog.  
**Schema:** `budgetRowInputSchema`. Cost categories from `costCategories.json` (name + description).

| Field id         | Label           | Required | Constraints | Notes |
|------------------|-----------------|----------|-------------|--------|
| `costCategory`   | Cost Category   | Yes      | Enum from costCategories.json | e.g. Development, Infrastructure. |
| `itemDescription`| Item Description| Yes      | 1–600 chars | |
| `qty`            | Quantity        | Yes      | Number ≥ 0.001 | |
| `unitCostAda`    | Unit Cost (ADA) | Yes      | Number ≥ 0 | |
| (computed)       | Total (ADA)     | —        | qty × unitCostAda | Set by schema transform. |

### 3.3 Financial Summary

**Component:** `FormFinancialSummary.svelte`  
**Section:** Card “Financial Summary: Cost Category Breakdown”.

- **ADA/USD conversion rate** (`adaUsdConversionRate`): Required. Number &gt; 0. Displayed with prefix `$`, suffix `/ ADA`, optional comma decimal. Used to convert all ADA totals to USD in the summary table.
- **Cost category breakdown table:** Aggregates budget rows from all work packages by cost category; shows category name, description (from `costCategories.json`), total ADA, total USD. No extra form fields; read-only summary.

---

## Section 4: Administrative & Verification

**Component:** `FormAdministrative.svelte`  
**Section id:** `administrative-verification`  
**Schema:** `formSchema.shape.administrative`

Fields are shown/hidden based on **Intersect Administrator?** and **Contracting Party** (company vs individual).

### 4.1 Administrator

| Field id                | Label                   | Type   | Required | Max  | Notes |
|--------------------------|-------------------------|--------|----------|------|--------|
| `intersectAdministrator` | Intersect Administrator?| Boolean| Yes      | —    | Yes/No. |
| `otherAdministrators`    | Other Administrators?   | String | No       | 400  | Shown only if Intersect is not admin. Not public. |

### 4.2 Contracting Party

| Field id            | Label                    | Type    | Required | Max  | Notes |
|---------------------|--------------------------|---------|----------|------|--------|
| `contractingParty`  | Contracting Party Details| Enum    | Yes      | —    | "company" \| "individual". |

**If Company:**

| Field id                 | Label                  | Required | Max  | Not public |
|--------------------------|------------------------|----------|------|------------|
| `legalEntityName`        | Legal Entity Name      | Yes      | 100  | No         |
| `registrationNumber`     | Registration Number    | Yes      | 100  | Yes        |
| `countryOfIncorporation` | Country of Incorporation| Yes     | 2 (country code) | Yes |
| `registeredAddress`     | Registered Address     | Yes      | 100  | Yes        |

**If Individual:**

| Field id                | Label                    | Required | Max  | Not public |
|-------------------------|--------------------------|----------|------|------------|
| `countryOfResidence`    | Country of Residence     | Yes      | 2    | Yes        |
| `govtIssuedIdNumber`    | Govt Issued ID Number    | Yes      | 100  | Yes        |
| `fullResidentialAddress`| Full Residential Address | Yes      | 100  | Yes        |

### 4.3 Shared (Company and Individual)

| Field id               | Label                     | Required | Max  | Not public |
|------------------------|---------------------------|----------|------|------------|
| `primaryContactFullName`| Primary Contact Full Name | Yes      | 100  | —          |
| `primaryContactEmail`  | Primary Contact Email     | Yes      | 255  | Yes        |
| `xHandle`              | X Handle                   | No       | 100  | —          |

### 4.4 Signatory (card)

| Field id                 | Label                  | Required | Max  | Not public |
|--------------------------|------------------------|----------|------|------------|
| `signatoryName`          | Signatory Name         | Yes      | 100  | Yes        |
| `signatoryTitle`         | Signatory Title        | Yes      | 100  | Yes        |
| `signatoryEmail`         | Signatory Email        | Yes      | 255  | Yes        |
| `signatoryAuthorization` | Signatory Authorization| Yes      | —    | Yes (checkbox) |

### 4.5 Other administrative

| Field id                       | Label                            | Required | Max  | Not public | Notes |
|--------------------------------|----------------------------------|----------|------|------------|--------|
| `totalProposalsSubmitted`      | Total Proposals Submitted        | No       | 100  | Yes        | |
| `kycKybSubmitted`              | KYC/KYB Submitted?               | Yes      | —    | Yes        | Yes/No. |
| `kycContactEmail`               | KYC Contact Email (If No)        | No       | 255  | Yes        | Shown if KYC/KYB = No or null. |
| `treasuryRepayment`            | Treasury Repayment?              | Yes      | —    | —          | Yes/No. |
| `repaymentCircumstances`       | Repayment Circumstances          | No       | 800  | —          | Shown if Treasury Repayment = Yes. |
| `initiativeType`               | Initiative Type                  | Yes      | —    | —          | "new" \| "maintenance". |
| `typeOfProposal`               | Type of Proposal                 | Yes      | —    | —          | "technical" \| "non-technical". |
| `priorFunding`                 | Prior Funding                    | Yes      | 800  | —          | Catalyst/Treasury/other grants. |
| `treasuryDonationVerificationHash` | Treasury Donation Verification Hash | Yes | 64 | —       | Transaction hash (1000 ADA donation). |
| `thirdPartyAssurers`           | Third Party Assurers             | No       | 600  | —          | |
| `supportingInfoLinks`          | Other Supporting Info            | No       | —    | —          | Array of `{ title, url }`. Title 1–255, URL valid URL. |

---

## Section 5: Proposal Submission Legal Declarations

**Section id:** `proposal-submission-legal-declarations`

No form fields in the main page. Text explains that legal declarations will be confirmed when the user submits. On **Save Draft**, after main form validation, the **Proposal Submission Legal Declarations** dialog opens.

---

## Legal Declarations dialog (on submit)

**Component:** `FormLegalDeclarations.svelte`  
**Schema:** `declarationsSchema`

Displayed in a dialog after main form validation. Contains explanatory text and the following fields:

### Data protection (checkboxes)

| Field id                 | Label/Meaning | Required | Notes |
|--------------------------|----------------|----------|--------|
| `dataProcessingConsent`  | Consent to data processing and sharing | Yes | Must be true. |
| `publicVisibilityConsent`| Agreement that entity name, personal name, X handle will be publicly visible | Yes | Must be true. |

### Declaration of submitter

| Field id           | Label | Required | Min | Max  | Notes |
|--------------------|-------|----------|-----|------|--------|
| `submitterName`    | Name  | Yes      | 1   | 100  | |
| `submitterRole`    | Role  | Yes      | 1   | 100  | |
| `submitterEmail`   | Email | Yes      | 1   | 255  | Valid email. |
| `authorizedToSubmit`  | Authorization to submit on behalf of vendor | Yes | — | — | Must be true. |
| `authorizedToAttest`  | Authorization to attest to all legal declarations | Yes | — | — | Must be true. |

---

## Controls section

**Section id:** `controls`  
Sticky bottom bar (orange background, `bg-(--mbo-orange)`), with **Save Draft** (submit). Triggers main form validation and, on success, opens the Legal Declarations dialog.

---

## Shared / reusable schemas and data

- **supportingInfoLinkSchema:** `title` 1–255, `url` valid URL. Used for work package supporting links and administrative “Other Supporting Info”.
- **Cost categories:** Defined in `costCategories.json`; each entry has `name` and `description`. Used for budget row cost category dropdown and financial summary description column.
- **KPI targets:** Defined in `targets.json`; each entry has `title` and `description` (e.g. “2030 Target: …”). Used by FormFocusAreaKPI to show target badges for known KPIs.

---

## Component → schema reference

| Component                  | Schema / shape used |
|---------------------------|----------------------|
| Form.svelte (section 1)   | formSchema (title, summary, trackRecord) |
| FormFocusArea.svelte      | formSchema.shape.category |
| FormFocusAreaKPI.svelte   | formSchema.shape.kpis |
| FormTimeline.svelte       | formSchema.shape.timeline |
| FormWorkPackages.svelte   | formSchema.shape.workPackages, workPackageSchema |
| FormWorkPackagesObjectives.svelte | workPackageSchema.shape.coreObjectives |
| FormWorkPackagesMilestones.svelte | workPackageSchema.shape.milestones, milestoneSchema |
| FormWorkPackagesBudget.svelte     | workPackageSchema.shape.budgetRows, budgetRowSchema / budgetRowInputSchema |
| FormFinancialSummary.svelte      | formSchema.shape.adaUsdConversionRate |
| FormAdministrative.svelte | formSchema.shape.administrative |
| FormLegalDeclarations.svelte     | declarationsSchema |
| FormLinks.svelte          | supportingInfoLinkSchema (or shape wrapping it) |

Validation errors are passed down as `validationErrors` (treeified Zod errors) and displayed per field by the form components.
