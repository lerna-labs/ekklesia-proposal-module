# Budget 2026 form — Code review

---

| Field            | Detail                                                                 |
|------------------|------------------------------------------------------------------------|
| **Version**      | 1.0.0                                                                  |
| **Created**      | 2025-03-03                                                             |
| **Scope**        | `__frontend/src/lib/forms/budget2026/`                                |

---

This document is a code review of the Budget 2026 form implementation. It lists **potential bugs**, **issues**, and **improvements** by file or area.

---

## 1. Potential bugs

### 1.1 FormTreasuryDonation — validation errors not scoped to metaData

**File:** [FormTreasuryDonation.svelte](../src/lib/forms/budget2026/FormTreasuryDonation.svelte)

**Issue:** The component passes the root `validationErrors` to `Input` and `Checkbox`. Those components resolve errors via `validationErrors?.properties?.[id]` (where `id` is `treasuryDonationTxHash` or `treasuryDonationConfirmed`). The API error tree is nested under `metaData`, so the correct path is `validationErrors.properties.metaData.properties.<fieldId>`. With the root passed, server-side errors for these two fields never match and are not shown.

**Fix:** Derive a metaData slice and pass it, e.g. `const metaErrors = $derived(validationErrors?.properties?.metaData);` and pass `metaErrors` (or `metaErrors?.properties` if the Input expects the node whose `properties` are the fields) to Input/Checkbox so that `properties[ id ]` resolves to the right node. Align with how FormStrategyFramework passes `sfErrors` or FormBudgetSummary passes `treasuryRepaymentErrors`.

---

### 1.2 Form.svelte — prefill runs only once per component instance

**File:** [Form.svelte](../src/lib/forms/budget2026/Form.svelte) (lines 153–158)

**Issue:** `prefilled` is set to `true` after the first prefill. If the same form instance is reused for a different proposal (e.g. SPA navigation from proposal A to proposal B without remounting), prefill will not run again and the form will still show proposal A’s data.

**Fix:** Either key the form (or parent) by `proposal?._id` so the component remounts when the proposal changes, or reset `prefilled = false` when `proposal` identity changes and run prefill when `proposal` changes (e.g. track `proposal?._id` and clear `prefilled` when it changes).

---

### 1.3 Form.svelte — getPayload sends types backend may reject

**File:** [Form.svelte](../src/lib/forms/budget2026/Form.svelte) (lines 295–297)

**Issue:** `getPayload(status)` returns `{ ...formData, status }` with no coercion. `formData.metaData.estimatedDuration` is initialised and can remain `""`; `formData.metaData.proposalDetails.conversionRate` is a string from `InputNumber`. The backend expects `estimatedDuration` as a number (min 1) and `conversionRate` as a number > 0. Sending `""` or non-numeric strings can cause validation to fail with less clear errors.

**Fix:** In `getPayload` (or in a single place before calling `onSave`), coerce/validate and set: `estimatedDuration` to a number (e.g. `Number(formData.metaData.estimatedDuration)` or keep empty and let backend error), and `conversionRate` to a number (e.g. parse from string). Alternatively document that backend is the source of truth and rely on server errors, but then consider at least parsing so valid numeric strings are sent as numbers.

---

### 1.4 FormWorkPackages — prefill of work package coreObjectives to `[""]`

**File:** [Form.svelte](../src/lib/forms/budget2026/Form.svelte) (lines 226–227, 254–255)

**Issue:** When a work package has no `coreObjectives` from the API, prefill sets `coreObjectives: [""]`. The work package schema requires at least one objective and each item `min(1)`. A single empty string fails validation, so the user can open the edit dialog, see one empty objective, and get a validation error on save until they type something. Not wrong, but combined with “at least one” UX it can be confusing.

**Improvement:** Consider prefilling to `[]` and letting the schema/UI require “at least one” so the error message is explicit, or keep `[""]` and ensure the “Add Core Objective” / empty state copy makes the requirement obvious.

---

## 2. Issues and code quality

### 2.1 FormWorkPackages — console.log in production path

**File:** [FormWorkPackages.svelte](../src/lib/forms/budget2026/FormWorkPackages.svelte) (lines 122–126, 134)

**Issue:** `console.log` is used on validation failure and on successful save. This clutters the console and may leak form data in production.

**Fix:** Remove these logs or guard with a dev flag / logger that is no-op in production.

---

### 2.2 FormWorkPackagesCard — milestone alternative synced on every keystroke

**File:** [FormWorkPackagesCard.svelte](../src/lib/forms/budget2026/FormWorkPackagesCard.svelte) (lines 124–134)

**Issue:** An `$effect` runs when `noMilestonesBreakdown && localMilestoneAlternative !== (milestoneAlternative ?? "")` and calls `onMilestoneOptionChange?.({ noMilestonesBreakdown: true, milestoneAlternative: localMilestoneAlternative })`. So every keystroke in the milestone-alternative textarea updates parent state and may trigger re-renders or upstream logic.

**Fix:** Consider debouncing the sync (e.g. 300 ms) or syncing only on blur so typing doesn’t trigger a cascade of updates. If the parent must stay in sync for other reasons (e.g. dirty check), document it and keep as is.

---

### 2.3 FormWorkPackagesCard — duplicate role="button" and click/key handling

**File:** [FormWorkPackagesCard.svelte](../src/lib/forms/budget2026/FormWorkPackagesCard.svelte) (lines 182–196)

**Issue:** The “I can’t break down my work in Milestones” label uses a wrapper `div` with `role="button"`, `tabindex="0"`, `onclick`, and `onkeydown`, while the actual control is a `Checkbox` with `pointer-events-none`. This works but duplicates semantics; the checkbox is not the focus target.

**Improvement:** Either make the checkbox the only interactive element and use a proper `<label for="...">`, or keep the wrapper but ensure one clear focus target and avoid double “button” exposure for assistive tech.

---

### 2.4 FormWorkPackagesMilestones — bindable value and callback both used

**File:** [FormWorkPackagesMilestones.svelte](../src/lib/forms/budget2026/FormWorkPackagesMilestones.svelte) (e.g. lines 84–90, 101–103)

**Issue:** The component both assigns `value = next` and calls `onvaluechange?.(next)`. The parent (FormWorkPackagesCard) passes `value={milestones}` (no `bind:value`), so propagation is via `onvaluechange`. The assignment to `value` may be redundant or confusing.

**Improvement:** Prefer a single contract: either the parent binds `value` and the child only assigns, or the parent uses a callback only and the child does not assign to `value`. Document which pattern is intended so future changes don’t break propagation.

---

### 2.5 FormBudgetAdministration — empty placeholder

**File:** [FormBudgetAdministration.svelte](../src/lib/forms/budget2026/FormBudgetAdministration.svelte)

**Issue:** The component only contains a comment “Budget administration – content to be added” and no UI. The section still appears in the accordion.

**Improvement:** If the section is not used, consider removing it from the accordion or hiding it until content exists; otherwise add a short “Coming soon” or hide the section from the nav so users don’t open an empty block.

---

### 2.6 Form.svelte — Object.assign then overwrites

**File:** [Form.svelte](../src/lib/forms/budget2026/Form.svelte) (lines 163 and following)

**Issue:** Prefill does `Object.assign(formData.metaData, p.metaData)` and then overwrites several keys (strategyFramework, supportingInfoLinks, proposalDetails, workPackages, legalDeclarations, etc.). This is correct but fragile: any new top-level key in `p.metaData` is copied; if a key is later overwritten with a different shape, the order of assignments matters.

**Improvement:** Consider building a fresh `metaData` object from `p.metaData` with explicit field mapping instead of assign + overwrites, so the prefill shape is obvious and new API keys don’t accidentally leak in or get half-overwritten.

---

## 3. Improvements

### 3.1 Schema.js — work package and backend alignment

**File:** [Schema.js](../src/lib/forms/budget2026/Schema.js)

- **budgetBreakdown:** Backend requires “at least one budget row” per work package; frontend schema has `budgetBreakdown` optional. Optionally add `.min(1, "...")` so the dialog validation matches backend and users see the error before submit.
- **Milestones:** Backend requires at least one milestone when not using “no milestones”. Schema.js comment says this is enforced on the backend only. Optionally add a `superRefine` that adds an error when `!noMilestonesBreakdown && (!milestones || milestones.length === 0)` so the same rule is visible in the UI.

---

### 3.2 Accessibility

- **Accordion triggers:** Section titles (e.g. “Treasury Donation”, “Project Definition”) are accordion triggers. Ensure they have an accessible name and that expanded/collapsed state is announced (e.g. `aria-expanded` and/or `aria-controls` if the accordion component doesn’t already).
- **Dialog focus:** When the legal declarations or work package dialogs open, focus should move to the first focusable element or the dialog container; when they close, focus should return to the trigger. Verify that the Dialog/AlertDialog usage does this (or add it).
- **Error association:** Where `Field.Error` is rendered, ensure it’s associated with the relevant control (e.g. `id` on the input and `aria-describedby` or the Field component’s pattern) so screen readers announce errors.

---

### 3.3 Error display consistency

- Some sections (e.g. FormStrategyFramework, FormProposalDetails) derive a scoped error object and pass it to children; others (e.g. FormTreasuryDonation) pass the root. Standardise so every section passes the slice of `validationErrors` that matches the section’s `formData` path (e.g. `metaData` section → `validationErrors.properties.metaData`), so Input/Checkbox/Textarea can use `properties[id]` consistently.

---

### 3.4 Types and documentation

- **formData shape:** The initial `formData` in Form.svelte and the payload from `getPayload` are not typed. Adding a TypeScript type or JSDoc for the form payload would reduce mistakes when changing fields or when integrating with the API.
- **Validation error tree:** The shape of `validationErrors` (from the API / `z.treeifyError`) is implicit. Document or type the expected structure (e.g. `{ properties?: Record<string, { errors?: string[], properties?: ... }> }`) so components that slice it do so correctly.

---

### 3.5 FormWorkPackages — draft not reset on dialog cancel

**File:** [FormWorkPackages.svelte](../src/lib/forms/budget2026/FormWorkPackages.svelte)

**Issue:** If the user opens Add/Edit, changes the draft, then clicks Cancel, the dialog closes but `draft` and `draftErrors` are left in their last state. The next time the user opens the dialog they see the previous draft until they open a specific package or Add again (which then resets).

**Improvement:** On AlertDialog.Cancel or when closing without save, reset `draft = getDefaultDraft()` and `draftErrors = null` so the next open starts clean. Optionally do the same when `addDialogOpen` becomes false (in an `$effect` or in the close handler).

---

### 3.6 FormWorkPackagesCard — milestone alternative Textarea validationErrors

**File:** [FormWorkPackagesCard.svelte](../src/lib/forms/budget2026/FormWorkPackagesCard.svelte) (lines 61–73, 214)

**Issue:** To avoid showing the section error twice, the component passes `validationErrorsWithoutMilestoneAlternativeError` to the Textarea, which strips `milestoneAlternative.errors`. Inline field errors for that input might then not show if the backend reports them under `milestoneAlternative`. Confirm whether backend sends field-level errors for `milestoneAlternative` and that they still appear (e.g. via a different path or a single section-level message).

---

## 4. Summary table

| Category        | Count |
|-----------------|-------|
| Potential bugs  | 4     |
| Issues / quality| 6     |
| Improvements    | 6     |

---

## Revision History

| Version | Date       | Description |
|---------|------------|-------------|
| 1.0.0   | 2025-03-03 | Initial code review: bugs, issues, improvements. |
