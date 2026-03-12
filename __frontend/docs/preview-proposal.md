# Preview Proposal: Behaviour and Risks

This document describes how the "Preview Proposal" feature works, how it behaves on reload and route changes, and a risk assessment.

## Overview

Preview lets the proposer see how their proposal will look on the public proposal page **without** saving to the server. Current form data is written to `localStorage`, and a **new** browser tab or window opens to show the proposal route with a `?preview` query parameter. That page loads vote metadata from the API but reads the proposal payload from `localStorage` and renders it.

- **When available:** The "Preview Proposal" button is shown only after the proposal has been saved at least once (draft or live), i.e. when `proposal._id` and `vote.slug` exist. So it appears on the edit flow and on the new-proposal flow after the first save (e.g. auto-save at 2 minutes or manual "Save").
- **No server save:** Clicking Preview does **not** trigger a save. It only serialises the current form state and opens the preview window.
- **Preview data kept in sync:** **FormControls** (with help from `$lib/previewProposalStorage.js`) writes the current payload (1) when the user clicks **"Preview Proposal"**, (2) after every successful **"Save"** or **auto-save** (draft), and (3) on a **debounce** (800 ms after the last form change). So the preview tab stays in sync for both draft and live proposals; the user can hit **reload** there to see the latest state.
- **Architecture:** Storage key and read/write/clear helpers live in `$lib/previewProposalStorage.js`. Form-side behaviour (preview href, button, write on save/debounce, clear on exit/submit) lives in **FormControls**; forms only pass `proposal`, `vote`, and the usual form props. The proposal view page and logout use the helper for read and clear.

---

## Current Behaviour

### 1. User flow

1. User clicks **"Preview Proposal"** in the form (dashboard new or edit).
2. **FormControls** (used by the form) builds the payload with `getPayload(formData.status)` (same shape as API submission). It uses the shared helper `$lib/previewProposalStorage.js` to write and clear.
3. Payload is written to `localStorage` under a **single key**: `proposal-preview`. Value is `{ proposalId, proposal }` (JSON). The key is updated when the user clicks **Preview Proposal**, after every successful **draft** save (manual "Save" or auto-save), and on a **debounce** (800 ms after form changes), so the preview tab can be reloaded to show the latest state (including for live proposals, which have no auto-save).
4. After the write, `window.open(href, "_blank", "noopener,noreferrer")` is called (deferred one tick via `setTimeout(..., 0)` so the write is committed before the window loads). Each click opens a **new** tab or window.
5. The opened window navigates to `/votes/{voteSlug}/{proposalId}?preview`.
6. The proposal route’s **load** sees `?preview` and returns `{ vote, pillars, commentCount: 0, preview: true }` **without** fetching the proposal from the API.
7. The **page** (client) calls `readPreviewPayload()` from the helper and checks that `stored.proposalId` matches the URL’s `proposalId` (string comparison). If it matches, it uses `stored.proposal` as the proposal; otherwise it shows "Preview data not found".
8. An orange banner is shown at the top: "You are viewing a preview of your proposal."

### 2. Storage key and shape

| Item | Value |
|------|--------|
| **Key** | `proposal-preview` (single key, shared by all previews) |
| **Value** | `{ proposalId: string \| number, proposal: object }` (JSON). `proposal` is the form payload (e.g. title, summary, status, metaData, etc.). |

### 3. When preview storage is written

**FormControls** (which receives `proposal`, `vote`, `formData`, `getPayload`, `onSave` from the form) updates the key via `writePreviewPayload()` from `$lib/previewProposalStorage.js` in these cases:

| Trigger | Where |
|--------|--------|
| User clicks **"Preview Proposal"** | `onPreviewClick()` in `FormControls.svelte`: calls `writePreviewPayload(proposal._id, getPayload(formData.status))`, then opens the preview tab. |
| Successful **"Save"** (draft, no navigate) or **auto-save** | In the `.then()` of the save promise in `FormControls`: if payload is draft and `proposal?._id`, calls `writePreviewPayload(proposal._id, payload)`. |
| **Debounced form change** | `$effect` in `FormControls.svelte`: whenever form data changes, a timer is set; 800 ms after the last change, the current payload is written. Re-runs on every change and clears the previous timer. Applies to both draft and live proposals (live has no auto-save, so the debounce keeps the preview in sync). |

The debounce delay is `PREVIEW_DEBOUNCE_MS` (800 ms) in FormControls. Any form that uses FormControls and passes `proposal` and `vote` gets preview behaviour without form-specific preview code.

### 4. When preview storage is cleared

| Trigger | Cleared? | Where |
|--------|----------|--------|
| User navigates **from** a preview URL **to** a non-preview URL (e.g. "Back to vote", or any link without `?preview`) in the preview window | Yes | `beforeNavigate` in proposal `+page.svelte` calls `clearPreviewStorage()` from the helper. We use `window.location` to detect preview (not `from.url`), because SvelteKit’s `from` can omit search params (see [sveltejs/kit#10122](https://github.com/sveltejs/kit/issues/10122)). |
| User logs out | Yes | `logout()` in `sessionManager.js` calls `clearPreviewStorage()` from `$lib/previewProposalStorage.js`. |
| User clicks **"Save & Exit"** (draft) and the save succeeds | Yes | `FormControls` calls `clearPreviewStorage()` in the save `.then()` when `exitAfterSave` is true. |
| User clicks **"Submit Proposal"** or **"Re-Submit Proposal"** and the submit succeeds | Yes | `FormControls` calls `clearPreviewStorage()` in the submit `.then()`. |
| User **closes** the preview tab/window | No | Intentionally not cleared. The key remains until overwritten (e.g. next Preview click or debounced write), navigate away from preview, or logout. |
| User clicks Preview again (same or different proposal) | N/A | Key is **overwritten** by the new payload before the window opens |

The key is cleared when: the user navigates away from the preview URL (in a preview tab), on logout, or when the user successfully completes **Save & Exit** or **Submit** / **Re-Submit** in the form. It is **not** cleared when the user simply closes the preview tab.

---

## Reload and Route Change Behaviour

### Reload (F5 / hard refresh) in the preview window

- **Full reload:** The page loads again with `?preview`. The **load** runs (server or client), returns `{ vote, pillars, commentCount: 0, preview: true }`. The client reads from `localStorage`.
- **Outcome:** If the key is still present and `proposalId` matches the URL, the preview renders with whatever is currently in storage. That data is updated when the user clicks **Preview Proposal**, after each successful **Save** (draft) or **auto-save**, and on a **debounce** (800 ms after form changes)—so reloading the preview tab shows the latest state for both draft and live proposals. If the key was cleared (e.g. user navigated away from the preview URL, or logged out, then came back via history), the user sees **"Preview data not found"**. Closing the preview tab does **not** clear the key.

### Opening the preview URL directly (e.g. from history or bookmarked)

- User opens `/votes/{slug}/{id}?preview` without having just clicked Preview (e.g. from history, or a new tab).
- **Outcome:** Same as above: preview works only if `localStorage` still contains a matching `proposal-preview` entry. Otherwise "Preview data not found". No automatic fetch of the real proposal is done when `?preview` is present.

### Route change inside a preview tab

- **To a non-preview URL** (e.g. "Back to vote", or any link without `?preview`): `beforeNavigate` runs while still on the preview page with current URL = preview URL, `to` = non-preview URL. We call `clearPreviewStorage()`. **Key is cleared** so the next preview starts from a fresh write.

### Closing the preview tab

- We do **not** clear the key when the user closes the preview tab. The key remains in `localStorage` until it is overwritten (e.g. by clicking **Preview Proposal** again or by the debounced form write), the user navigates away from the preview URL in that tab before closing, or the user logs out. So after closing the preview tab, preview data may still be present in `localStorage` until one of those actions.

---

## Risk Assessment

### Data in localStorage

| Risk | Level | Notes |
|------|--------|--------|
| **Stale data** | Low | Only one key; each Preview overwrites. Stale data appears only if the user opens an old preview URL (e.g. from history) without clicking Preview again; they then see "Preview data not found" or an old snapshot. |
| **Sensitive data** | Low–medium | The payload is the same as the proposal form (title, summary, metaData, etc.). It may contain personally identifiable or commercial data. It is stored in the **same origin** as the app and is not sent to a third party. Mitigation: cleared on logout and when navigating away from the preview URL; not cleared on tab close. |
| **Shared device / multi-user** | Medium | If the user does not log out, the next person on the same browser can open a preview URL and, if the key is still present and matches, see the previous user’s preview. **Mitigation:** Clear on logout. Recommend users log out on shared devices. |
| **Storage size** | Low | One proposal payload per key; overwritten each time. Unlikely to be large; localStorage limits (e.g. 5–10 MB) are sufficient. |
| **XSS via stored payload** | Low | The stored `proposal` is produced by our form and rendered in our own proposal view. We do not inject raw HTML from the payload. Risk is low as long as we continue to render via components that escape or sanitise. |

### Window and navigation

| Risk | Level | Notes |
|------|--------|--------|
| **Pop-up blocked** | Low | `window.open` from a user click is typically allowed. If blocked, the user stays on the form and no new tab opens; they can retry or allow pop-ups. |

### Summary

- **Risks are low to medium.** Preview data is cleared on navigate away from preview, logout, and Save & Exit / Submit; it is **not** cleared when the user simply closes the preview tab. On shared devices, logout remains important.
- **No server impact:** Preview does not create or update proposals; it only reads vote metadata when loading the preview page.

---

## Implementation reference

| Area | Location |
|------|----------|
| **Shared storage helpers** | `$lib/previewProposalStorage.js`: `PREVIEW_STORAGE_KEY`, `writePreviewPayload(proposalId, proposal)`, `readPreviewPayload()`, `clearPreviewStorage()`. Used by FormControls (write/clear), proposal page (read/clear on navigate), and sessionManager (clear on logout). |
| **Form-side preview logic** | `$lib/components/form/FormControls.svelte`: props `proposal`, `vote` (optional). Derives `previewHref`; `onPreviewClick()` (write + open); write on saveDraft / submitLive / auto-save success; debounced `$effect` (800 ms); `clearPreviewStorage()` on Save & Exit and Submit/Re-Submit success. |
| **Form usage** | Forms (e.g. `$lib/forms/budget2026/Form.svelte`) pass `formData`, `getPayload`, `onSave`, `proposal`, `vote` to FormControls. No preview-specific code in the form. |
| Load when `?preview` | `src/routes/votes/[voteSlug]/[proposalId]/+page.js`: `url.searchParams.has("preview")` → return `{ vote, pillars, commentCount: 0, preview: true }` |
| Read from storage, clear on navigate (not on tab close) | `src/routes/votes/[voteSlug]/[proposalId]/+page.svelte`: imports `readPreviewPayload`, `clearPreviewStorage` from helper; `$effect` reads via `readPreviewPayload()` and matches `proposalId`; `beforeNavigate` calls `clearPreviewStorage()` when leaving preview URL; banner and loading/error UI. |
| Clear on logout | `$stores/sessionManager.js`: imports `clearPreviewStorage` from `$lib/previewProposalStorage.js`; `logout()` calls `clearPreviewStorage()`. |
