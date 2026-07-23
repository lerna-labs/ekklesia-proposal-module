# Medium and Low Findings: F-013 through F-031

Source: *Ekklesia Proposal Module — Open Source Readiness Audit* (2026-06-26, updated 2026-07-08).  
Re-verified against the current working tree on **2026-07-23**. No code changes in this pass.

## Summary

| ID | Severity | Category | Status |
|----|----------|----------|--------|
| F-013 | Medium | COSE validation | **Resolved** |
| F-014 | Medium | External dependency resilience | Open (upstream) |
| F-015 | Medium | API contract / error shape | **Resolved** |
| F-016 | Medium | Comment API correctness | **Resolved** |
| F-017 | Medium | Frontend metadata / SEO | **Resolved** |
| F-018 | Medium | Debug logging | **Resolved** |
| F-019 | Medium | Open-source governance docs | Partially resolved |
| F-020 | Medium | Dependency monitoring | **Resolved** |
| F-021 | Medium | Frontend configuration hygiene | **Resolved** |
| F-022 | Medium | Notification unsubscribe token lifecycle | Open |
| F-023 | Medium | Session lifecycle / logout | Open |
| F-024 | Low | Logging | Open |
| F-025 | Low | Repository formatting | Open |
| F-026 | Low | Graceful shutdown | Open |
| F-027 | Low | Documentation drift | Open |
| F-028 | Low | Frontend UX | Open |
| F-029 | Low | Frontend cleanup | Open |
| F-030 | Low | Frontend lifecycle cleanup | Open |
| F-031 | Low | Frontend maintainability | Open |

**Tally:** 4 resolved · 1 partially resolved · 1 open upstream · 13 open · 0 no longer needed

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
| **Status** | Open (upstream) |

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

**Open (upstream).** Local `helper/koios.js` / `verifyDeposit.js` were removed (`56c1630`; #525). Cardano lookups now go through `@lerna-labs/ekklesia-helpers/cardano`, which adds primary/secondary provider fallback (Koios ↔ Blockfrost) but still uses bare `fetch()` with no `AbortController` timeout or bounded retry in `KoiosProvider` / `BlockfrostProvider`. Availability risk remains for this app via the dependency; fix site is no longer in-tree.

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
- `SECURITY.md` (`ab9f14a`) — vulnerability reporting to `security@intersectmbo.org`
- `CONTRIBUTING.md` (`204fde0`) — stub only (“Template file to be populated”)

Still missing: populated `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, changelog, and GitHub issue/PR templates.

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
| **Status** | Open |

### Affected files

- `routes/api/v0/notifications.js` (PUT handler; verify path)
- `__tests/security/atk-unsubscribe-rotation-timing-guard.js`

### Observation

PUT `/api/v0/notifications` unsets `notification.unsubscribeSecret` when email is cleared, while successful email verification rotates the secret. Preference updates can invalidate unsubscribe links at the wrong lifecycle point.

### Risk

Weakens unsubscribe-link reliability and makes token invalidation semantics inconsistent.

### Recommendation

Do not clear or rotate `unsubscribeSecret` in general notification settings updates. Rotate/initialize only at the intended verification/email-change lifecycle point. Keep the security guard passing.

### Current status (2026-07-23)

Open. PUT still `$unset`s `notification.unsubscribeSecret` when email is cleared (`routes/api/v0/notifications.js:238`). `__tests/security/atk-unsubscribe-rotation-timing-guard.js` still fails for this reason.

---

## F-023: Logout Does Not Revoke JWTs

| Field | Value |
|-------|-------|
| **Severity** | Medium |
| **Category** | Session lifecycle / logout |
| **Status** | Open |

### Affected files

- `routes/api/v0/session.js` (DELETE logout)
- `helper/verifyToken.js`

### Observation

Logout clears the browser cookie only. `verifyToken` still accepts any valid JWT until normal expiry.

### Risk

A stolen or copied token can remain usable after logout until it expires.

### Recommendation

Add JWT revocation, session-version validation, or short-lived access tokens with server-side refresh/session rotation.

### Current status (2026-07-23)

Open. Logout still only `clearCookie("token")`. No revocation, blocklist, or session-version check found in `verifyToken`. (Note: F-001 httpOnly cookie work is separate; logout still does not invalidate already-issued JWTs.)

---

## F-024: Direct `console.*` Logging

| Field | Value |
|-------|-------|
| **Severity** | Low |
| **Category** | Logging |
| **Status** | Open |

### Affected files

- Backend entry, route, and helper files (widespread `console.*`)

### Observation

Direct console calls instead of structured, leveled logging.

### Risk

Production logs can become noisy and hard to filter by level or component.

### Recommendation

Replace with structured logging that supports levels and environment-specific output.

### Current status (2026-07-23)

Open. Direct `console.*` remains widespread (~240 hits outside `node_modules`/`docs`/`logs`). `helper/consoleManager.js` only prefixes console methods; it is not a structured logger.

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

---

## F-026: HTTP Server Not Drained on Shutdown

| Field | Value |
|-------|-------|
| **Severity** | Low |
| **Category** | Graceful shutdown |
| **Status** | Open |

### Affected files

- `helper/dbManager.js` (MongoDB close on SIGINT)
- `server.js`

### Observation

MongoDB close is handled on SIGINT, but the HTTP server is not closed/drained on shutdown.

### Risk

In-flight requests may be dropped during deploys or process restarts.

### Recommendation

Add server-level SIGTERM/SIGINT handling: close the HTTP server, drain connections, then close MongoDB.

### Current status (2026-07-23)

Open. `server.js` still uses `app.listen` without `server.close` / SIGTERM drain. `helper/dbManager.js` still only closes MongoDB on `SIGINT`.

---

## F-027: Proposal Delete Docs Say 204, API Returns 200

| Field | Value |
|-------|-------|
| **Severity** | Low |
| **Category** | Documentation drift |
| **Status** | Open |

### Affected files

- `docs/api-specification.md`
- `docs/proposal-flow.md`
- `routes/api/v0/proposals.js` (delete handler)

### Observation

Docs document proposal delete as `204 No Content`; the route returns `200` JSON.

### Risk

API consumers can implement the wrong success handling for draft deletion.

### Recommendation

Align docs and implementation (document 200 JSON, or change the route to 204 with no body).

### Current status (2026-07-23)

Open. Docs still describe 204; the delete route still returns `200` JSON (`{ status, message: "Proposal deleted" }`).

---

## F-028: Login Redirect Runs in `onMount`

| Field | Value |
|-------|-------|
| **Severity** | Low |
| **Category** | Frontend UX |
| **Status** | Open |

### Affected files

- `__frontend/src/routes/login/+page.svelte`

### Observation

Authenticated users are redirected in `onMount`.

### Risk

Authenticated users can briefly see the login page before redirect.

### Recommendation

Move the redirect into a `load` function or shared route guard.

### Current status (2026-07-23)

Open. Login redirect still runs in `onMount`.

---

## F-029: Leftover Debug Log in Wallet Signer

| Field | Value |
|-------|-------|
| **Severity** | Low |
| **Category** | Frontend cleanup |
| **Status** | Open |

### Affected files

- `__frontend/src/lib/WalletSigner/SignerCS.svelte`

### Observation

Catch block logs leftover debug text (`console.log("this error")`).

### Risk

Unhelpful browser console output; inconsistent with production logging expectations.

### Recommendation

Remove the log or replace with dev-only structured logging.

### Current status (2026-07-23)

Open. `console.log("this error")` is still present.

---

## F-030: Version Polling Starts at Module Scope

| Field | Value |
|-------|-------|
| **Severity** | Low |
| **Category** | Frontend lifecycle cleanup |
| **Status** | Open |

### Affected files

- `__frontend/src/stores/versionStore.js`

### Observation

Polling starts at module scope with no cleanup path.

### Risk

The interval is harder to control in tests or embedded contexts.

### Recommendation

Expose start/stop functions, or move polling into component lifecycle code with cleanup.

### Current status (2026-07-23)

Open. `fetchVersionInfo()` and `setInterval(..., 5 min)` still run at module scope.

---

## F-031: Hardcoded Budget Vote Slug

| Field | Value |
|-------|-------|
| **Severity** | Low |
| **Category** | Frontend maintainability |
| **Status** | Open |

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

Open. Still hardcoded in `Navigation.svelte`, `budget-process/+page.svelte`, and `budget-process/+page.js`. (`Header.svelte` no longer carries it, as previously noted.)

---

## What still needs fixing

Priority backlog from this set (excluding resolved items):

1. **F-014** — Timeouts/retries in `@lerna-labs/ekklesia-helpers` Cardano providers (or wrap here)  
2. **F-019** — Finish governance docs (populate CONTRIBUTING, CoC, changelog, issue/PR templates)  
3. **F-022** — Stop clearing `unsubscribeSecret` on general notification PUT  
4. **F-023** — Add logout-time JWT revocation or session-version checks  
5. **F-024** — Structured logging  
6. **F-025** — Add `.editorconfig`  
7. **F-026** — Graceful HTTP shutdown  
8. **F-027** — Align delete docs vs 200 JSON  
9. **F-028** — Login redirect via load/guard  
10. **F-029** — Remove SignerCS debug log  
11. **F-030** — Version polling lifecycle cleanup  
12. **F-031** — Configurable active vote slug  

Resolved / no further work for this finding: **F-013**, **F-015**, **F-016**, **F-017**, **F-018**, **F-020**, **F-021**.  
Upstream residual: **F-014** (local Koios helper gone; bare-fetch hangs live in `@lerna-labs/ekklesia-helpers`).
