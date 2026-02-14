# Budget Form Codebase – Code Review

Review of `Form.svelte` and all budget form subcomponents: structure, correctness, maintainability, and suggested improvements. Schema and validation live in `Schema.js`; UI in `src/lib/budget2026/*` and `src/lib/form/*`.

**Recent context:** Form uses `FormFocusArea` and `FormFocusAreaKPI` (renamed from CategorySelector/KPISelector). Focus area change with existing KPIs shows an alert dialog; KPIs are cleared via `onUpdate` and `formData.kpis` is bound to FormFocusAreaKPI. KPI targets live in `targets.json`. Save Draft controls section is sticky with orange background.

---

## 1. Critical issues

### 1.1 Unused `budget` prop on `Form.svelte`

**Location:** `Form.svelte` line 16  
**Issue:** The form accepts `let { budget, categories } = $props()` but `budget` is never used in the template or script.  
**Impact:** Misleading API; callers may pass `budget` expecting it to be used (e.g. prefill or draft load).  
**Recommendation:** Either use `budget` (e.g. to initialize `formData` when editing a draft) or remove it from the props and document that only `categories` is used.

---

## 2. Consistency and maintainability

### 2.1 Mixed patterns for updating array values in list components

**Location:** FormWorkPackagesBudget, FormWorkPackagesMilestones, FormWorkPackagesObjectives, FormLinks  
**Issue:** Some components do `if (onvaluechange) onvaluechange(next); else value = next;`, others only `value = next`. Parent sometimes passes `onvaluechange`, sometimes relies on `bind:value`.  
**Impact:** Works but is inconsistent; future contributors may be unsure which pattern to use.  
**Recommendation:** Standardize: either always support both (callback + bindable) and document it, or use only `bind:value` and drop `onvaluechange` where the parent already binds.

### 2.2 Schema key naming vs. `z.treeifyError` structure

**Location:** All uses of `z.treeifyError(result.error)`  
**Issue:** Zod 4's tree uses `properties` and `items` for nested errors. If your schema ever has a key literally named `properties` or `items`, the tree shape could be ambiguous.  
**Impact:** Low with current schema (no such keys), but worth being aware of for future schema changes.  
**Recommendation:** Document this in a short comment near the first use of `treeifyError`, or in a shared validation/error-handling doc. Avoid naming schema fields `properties` or `items`.

---

## 3. Accessibility and UX

### 3.1 Work package expand/collapse: button contains Badge (total ADA)

**Location:** `FormWorkPackages.svelte` – expand button and Badge  
**Issue:** The button includes the Badge (total ADA) in its clickable area, placed directly behind the title. The Badge is decorative; ensure the accessible name reflects only the action (e.g. "Expand/collapse work package …") and not the numeric value, or expose the total in a separate visible/correctly associated label if needed for screen readers.  
**Recommendation:** Confirm the button's accessible name (and `aria-expanded` / `aria-controls`) is clear; consider `aria-hidden="true"` on the Badge if it's redundant with the title for screen readers.

### 3.2 Financial summary table: total row `colspan="2"`

**Location:** `FormFinancialSummary.svelte` – table footer  
**Issue:** Total row uses `colspan="2"` for the first cell. If the table has 4 columns (Category, Description, Total ADA, Total USD), this is correct. Verify that column count and colspan stay in sync if columns are added or reordered.  
**Recommendation:** No change required if column count is stable; if you add/remove columns later, double-check colspan and consider deriving it from the number of "label" columns.

### 3.3 Dialog focus and focus trap

**Location:** All dialogs (work package, milestone, budget position, links, declarations)  
**Issue:** Not verified whether focus is trapped inside the dialog and returned to the trigger on close (handled by bits-ui/Dialog).  
**Recommendation:** Rely on the dialog primitive's focus behavior; if you ever replace it, re-test focus trap and "focus back to trigger" so keyboard and screen-reader users aren't left with focus in the background.

---

## 4. Performance and structure

### 4.1 Revalidation effect and `formDataSnapshot`

**Location:** `Form.svelte` – `$effect` that revalidates on `formDataSnapshot`  
**Issue:** `formDataSnapshot` is `JSON.stringify(...)` of a large subset of `formData`. Any change to those keys triggers a full re-parse and re-treeify of errors. For a large form this could be heavy.  
**Impact:** Likely acceptable for typical proposal size; could become slow with many work packages and budget rows.  
**Recommendation:** Keep as-is unless you see lag; if needed, consider debouncing revalidation or only revalidating when the user leaves a field (e.g. on blur) instead of on every keystroke.

### 4.2 Initial `formData` and default work package

**Location:** `Form.svelte` – initial `formData` state  
**Issue:** Initial state includes one full example work package with milestones and budget rows. That's useful for demos but may be confusing in production (e.g. "Do I delete this or edit it?").  
**Recommendation:** Consider starting with `workPackages: []` in production and only inject the example in dev/demo mode, or make the initial example clearly labeled (e.g. "Example – replace with your own").

---

## 5. Security and data

### 5.1 No submit to API after legal declarations

**Location:** `Form.svelte` – `confirmDeclarations()`  
**Issue:** Comment: `// TODO: submit to API with full formData (including legalDeclarations)`. After declarations pass validation, nothing is sent to the backend.  
**Impact:** Form is "submit-ready" in the UI but does not persist; data can be lost on refresh.  
**Recommendation:** Implement the API call in `confirmDeclarations()` (or a dedicated submit function), send the full payload (main form + legal declarations), and handle loading/error state and post-success navigation or messaging.

---

## 6. Testing and robustness

### 6.1 No defensive checks for `categories` in Form

**Location:** `Form.svelte` – `FormFocusArea` and `FormFocusAreaKPI`  
**Issue:** If `categories` is undefined or null (e.g. API failure or wrong parent), `FormFocusArea` and `FormFocusAreaKPI` may throw when they call `categories.map(...)` or `categories.find(...)`.  
**Recommendation:** In Form.svelte, derive a safe list (e.g. `const categoryList = $derived(Array.isArray(categories) ? categories : []);`) and pass that to the children, or add guards inside the child components so they tolerate missing `categories`.

### 6.2 DatePicker and `value.startDate` / `value.endDate`

**Location:** `FormTimeline.svelte` – `bind:value={value.startDate}` and `bind:value={value.endDate}`  
**Issue:** If `value` is undefined or not an object, `value.startDate` access could throw. Form always passes `formData.timeline`, which is an object, so this is currently safe.  
**Recommendation:** Keep passing a stable object (e.g. always `formData.timeline`). If Form is ever used without initializing `timeline`, ensure it's `{ startDate: undefined, endDate: undefined }` so the binding never runs on undefined.

---

## 7. Summary table

| Severity   | Item                                      | Location / component              |
|-----------|--------------------------------------------|-----------------------------------|
| Critical  | Unused `budget` prop                       | Form.svelte                       |
| Improve   | Consistent `value` vs. `onvaluechange`     | List/dialog components            |
| TODO      | API submit after declarations              | Form.svelte                       |
| Guard     | Safe `categories` when undefined           | Form.svelte / focus components     |

---

## 8. Suggested order of work

1. **Props and API:** Decide whether to use or drop `budget`; document Form's public props.
2. **Maintainability:** Standardize list/dialog value update pattern.
3. **Feature:** Implement API submit in `confirmDeclarations()` and add loading/error handling and tests where possible.

This review reflects the current codebase. Re-check after large refactors or dependency upgrades (e.g. Zod or bits-ui).
