# Auto-save rewrite plan

Rewrite auto-save so it is always on for draft proposals only, with no toggle or title requirement. Remove all legacy auto-save code, allow drafts without title, and show "Untitled Draft" on the dashboard for drafts with no title.

---

## 1. FormControls: auto-save always on for drafts, no legacy props

- **Remove legacy props/state:**
  - Props: `autoSaveEnabled`, `isNewUnsaved`.
  - State: `newPageAutoSaveEnabled`.
  - Derived: `hasTitle`, `effectiveAutoSaveEnabled`, `toggleDisabled`.
  - The `$effect` that forces `newPageAutoSaveEnabled = false` when `isNewUnsaved && !hasTitle`.
- **Keep:** `autoSavePaused` (optional pause flag for modals).
- **Auto-save effect:**
  - Start the interval **only when**:
    - `formData.status === "draft"`,
    - `!autoSavePaused`,
    - `onSave` and `getPayload` are defined.
  - On each tick:
    - If `!isDirty`, **do nothing** (skip save).
    - If `isDirty`, build `const payload = getPayload("draft")` and call `onSave(payload, { fromAutoSave: true })`.
  - **Do not** require title anywhere (no `hasTitle`, no `if (!payload?.title?.trim()) return`).
- **Last save timestamp (local only):**
  - Add `let lastAutoSaveAt = $state(null);` in FormControls.
  - After **any** successful draft save (auto-save or manual "Save" / "Save & Exit"), set `lastAutoSaveAt = Date.now()` in the `.then()` of that save.
  - Any "Last saved …" UI reads from this local variable; there is **no global store**.
- **Draft buttons and navigation (save without exiting):**
  - **Current behaviour:** Both "Save" and "Save & Exit" call `saveDraft()` with `onSave(payload, { fromAutoSave: false })`. The dashboard pages navigate whenever a draft is saved and `!options?.fromAutoSave`, so **both buttons currently navigate** — there is no "save and stay on page" today. The "Save" button is present in FormControls but behaves the same as "Save & Exit".
  - **New behaviour to implement:**
    - **"Save"** button: call `onSave(payload, { fromAutoSave: false, exitAfterSave: false })`. Saves the draft and **does not** navigate; user stays on the form.
    - **"Save & Exit"** button: call `onSave(payload, { fromAutoSave: false, exitAfterSave: true })`. Saves the draft and navigates to dashboard.
    - In FormControls: either two separate handlers (e.g. `saveDraftAndStay()` / `saveDraftAndExit()`) or one `saveDraft(exitAfterSave)` that passes the flag.
    - Page `onSave` (new and edit): navigate to `/dashboard` only when `payload.status === "live"` **or** when `options?.exitAfterSave === true`. Do **not** navigate when draft save with `exitAfterSave === false` (or absent for backwards compatibility: treat as "stay" if you prefer).
- **Old imports to delete:**
  - Remove unused imports `* as Switch`, `* as Popover`, and `InfoIcon` from `FormControls.svelte`.

---

## 2. Form.svelte (budget2026): remove all auto-save preference and legacy

- Delete `BUDGET2026_AUTOSAVE_KEY` and `autoSaveEnabled` state.
- Remove onMount that reads from localStorage and `$effect` that writes `autoSaveEnabled` to localStorage.
- Remove `isNewUnsaved` derived.
- Stop passing `bind:autoSaveEnabled` and `isNewUnsaved` into FormControls; only pass `formData`, `getPayload`, `onSave`, `previewHref` (and `autoSavePaused` if ever needed).

---

## 3. Validation: drafts can be saved without title

- In `validation/budget2026/validationScript.js`, `createDraftProposalBodySchema`:
  - Change `title` from `z.string().min(1, "Title is required").max(100)` to something like:
    - `title: z.string().max(100).optional().default("")`
  - Keep `voteId` required.

---

## 4. Dashboard: show "Untitled Draft" when no title

- In `__frontend/src/routes/(private)/dashboard/+page.svelte`, wherever the proposal title is displayed:
  - If `proposal.status === "draft"` and `!proposal.title?.trim()`, show **"Untitled Draft"**.
  - Else show `proposal.title ?? proposal._id`.

---

## 5. Auto-save caption inside sticky bar

- Place the caption **inside the same sticky container as the buttons**, in a row **below the buttons**, aligned **on the left**.
- **Text:** `"Your changes are saved automatically every {X} minutes (Last saved: {timestamp short})"`
  - **{X}:** Derive from the same variable used for the interval, e.g. `AUTO_SAVE_INTERVAL_MS / 60000` (so the caption stays correct if the interval is changed).
  - **{timestamp short}:** Use local `lastAutoSaveAt`; format as short time (e.g. "14:32" or locale short time). When no save has occurred yet, show a placeholder (e.g. "—" or "Not yet saved").
- Only show this caption when the form is in draft mode (`formData.status === "draft"`).

---

## 6. Toasts

- **Keep toasts** for all saves.
- When the save is **auto-save** (`options?.fromAutoSave === true`), show toast: **"Draft autosaved"** (instead of "Draft saved." / "Proposal saved.").
- When the save is manual (Save or Save & Exit), keep existing success messages (e.g. "Draft saved." / "Proposal saved.").
- Implement in the dashboard pages' `onSave` (new and edit): if `payload.status === "draft"` and `options?.fromAutoSave`, toast "Draft autosaved"; else keep current message.

---

## 7. Documentation updates

- **`__frontend/docs/saving-and-validation-actions.md`**
  - Remove mentions of an "Auto-save toggle" and "if auto-save is enabled".
  - Say: auto-save is always on for drafts (no toggle).
  - In the table, change Auto-save row to: "Every 2 minutes when draft".
  - In quick reference, change "Every 2 min when enabled" → "Every 2 min (drafts only)".
- **`__frontend/docs/budget2026/frontend-backend-validation-review.md`**
  - Update the draft description from "only requires title and voteId" → "requires voteId and optionally title" (or equivalent wording).
- **Optionally** adjust `docs/proposal-flow.md` / `docs/proposal-schema-description.md` if they claim a title is required for drafts.

---

## 8. Other draft-save conditions (verified)

- Draft validation is only in `validation/budget2026/validationScript.js` via `createDraftProposalBodySchema` and `validate()`. No other backend or frontend conditions for saving drafts were found; relaxing the title requirement in that schema is sufficient.

---

## Files to touch (summary)

| File | Action |
|------|--------|
| `__frontend/src/lib/components/form/FormControls.svelte` | Remove legacy toggle logic; draft-only, dirty-only auto-save; local `lastAutoSaveAt` updated on any successful draft save; "Save" vs "Save & Exit" (pass `exitAfterSave`); caption row below buttons, left, using interval variable for "every X minutes". |
| `__frontend/src/lib/forms/budget2026/Form.svelte` | Remove `BUDGET2026_AUTOSAVE_KEY`, `autoSaveEnabled`, localStorage, `isNewUnsaved`, and related props. |
| `__frontend/src/routes/(private)/dashboard/[budgetSlug]/[proposalId]/+page.svelte` | Navigate only when `exitAfterSave` is true or status is live; toast "Draft autosaved" when `fromAutoSave` is true. |
| `__frontend/src/routes/(private)/dashboard/[budgetSlug]/new/+page.svelte` | Same: navigate only when `exitAfterSave`; toast "Draft autosaved" for auto-save. |
| `validation/budget2026/validationScript.js` | Relax draft title requirement. |
| `__frontend/src/routes/(private)/dashboard/+page.svelte` | Show "Untitled Draft" for draft proposals with empty titles. |
| `__frontend/docs/saving-and-validation-actions.md` | Remove toggle wording; document new auto-save behavior. |
| `__frontend/docs/budget2026/frontend-backend-validation-review.md` | Align draft validation description with new schema. |

---

## Behaviour after changes

- **Draft proposals:** Auto-save runs every 2 minutes while on a draft form, but only actually sends a save when the form is dirty (`isDirty`). No toggle, no title requirement. New proposals (no `_id` yet) create on first auto-save (POST), then update (PUT) on subsequent saves.
- **Live proposals:** No auto-save (effect only runs when `formData.status === "draft"`).
- **Dashboard:** Drafts with no title display as "Untitled Draft".
- **Last saved:** `lastAutoSaveAt` is updated in FormControls after any successful draft save (auto-save, "Save", or "Save & Exit"). Caption inside the sticky bar (below buttons, left) shows "Your changes are saved automatically every X minutes (Last saved: …)" with X from the interval variable.
- **Toasts:** Auto-save shows "Draft autosaved"; manual saves keep existing messages.
- **Save vs Save & Exit:** Only "Save & Exit" triggers navigation; "Save" keeps the user on the form.
