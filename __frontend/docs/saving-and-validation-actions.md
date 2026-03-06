# Saving and Validation Actions

This document describes what happens on each save and validation action in the proposal form flow: FormControls (draft/live), page `onSave` handling, navigation, and the Budget 2026 legal declarations flow.

## Overview

- **FormControls** (`$lib/components/form/FormControls.svelte`) provides the sticky bottom bar: "Save Draft", "Submit Proposal" / "Re-Submit Proposal", and the Auto-save toggle. It calls the page’s `onSave(payload, options)` and manages dirty state and leave confirmation.
- **Pages** (new proposal and edit proposal) implement `onSave`: they call the API, set `validationErrors` on failure, and decide when to navigate to `/dashboard` or open the legal dialog (Budget 2026 only).

---

## 1. FormControls: Where `onSave` is invoked

| Trigger | Payload `status` | `options` | When |
|--------|-------------------|-----------|------|
| **Save Draft** (button) | `"draft"` | `{ fromAutoSave: false }` | User clicks "Save Draft" |
| **Auto-save** (interval) | `"draft"` | `{ fromAutoSave: true }` | Every 2 minutes when draft, if auto-save is enabled |
| **Submit Proposal** / **Re-Submit** (button) | `"live"` | *(none)* | User clicks "Submit Proposal" or "Re-Submit Proposal" |
| **Form submit** (e.g. Enter) | `"live"` | *(none)* | Parent form’s `onsubmit` calls `formControlsRef.submit()` → same as button |

Budget 2026 form can also call `onSave` from the legal declarations modal:

| Trigger | Payload `status` | `options` | When |
|--------|-------------------|-----------|------|
| **Legal modal confirm** | `"live"` | `{ fromLegalModal: true }` | User confirms legal declarations in the modal after a first submit that failed with only legal errors |

---

## 2. Page `onSave` behaviour (new and edit)

Both **new** (`[budgetSlug]/new/+page.svelte`) and **edit** (`[budgetSlug]/[proposalId]/+page.svelte`) follow the same logic; only the API differs:

- **New proposal:** `POST /proposals` with `{ ...payload, voteId: vote._id }`
- **Edit proposal:** `PUT /proposals/:id` with `{ ...payload, voteId: proposal.voteId }`

### 2.1 Before the request

- `saving = true`
- `validationErrors = null`
- If `options?.fromLegalModal` is not set: `openLegalDialog = false` (so a previous legal dialog is closed when starting a new submit from the main form)

### 2.2 On success (`res.ok`)

- Toast: "Proposal created." / "Draft saved." (new) or "Proposal submitted." / "Proposal saved." (edit) depending on `payload.status`
- `formRef.clearDirty()` so the form is no longer considered dirty
- `await invalidateAll()` to refresh loaders
- **Navigation:**  
  `goto("/dashboard")` only when:
  - `payload.status === "live"`, or  
  - `payload.status === "draft"` and **not** auto-save (`!options?.fromAutoSave`)

So:

- **Auto-save (draft, `fromAutoSave: true`):** no navigation; user stays on the form.
- **Manual Save Draft (draft, `fromAutoSave: false`):** navigate to dashboard.
- **Submit / Re-Submit (live):** always navigate to dashboard (including when sent from the legal modal with `fromLegalModal: true`).

### 2.3 On validation/API error (`!res.ok`)

- `validationErrors = json.errors` (if present)
- **Only legal errors (Budget 2026):**  
  If `payload.status === "live"` and all validation errors are under `metaData.legalDeclarations`:
  - No generic error toast
  - `openLegalDialog = true`
  - `showLegalErrors = (options?.fromLegalModal === true)` so the legal modal can show field-level errors when the user has already tried from the modal
- **Other errors:**  
  Generic error toast with `json?.message` (or fallback).
- `throw new Error(...)` so callers (e.g. legal modal) can handle failure.

### 2.4 On catch (network or thrown error)

- If `err?.body?.errors` exists, set `validationErrors = err.body.errors`
- Same “only legal” vs “other” logic as above for toasts and opening the legal dialog
- Re-throw

### 2.5 Finally

- `saving = false`

---

## 3. Budget 2026: Legal declarations flow

1. User clicks **Submit Proposal** or **Re-Submit** (or form submit).
2. FormControls calls `onSave(getPayload("live"))` (no options).
3. If the API returns success → page navigates to `/dashboard` (see above).
4. If the API returns validation errors **and** they are **only** under `metaData.legalDeclarations`:
   - Page sets `openLegalDialog = true`, `showLegalErrors = false`, no generic toast.
   - Legal declarations modal opens; user fills/confirms and clicks “Confirm and submit”.
5. Form calls `onSave(getPayload("live"), { fromLegalModal: true })`.
6. If that request succeeds → page navigates to `/dashboard`.
7. If that request fails again with only legal errors:
   - Page sets `openLegalDialog = true`, `showLegalErrors = true`.
   - Modal stays open and shows field-level `validationErrors` for the legal form.

So the legal dialog is only opened when the first submit (or a retry from the modal) fails with **only** legal-declaration errors; other validation errors are shown in the main form and via toast.

---

## 4. Dirty state and leave confirmation (FormControls)

- **Dirty:** Form is dirty when the current serialized payload (from `getPayload(formData.status)`) differs from the initial snapshot (set when the form loads or after a successful save).
- **Leaving with dirty form:**
  - **In-app navigation:** `beforeNavigate` cancels and opens an “Unsaved changes” dialog. User can “Stay” or “Leave” (then `goto` to the intended URL).
  - **Browser close/refresh:** `beforeunload` prompts the browser’s native “Leave site?” dialog.
- After a successful **Save Draft**, **Submit**, or **Re-Submit**, FormControls updates the baseline (`initialSnapshot = payload`), so the form is no longer dirty. The page also calls `formRef.clearDirty()` which forwards to FormControls’ dirty reset where applicable.

---

## 5. Quick reference

| User action | status | options | Navigate to dashboard? | Notes |
|------------|--------|---------|------------------------|-------|
| Save Draft (button) | draft | `fromAutoSave: false` | Yes | |
| Auto-save (interval) | draft | `fromAutoSave: true` | No | Every 2 min when enabled |
| Submit / Re-Submit (button or form) | live | — | Yes on success | May open legal dialog if only legal errors |
| Legal modal “Confirm and submit” | live | `fromLegalModal: true` | Yes on success | Retry after first submit failed with only legal errors |

Validation errors from the API are always stored in the page’s `validationErrors` and passed into the form (and in Budget 2026, into the legal modal when `showLegalErrors` is true). Navigation only happens on successful save, and only when the save is either a live submit or a manual draft save (not auto-save).
