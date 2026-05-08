# Saving and Validation Actions

This document describes what happens on each save and validation action in the proposal form flow: FormControls (draft/live), page `onSave` handling, and navigation.

## Overview

- **FormControls** (`$lib/components/form/FormControls.svelte`) provides the sticky bottom bar: "Save", "Save & Exit", "Preview Proposal", and "Submit Proposal" / "Re-Submit Proposal". Auto-save is always on for drafts (no toggle). It calls the page's `onSave(payload, options)` and manages dirty state and leave confirmation.
- **Pages** (new proposal and edit proposal) implement `onSave`: they call the API, set `validationErrors` on failure, and decide when to navigate to `/dashboard`.

---

## 1. FormControls: Where `onSave` is invoked

| Trigger | Payload `status` | `options` | When |
|--------|-------------------|-----------|------|
| **Save** (button) | `"draft"` | `{ fromAutoSave: false, exitAfterSave: false }` | User clicks "Save" (stays on form) |
| **Save & Exit** (button) | `"draft"` | `{ fromAutoSave: false, exitAfterSave: true }` | User clicks "Save & Exit" (navigates to dashboard) |
| **Auto-save** (interval) | `"draft"` | `{ fromAutoSave: true }` | Every 2 minutes when draft and form is dirty |
| **Submit Proposal** / **Re-Submit** (button) | `"live"` | *(none)* | User clicks "Submit Proposal" or "Re-Submit Proposal" |
| **Form submit** (e.g. Enter) | `"live"` | *(none)* | Parent form's `onsubmit` calls `formControlsRef.submit()` → same as button |

---

## 2. Page `onSave` behaviour (new and edit)

Both **new** (`[voteSlug]/new/+page.svelte`) and **edit** (`[voteSlug]/[proposalId]/+page.svelte`) follow the same logic; only the API differs:

- **New proposal:** `POST /proposals` with `{ ...payload, voteId: vote._id }`
- **Edit proposal:** `PUT /proposals/:id` with `{ ...payload, voteId: proposal.voteId }`

### 2.1 Before the request

- `saving = true`
- `validationErrors = null`

### 2.2 On success (`res.ok`)

- **Toast:**  
  - If draft and `options?.fromAutoSave`: "Draft autosaved".  
  - Else: "Proposal created." / "Draft saved." (new) or "Proposal submitted." / "Proposal saved." (edit) depending on `payload.status`.
- `formRef.clearDirty()` so the form is no longer considered dirty
- `await invalidateAll()` to refresh loaders
- **Navigation:**  
  `goto("/dashboard")` only when:
  - `payload.status === "live"`, or  
  - `options?.exitAfterSave === true` (e.g. user clicked "Save & Exit")

So:

- **Auto-save (draft, `fromAutoSave: true`):** toast "Draft autosaved"; no navigation.
- **Save (draft, `exitAfterSave: false`):** toast "Draft saved." / "Proposal saved."; no navigation; user stays on the form.
- **Save & Exit (draft, `exitAfterSave: true`):** toast "Draft saved." / "Proposal saved."; navigate to dashboard.
- **Submit / Re-Submit (live):** navigate to dashboard on success.

### 2.3 On validation/API error (`!res.ok`)

- `validationErrors = json.errors` (if present)
- Generic error toast with `json?.message` (or fallback)
- `throw new Error(...)` so callers can handle failure.

### 2.4 On catch (network or thrown error)

- If `err?.body?.errors` exists, set `validationErrors = err.body.errors`
- Generic error toast with message from `err.body` or `err.message`
- Re-throw

### 2.5 Finally

- `saving = false`

---

## 3. Budget 2026: Legal declarations

Legal declarations are **accordion section 9** in the form. They are submitted together with the rest of the form when the user clicks "Submit Proposal" or "Re-Submit". There is no separate dialog; validation errors for legal declarations appear in section 9 like any other section. Legal declarations are never prefilled when editing a proposal; they must be confirmed on every submit or re-submit.

---

## 4. Dirty state and leave confirmation (FormControls)

- **Dirty:** Form is dirty when the current serialized payload (from `getPayload(formData.status)`) differs from the initial snapshot (set when the form loads or after a successful save).
- **Leaving with dirty form:**
  - **In-app navigation:** `beforeNavigate` cancels and opens an "Unsaved changes" dialog. User can "Stay" or "Leave" (then `goto` to the intended URL).
  - **Browser close/refresh:** `beforeunload` prompts the browser's native "Leave site?" dialog.
- After a successful **Save Draft**, **Submit**, or **Re-Submit**, FormControls updates the baseline (`initialSnapshot = payload`), so the form is no longer dirty. The page also calls `formRef.clearDirty()` which forwards to FormControls' dirty reset where applicable.

---

## 5. Quick reference

| User action | status | options | Navigate to dashboard? | Notes |
|------------|--------|---------|------------------------|-------|
| Save (button) | draft | `exitAfterSave: false` | No | Stay on form |
| Save & Exit (button) | draft | `exitAfterSave: true` | Yes | |
| Auto-save (interval) | draft | `fromAutoSave: true` | No | Every 2 min (drafts only), only when dirty |
| Submit / Re-Submit (button or form) | live | — | Yes on success | Full form including legal declarations (section 9) is submitted |

Validation errors from the API are stored in the page's `validationErrors` and passed into the form. Navigation only happens on successful save when the save is a live submit or "Save & Exit" (not on "Save" or auto-save).
