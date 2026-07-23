# Medium and Low Findings: F-013 through F-031

Source: *Ekklesia Proposal Module — Open Source Readiness Audit* (2026-06-26, updated 2026-07-08).  
Re-verified against the current working tree on **2026-07-23**. No code changes in this pass.

## Summary

| ID | Severity | Category | Status |
|----|----------|----------|--------|
| F-013 | Medium | COSE validation | **Resolved** |
| F-014 | Medium | External dependency resilience | Open (upstream, partial) |
| F-015 | Medium | API contract / error shape | **Resolved** |
| F-016 | Medium | Comment API correctness | **Resolved** |
| F-017 | Medium | Frontend metadata / SEO | **Resolved** |
| F-018 | Medium | Debug logging | **Resolved** |
| F-019 | Medium | Open-source governance docs | Partially resolved |
| F-020 | Medium | Dependency monitoring | **Resolved** |
| F-021 | Medium | Frontend configuration hygiene | **Resolved** |
| F-022 | Medium | Notification unsubscribe token lifecycle | **Resolved** |
| F-023 | Medium | Session lifecycle / logout | **Resolved** |
| F-024 | Low | Logging | Accepted |
| F-025 | Low | Repository formatting | Open |
| F-026 | Low | Graceful shutdown | **Resolved** |
| F-027 | Low | Documentation drift | **Resolved** |
| F-028 | Low | Frontend UX | **Resolved** |
| F-029 | Low | Frontend cleanup | **Resolved** |
| F-030 | Low | Frontend lifecycle cleanup | **Resolved** |
| F-031 | Low | Frontend maintainability | Accepted (by design) |

**Tally:** 14 resolved · 1 partially resolved · 1 open upstream · 1 open · 2 accepted

---

## F-013: COSE Validation Precedence and Error Handling

| Field | Value |
|-------|-------|
| **Severity** | Medium |
| **Category** | COSE validation |
| **Status** | **Resolved** |

### Affected files

- ~~`helper/verifySignature.js`~~ (removed)
- Now: `@lerna-labs/ekklesia-helpers/crypto` (`verifySignature`)

### Observation

Operator-precedence bug (`!cose_key_structure instanceof Map`) and inconsistent validator error handling (throwing `error.message` vs returning `{ error: "..." }`).

### Risk

Malformed COSE input may not be validated predictably; error paths can lose the real failure reason.

### Recommendation

Fix the precedence check and normalize validator return/throw behavior.

### Current status (2026-07-23)

**Resolved.** Local `helper/verifySignature.js` was removed (`56c1630`, `3f4653e`; issue #523). Session auth imports `verifySignature` from `@lerna-labs/ekklesia-helpers/crypto`. In helpers `1.1.1`, the COSE key check is correctly parenthesized as `!(cose_key_structure instanceof Map)`, and validator `{ error }` results are rethrown as `Error` before higher-level `{ error }` returns. `__tests/security/atk-no-local-koios-helpers-guard.js` ratchets that the local helper file stays deleted.

---

## F-014: External Dependency Resilience (Koios)

| Field | Value |
|-------|-------|
| **Severity** | Medium |
| **Category** | External dependency resilience |
| **Status** | Open (upstream, partial) |

### Affected files

- ~~`helper/koios.js`~~ (removed)
- Now: `@lerna-labs/ekklesia-helpers` (`dist/cardano/koiosProvider.js`, `blockfrostProvider.js`, `cardanoApi.js`)
- Call sites in this repo: `routes/api/v0/session.js`, `routes/api/v0/proposals.js` (via helpers cardano/crypto APIs)

### Observation

External service calls use bare `fetch()` without timeouts or bounded retries.

### Risk

Slow external APIs can hold backend requests open and degrade availability.

### Recommendation

Add `AbortController` timeouts, explicit timeout handling, and bounded retry or caching behavior (in the shared helpers package, or wrap call sites here if helpers cannot change soon).

### Current status (2026-07-23)

**Open (upstream, partial).** This app depends on `@lerna-labs/ekklesia-helpers@^2.0.0`. Helpers `2.0.0` improves provider error taxonomy (`ProviderError` / auth / rate-limit with `retryAfterSeconds`) and keeps primary/secondary Koios↔Blockfrost fallback. It still does **not** put `AbortController` timeouts on `KoiosProvider` / `BlockfrostProvider` `get`/`post` (those remain bare `fetch()`). A 3s `AbortController` exists only for pool-metadata recovery in `cardanoApi.js`. Availability risk from hung provider calls remains; fix site is still upstream helpers.

---

## F-015: Inconsistent API Error Envelope

| Field | Value |
|-------|-------|
| **Severity** | Medium |
| **Category** | API contract / error shape |
| **Status** | **Resolved** |

### Affected files

- `server.js` (global 404 / URI / error handlers)
- API routes under `routes/api/v0/` (typically `{ status, message }`)

### Observation (original)

`server.js` emits `{ error }`, while most API routes emit `{ status, message }`.

### Risk

API consumers and frontend code must handle inconsistent error envelopes.

### Recommendation

Standardize on one response shape and enforce it in tests/docs.

### Current status (2026-07-23)

**Resolved.** Global 404 / URI / general error handlers in `server.js` now return `{ status: "error", message }` to match routes and API spec §7.1. See `docs/audit/resolutions/F-015-resolution.md`.

---

## F-016: Comment Reply-Count Sorting Ignores Visibility

| Field | Value |
|-------|-------|
| **Severity** | Medium |
| **Category** | Comment API correctness |
| **Status** | **Resolved** |

### Affected files

- `routes/api/v0/comments.js`

### Observation (original)

Reply counts used for sorting did not apply the same visibility rules as the public response.

### Risk

Public reply-count sorting could include replies that are not visible in the public response.

### Recommendation

Apply the same status and visibility filters inside the aggregation used for sorting.

### Current status (2026-07-23)

**Resolved.** `getVisibleReplyStatusMatch` / `replyVisibilityMatch` is applied in `$graphLookup.restrictSearchWithMatch` before reply counts are calculated. Matches the audit’s fixed status; no further action required for this finding.

---

## F-017: Empty `og:url` in App Shell

| Field | Value |
|-------|-------|
| **Severity** | Medium |
| **Category** | Frontend metadata / SEO |
| **Status** | **Resolved** |

### Affected files

- `__frontend/src/app.html`
- `__frontend/vite.config.js` (build-time inject)

### Observation (original)

Shell template has an empty `og:url` value.

### Risk

Shared links can produce incomplete or incorrect preview metadata when the shell tags are used.

### Recommendation

Populate `og:url` from the public site URL, or remove the tag until the deployment URL is known.

### Current status (2026-07-23)

**Resolved.** Shell `og:url`, `og:image`, and `twitter:image` are injected at Vite build/dev from `VITE_SITE_URL` (or omitted if unset). See `docs/audit/resolutions/F-017-resolution.md`.

---

## F-018: Autosave Debug Logging Left On

| Field | Value |
|-------|-------|
| **Severity** | Medium |
| **Category** | Debug logging |
| **Status** | **Resolved** |

### Affected files

- `__frontend/src/lib/components/form/FormControls.svelte`

### Observation (original)

Autosave debug logging was hardcoded on.

### Risk

Browser console noise and unnecessary implementation detail in production.

### Recommendation

Gate behind `import.meta.env.DEV` or an explicit debug flag that defaults off.

### Current status (2026-07-23)

**Resolved.** `DEBUG_AUTOSAVE = false` with gated `autosaveLog`. Matches the audit’s fixed status; no further action required for this finding.

---

## F-019: Missing Open-Source Governance Docs

| Field | Value |
|-------|-------|
| **Severity** | Medium |
| **Category** | Open-source governance docs |
| **Status** | Partially resolved |

### Affected files / expected artifacts

- Root: `CONTRIBUTING.md`, `SECURITY.md`, `CODE_OF_CONDUCT.md`, changelog
- `.github/CODEOWNERS`, issue templates, PR template

### Observation

Contributors lack clear contribution, ownership, security disclosure, and release-history guidance.

### Recommendation

Add standard governance files aligned with Intersect open-source expectations.

### Current status (2026-07-23)

**Partially resolved.** Present since last re-verify:

- `.github/CODEOWNERS` (`* @Crypto2099 @MadOrkestra`)
- `SECURITY.md` — vulnerability reporting to `security@intersectmbo.org`
- `CONTRIBUTING.md` — populated with setup, docs pointer, and PR guidance (no longer a stub)

Still missing: `CODE_OF_CONDUCT.md`, changelog, and GitHub issue/PR templates.

**Note:** This repository is planned to move to the Intersect GitHub organization. Remaining governance docs (and related org templates/policies) are expected to be handled as part of that move rather than fully completed in the current private/client-owned tree.

---

## F-020: Dependabot Covers Only Root Manifest

| Field | Value |
|-------|-------|
| **Severity** | Medium |
| **Category** | Dependency monitoring |
| **Status** | **Resolved** |

### Affected files

- `.github/dependabot.yml`
- `__frontend/package.json` (separate npm workspace)

### Observation (original)

Dependabot monitors only `/`. Separate package manifests can miss updates/security alerts.

### Recommendation

Add Dependabot npm entries for all remaining package manifests (originally `/__frontend` and `/__testkit`).

### Current status (2026-07-23)

**Resolved.** Dependabot now covers `/` and `/__frontend`. `__testkit` is gone from the repo, so no entry for it. See `docs/audit/resolutions/F-020-resolution.md`.

---

## F-021: JWT Secret in Frontend Env Example

| Field | Value |
|-------|-------|
| **Severity** | Medium |
| **Category** | Frontend configuration hygiene |
| **Status** | **Resolved** |

### Affected files

- `__frontend/.env.example`

### Observation (original)

Frontend env example included `JWT_SECRET`.

### Risk

Contributors may copy backend secrets into frontend env files or misunderstand client config boundaries.

### Recommendation

Remove `JWT_SECRET` from frontend env examples; document it only in backend/test env docs.

### Current status (2026-07-23)

**Resolved.** `__frontend/.env.example` contains only `VITE_*` variables. Matches the audit’s fixed status; no further action required for this finding.

---

## F-022: Notification Unsubscribe Secret Cleared on PUT

| Field | Value |
|-------|-------|
| **Severity** | Medium |
| **Category** | Notification unsubscribe token lifecycle |
| **Status** | **Resolved** |

### Affected files

- `routes/api/v0/notifications.js` (PUT handler; verify path)
- `__tests/security/atk-unsubscribe-rotation-timing-guard.js`

### Observation (original)

PUT `/api/v0/notifications` unsets `notification.unsubscribeSecret` when email is cleared, while successful email verification rotates the secret. Preference updates can invalidate unsubscribe links at the wrong lifecycle point.

### Risk

Weakens unsubscribe-link reliability and makes token invalidation semantics inconsistent.

### Recommendation

Do not clear or rotate `unsubscribeSecret` in general notification settings updates. Rotate/initialize only at the intended verification/email-change lifecycle point. Keep the security guard passing.

### Current status (2026-07-23)

**Resolved.** PUT no longer `$unset`s `notification.unsubscribeSecret` when email is cleared; rotation remains only on successful verify. `atk-unsubscribe-rotation-timing-guard.js` passes. See `docs/audit/resolutions/F-022-resolution.md`.

---

## F-023: Logout Does Not Revoke JWTs

| Field | Value |
|-------|-------|
| **Severity** | Medium |
| **Category** | Session lifecycle / logout |
| **Status** | **Resolved** |

### Affected files

- `routes/api/v0/session.js` (DELETE logout)
- `helper/verifyToken.js`
- `schema/User.js` (`sessionVersion`)

### Observation (original)

Logout clears the browser cookie only. `verifyToken` still accepts any valid JWT until normal expiry.

### Risk

A stolen or copied token can remain usable after logout until it expires.

### Recommendation

Add JWT revocation, session-version validation, or short-lived access tokens with server-side refresh/session rotation.

### Current status (2026-07-23)

**Resolved.** `User.sessionVersion` is embedded in JWTs as `sv`; logout `$inc`s it; `verifyToken` rejects mismatched or missing `sv`. See `docs/audit/resolutions/F-023-resolution.md`.

---

## F-024: Direct `console.*` Logging

| Field | Value |
|-------|-------|
| **Severity** | Low |
| **Category** | Logging |
| **Status** | Accepted |

### Affected files

- Backend entry, route, and helper files (widespread `console.*`)

### Observation

Direct console calls instead of structured, leveled logging.

### Risk

Production logs can become noisy and hard to filter by level or component.

### Recommendation

Replace with structured logging that supports levels and environment-specific output.

### Current status (2026-07-23)

**Accepted — not resolved.** Direct `console.*` (via `helper/consoleManager.js` prefixing) is accepted as-is; no structured logging migration planned. See `docs/audit/resolutions/F-024-resolution.md`.

---

## F-025: Missing Editor / Formatter Config

| Field | Value |
|-------|-------|
| **Severity** | Low |
| **Category** | Repository formatting |
| **Status** | Open |

### Affected files

- Expected: `.editorconfig` and/or `.prettierrc` (or equivalent) at repo root

### Observation

No editorconfig or prettier config found at repository root.

### Risk

Contributors using different editors may produce inconsistent indentation or line endings.

### Recommendation

Add `.editorconfig` with the repository’s indentation, charset, and line-ending expectations.

### Current status (2026-07-23)

Open. No `.editorconfig` or `.prettierrc*` present at repo root or under `__frontend`.

**Note:** This repository is planned to move to the Intersect GitHub organization. Client-specific editor / formatter settings should be aligned with Intersect org conventions as part of that move rather than inventing a one-off config in the current tree.

---

## F-026: HTTP Server Not Drained on Shutdown

| Field | Value |
|-------|-------|
| **Severity** | Low |
| **Category** | Graceful shutdown |
| **Status** | **Resolved** |

### Affected files

- `helper/dbManager.js` (MongoDB close on SIGINT)
- `server.js`

### Observation (original)

MongoDB close is handled on SIGINT, but the HTTP server is not closed/drained on shutdown.

### Risk

In-flight requests may be dropped during deploys or process restarts.

### Recommendation

Add server-level SIGTERM/SIGINT handling: close the HTTP server, drain connections, then close MongoDB.

### Current status (2026-07-23)

**Resolved.** `server.js` drains via `server.close` on SIGTERM/SIGINT, then `disconnectFromDatabase()`. The dbManager SIGINT-only exit handler was removed. See `docs/audit/resolutions/F-026-resolution.md`.
---

## F-027: Proposal Delete Docs Say 204, API Returns 200

| Field | Value |
|-------|-------|
| **Severity** | Low |
| **Category** | Documentation drift |
| **Status** | **Resolved** |

### Affected files

- `docs/api-specification.md`
- `docs/proposal-flow.md`
- `routes/api/v0/proposals.js` (delete handler)

### Observation (original)

Docs document proposal delete as `204 No Content`; the route returns `200` JSON.

### Risk

API consumers can implement the wrong success handling for draft deletion.

### Recommendation

Align docs and implementation (document 200 JSON, or change the route to 204 with no body).

### Current status (2026-07-23)

**Resolved.** Docs updated to match the route: `200 OK` with `{ status: "success", message: "Proposal deleted" }`. Implementation unchanged. See `docs/audit/resolutions/F-027-resolution.md`.

---

## F-028: Login Redirect Runs in `onMount`

| Field | Value |
|-------|-------|
| **Severity** | Low |
| **Category** | Frontend UX |
| **Status** | **Resolved** |

### Affected files

- `__frontend/src/routes/login/+page.svelte`
- `__frontend/src/routes/login/+page.js`

### Observation (original)

Authenticated users are redirected in `onMount`.

### Risk

Authenticated users can briefly see the login page before redirect.

### Recommendation

Move the redirect into a `load` function or shared route guard.

### Current status (2026-07-23)

**Resolved.** Redirect and `showLogin` open moved to `login/+page.js` `load` (after `parent()`). See `docs/audit/resolutions/F-028-resolution.md`.

---

## F-029: Leftover Debug Log in Wallet Signer

| Field | Value |
|-------|-------|
| **Severity** | Low |
| **Category** | Frontend cleanup |
| **Status** | **Resolved** |

### Affected files

- `__frontend/src/lib/WalletSigner/SignerCS.svelte`

### Observation (original)

Catch block logs leftover debug text (`console.log("this error")`).

### Risk

Unhelpful browser console output; inconsistent with production logging expectations.

### Recommendation

Remove the log or replace with dev-only structured logging.

### Current status (2026-07-23)

**Resolved.** `SignerCS.svelte` has no leftover `console.log("this error")`; catch paths use `toast.error` only. See `docs/audit/resolutions/F-029-resolution.md`.

---

## F-030: Version Polling Starts at Module Scope

| Field | Value |
|-------|-------|
| **Severity** | Low |
| **Category** | Frontend lifecycle cleanup |
| **Status** | **Resolved** |

### Affected files

- `__frontend/src/stores/versionStore.js`
- `__frontend/src/lib/base/VersionCheck.svelte`

### Observation (original)

Polling starts at module scope with no cleanup path.

### Risk

The interval is harder to control in tests or embedded contexts.

### Recommendation

Expose start/stop functions, or move polling into component lifecycle code with cleanup.

### Current status (2026-07-23)

**Resolved.** `startVersionPolling` / `stopVersionPolling` in `versionStore.js`; `VersionCheck.svelte` starts on mount and clears on destroy. See `docs/audit/resolutions/F-030-resolution.md`.

---

## F-031: Hardcoded Budget Vote Slug

| Field | Value |
|-------|-------|
| **Severity** | Low |
| **Category** | Frontend maintainability |
| **Status** | Accepted (by design) |

### Affected files

- `__frontend/src/lib/base/Navigation.svelte`
- `__frontend/src/routes/budget-process/+page.svelte`
- `__frontend/src/routes/budget-process/+page.js` (also hardcodes the slug for the vote fetch)

### Observation

Active vote slug `/votes/cardano-budget-2026` is hardcoded in navigation and budget-process UI.

### Risk

Changing the active vote slug requires code edits and can break navigation.

### Recommendation

Derive the active vote slug from configuration or API data.

### Current status (2026-07-23)

**Accepted (by design) — not resolved.** Hardcoded budget vote routes/slug are intentional per client request. No configurable slug work planned. See `docs/audit/resolutions/F-031-resolution.md`.

---

## What still needs fixing

Priority backlog from this set (excluding resolved / accepted items):

1. **F-014** — Provider `AbortController` timeouts (and bounded retries) still missing in `@lerna-labs/ekklesia-helpers` `KoiosProvider`/`BlockfrostProvider` despite 2.0.0 error/fallback improvements  
2. **F-019** — Finish remaining governance docs (CoC, changelog, issue/PR templates); CONTRIBUTING/SECURITY/CODEOWNERS present — deferred to Intersect GitHub move  
3. **F-025** — Add `.editorconfig` — deferred to Intersect GitHub move (client/org editor settings)  

Resolved / no further work for this finding: **F-013**, **F-015**, **F-016**, **F-017**, **F-018**, **F-020**, **F-021**, **F-022**, **F-023**, **F-026**, **F-027**, **F-028**, **F-029**, **F-030**.  
Accepted (not fixed): **F-024**, **F-031**.  
Upstream residual: **F-014** (helpers `2.0.0`: better errors/fallback; Koios/Blockfrost fetches still lack timeouts).
