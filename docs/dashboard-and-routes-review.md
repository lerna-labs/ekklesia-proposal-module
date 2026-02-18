# Dashboard and routes — review

This document reviews the **private dashboard** and **create/edit proposal** routes added for the budget module. It identifies **errors**, **downfalls**, and **improvements**. Implementation references: `(private)/+layout.js`, `(private)/dashboard/+page.js`, `(private)/dashboard/+page.svelte`, `(private)/dashboard/new/*`, `(private)/dashboard/[proposalId]/edit/*`, and `$stores/sessionManager.js`.

---

## 1. Overview

| Area | What exists |
|------|-------------|
| **Auth** | `(private)/+layout.js` loads `/session`; redirects to `/` if no `userId`. All routes under `(private)` require an authenticated session. |
| **Dashboard list** | `GET /proposals?proposer={userId}` with pagination, sort (title, status, date, amount), direction (asc/desc). Budget titles/slugs resolved per unique `budgetId`. Table: Budget, Title, Status; "Edit" link; "New proposal" button. |
| **Create** | `/dashboard/new`: budget selector (from `GET /budgets`); when `?budget=<id>` set, loads budget + categories and renders `Form.svelte` with `onSave` → `POST /proposals` with `budgetId`, then redirect to `/dashboard`. |
| **Edit** | `/dashboard/[proposalId]/edit`: loads proposal, budget, categories; renders `Form.svelte` with `proposal` and `onSave` → `PUT /proposals/:id`, then redirect to `/dashboard`. |

---

## 2. Errors (bugs / build / runtime)

### 2.1 Select.Value not exported (build failure) — **FIXED**

- **Where:** `(private)/dashboard/+page.svelte` (sort dropdown), `(private)/dashboard/new/+page.svelte` (budget dropdown).
- **Issue:** Both use `Select.Value` (e.g. `<Select.Value placeholder="Sort by" />`), but `$lib/components/ui/select/index.js` does **not** export `Value`. The build fails with: *"Value" is not exported by "src/lib/components/ui/select/index.js"*.
- **Fix applied:** Replaced `Select.Value` with inline content: dashboard sort uses a `<span>` showing the current sort label from `SORT_OPTIONS` (or "Sort by"); new proposal budget selector uses a `<span>` with "Select budget...".

### 2.2 API error response body may not be JSON — **FIXED**

- **Where:** `sessionManager.js`, `api.fetch` — when `!response.ok` it did `const errorData = await response.json();`.
- **Issue:** If the API returns 4xx/5xx with a non-JSON body (e.g. HTML or plain text), `response.json()` throws and the catch block turns it into a generic 500, losing the original status code and message.
- **Fix applied:** Read the body once with `response.text()`, then try `JSON.parse(text)` to get `message`; on parse failure use the raw text as the message. Always throw with the original `response.status` and the derived message.

### 2.3 Save (create/edit) errors not shown to the user — **FIXED**

- **Where:** `dashboard/new/+page.svelte` `onSave`, `dashboard/[proposalId]/edit/+page.svelte` `onSave`.
- **Issue:** On `POST` or `PUT` failure, `api.fetch` throws (e.g. 400 validation, 403, 404). The form only set `saving = false` in `finally` and did not catch. The user saw the generic SvelteKit error page instead of an inline message.
- **Fix applied:** Both pages now catch errors in `onSave`, set a `saveError` state from the thrown error's message (supporting both string and object body), and render it above the form with `text-destructive` and `role="alert"`. The user stays on the page and can correct and retry.

### 2.4 New proposal: no feedback when no budget is selected and user tries to save — **FIXED**

- **Where:** `Form.svelte` is only rendered when `budget` is set; `onSave` in new/+page.svelte had `if (!budget?._id) return;` with no feedback.
- **Issue:** If `budget` were somehow cleared or undefined when the form is visible, `onSave` would no-op silently.
- **Fix applied:** At the start of `onSave`, if `!budget?._id` we set `saveError = "Please select a budget first."` and return, so the same inline error area used for API errors shows this message.

---

## 3. Downfalls (design / UX / robustness)

### 3.1 Dashboard list: sequential budget fetches — **FIXED**

- **Where:** `dashboard/+page.js` — for each unique `budgetId` in the list, it did a separate `GET /budgets/{budgetId}` in a `for` loop.
- **Issue:** With many proposals across many budgets, this caused N sequential requests and slower load.
- **Fix applied:** After loading proposals, unique budget IDs are collected and all budget fetches are run in parallel via `Promise.all(budgetIds.map(...))`. Results are then merged into `budgetTitles` and `budgetSlugs`; failed fetches fall back to using the budget ID as the title.

### 3.2 Proposer filter uses session userId as-is

- **Where:** `dashboard/+page.js`: `proposer=${encodeURIComponent(userId)}` from `sessionData.userId`.
- **Issue:** API spec says `proposer` is "valid User ObjectId"; some implementations use bech32 (e.g. `stake1ux...`) for `proposerId`. If the session returns bech32 and the API expects ObjectId (or vice versa), the list can be empty or wrong.
- **Improvement:** Align with the API contract: ensure the session endpoint returns the same identifier format the API expects for `proposer`, and document it (e.g. in api-specification.md or this doc).

### 3.3 Edit route: no explicit ownership check in UI — **FIXED**

- **Where:** `dashboard/[proposalId]/edit/+page.js` loads the proposal by ID; the API previously returned 404 if the user was not the proposer (or not allowed to see the proposal).
- **Issue:** Relying only on 404 was confusing: the user saw a generic "Proposal not found" instead of a permission-specific message.
- **Fix applied:** **Backend** (`routes/api/v0/proposals.js`): when the proposal exists but the requester is not the proposer and not a budget admin (for draft), the API now returns **403** with message "You do not have permission to view or edit this proposal."; **404** is used only when the proposal document does not exist. **Frontend** (`dashboard/[proposalId]/edit/+page.js`): the load wraps the proposal fetch in try/catch; on 403 it shows the API message or "You don't have permission to edit this proposal."; on 404 it shows the API message or "Proposal not found or you don't have access to edit it."

### 3.4 Pagination and sort state only in URL

- **Where:** Dashboard uses `page`, `sort`, `direction` in the URL and `goto()` to update them.
- **Issue:** Good for shareability and back/forward; no major downfall. Only caveat: if the user expects "sort" to mean something the API doesn’t support (e.g. "amount" when the API sorts by something else), the list may not match expectations.
- **Improvement:** Document which sort keys the API supports and map the UI labels to those (e.g. in api-specification.md or dashboard docs). If "amount" is not implemented, either remove it from the UI or add the API support.

### 3.5 No loading / skeleton state for dashboard table

- **Where:** Dashboard list: data is loaded in `load()`; until then the page may show empty or stale layout.
- **Issue:** On slow networks the table can appear empty briefly, then pop in.
- **Improvement:** Use SvelteKit’s loading state (e.g. `+loading.svelte`) or a skeleton in the table area so the user sees that content is loading.

### 3.6 Create flow: budget selection not persisted in URL on first paint

- **Where:** `/dashboard/new` without `?budget=` shows the budget selector; choosing a budget does `goto(\`/dashboard/new?budget=${v}\`)` so the URL updates.
- **Issue:** Minor: if the user refreshes after selecting a budget, the URL has `?budget=...` and the budget is re-loaded; that’s correct. No critical flaw.
- **Improvement:** Optional: pre-fill the selector with the current `?budget=` value so the selected budget is visible before the form loads (already the case if `budget` is derived from the loaded budget).

### 3.7 Session check uses a different API than authenticated requests

- **Where:** Layout uses `fetch(\`${API_URL}/session\`, { credentials: 'include' })` directly; dashboard and form use `api.fetch()` from sessionManager (which adds JWT from cookie/localStorage and `credentials: 'include'`).
- **Issue:** If the app uses cookie-based session only (no JWT in header), layout and api.fetch might disagree on what "logged in" means. If session is JWT-based, layout does not send the JWT to `/session` (only credentials).
- **Improvement:** Use the same mechanism for the session check and for API calls (e.g. call `/session` via `api.fetch` if it accepts the same auth, or ensure `/session` works with cookies only and that all other endpoints use the same auth method).

---

## 4. Improvements (features, consistency, docs)

### 4.1 Error boundaries and user-facing messages

- Add explicit error handling in create/edit pages: catch errors from `onSave`, set a page-level error message, and show it in the UI (e.g. above the form). For 400, show validation messages when the API returns them.
- Consider a small toast or banner component for success ("Proposal saved", "Proposal submitted") so the user gets clear feedback after redirect or after save.

### 4.2 Dashboard: link to proposal view

- The table already links the title to the proposal view when `proposalHref(proposal)` returns a path (using budget slug). If the budget has no slug, the link is not shown. Ensure budgets expose `slug` where expected, or fall back to a slug-less route (e.g. `/proposals/{id}`) if the app supports it.

### 4.3 Edit: prevent double submit

- The form’s "Save Draft" and "Submit" can be clicked multiple times. The parent pages set `saving = true` but the form itself does not disable buttons. Consider disabling the primary actions while `saving` is true (e.g. pass `saving` into the form or disable buttons in the parent when `saving`).

### 4.4 Accessibility and semantics

- Dashboard table: ensure sort direction is announced (e.g. `aria-sort` on the sorted column header, or aria-label on the sort toggle that includes current direction).
- Ensure "Edit" and "New proposal" are clearly labeled (e.g. "Edit proposal" in the link text or aria-label) for screen readers.

### 4.5 Tests and maintenance

- Add a few route tests (e.g. dashboard load with mocked session and API, new proposal with budget selected, edit proposal load) to avoid regressions when changing layout or API usage.
- Document the expected session shape (e.g. `{ userId, ... }`) and the fact that `(private)` layout redirects to `/` when `userId` is missing, so future changes to the session API are done consistently.

### 4.6 API alignment

- Confirm with the API that `GET /proposals` supports the same `sort` values the UI sends (`title`, `status`, `date`, `amount`) and that `date` maps to `createdAt` or `updatedAt` as intended. Align parameter names and behavior in api-specification.md if they differ.

---

## 5. Summary table

| Category   | Item | Severity | Action |
|------------|------|----------|--------|
| Error      | Select.Value not exported | High (build fails) | **Fixed:** Replaced with inline label/placeholder |
| Error      | api.fetch assumes JSON error body | Medium | **Fixed:** response.text() then safe JSON parse |
| Error      | Create/edit save errors not shown | Medium | **Fixed:** saveError state + inline message |
| Downfall   | Sequential budget fetches | Medium | **Fixed:** Promise.all for budget fetches |
| Downfall   | Proposer ID format (ObjectId vs bech32) | Medium | Align session and API contract |
| Downfall   | Edit 404 message not user-friendly | Low | **Fixed:** Backend 403 for no-permission; frontend friendly messages |
| Downfall   | No loading state for dashboard | Low | Add +loading or skeleton |
| Improvement| Success feedback after save | Low | Toast or banner on success |
| Improvement| Disable submit while saving | Low | Pass saving to form or disable in parent |
| Improvement| Sort/API alignment and docs | Low | Document sort params and session shape |

---

## 6. Related docs

- [proposal-flow.md](proposal-flow.md) — Draft vs live, save vs submit.
- [api-specification.md](api-specification.md) — `GET /proposals`, `POST /proposals`, `PUT /proposals/{id}`, session and auth.
- [proposal-schema-description.md](proposal-schema-description.md) — Proposal fields and metaData.
