# Open Source Readiness Audit — Findings Index

Source: *Ekklesia Proposal Module — Open Source Readiness Audit* (2026-06-26, updated 2026-07-08).

This index lists every audit finding (**F-001** through **F-031**) with links to the finding write-up and its resolution (or inline status where no separate resolution document exists).

## Summary

| Status | Count |
|--------|------:|
| Resolved | 24 |
| Accepted (by design) | 5 |
| Partially resolved | 1 |
| Open | 0 |
| Open (upstream, partial) | 1 |

Last consolidated re-verify of medium/low findings: **2026-07-23** ([F-013–F-031](medium-low/F-013-through-F-031.md)). F-014 app-side note updated **2026-07-24**. F-025 resolved **2026-09-07** (#494).

---

## Critical

| ID | Title | Status | Finding | Resolution |
|----|-------|--------|---------|------------|
| F-001 | JWTs stored in JavaScript-readable browser storage | Resolved | [Finding](critical/F-001-jwt-browser-storage.md) | [Resolution](resolutions/F-001-resolution.md) |

---

## High

| ID | Title | Status | Finding | Resolution |
|----|-------|--------|---------|------------|
| F-002 | Multisig session auth does not enforce native-script semantics | Accepted (by design) | [Finding](high/F-002-multisig-session-authentication.md) | [Resolution](resolutions/F-002-resolution.md) |
| F-003 | Vote search builds MongoDB regex from raw user input | Resolved | [Finding](high/F-003-vote-search-regex-dos.md) | [Resolution](resolutions/F-003-resolution.md) |
| F-004 | Proposal public field exclusion can fail open | Accepted (by design) | [Finding](high/F-004-proposal-public-field-exclusion.md) | [Resolution](resolutions/F-004-resolution.md) |
| F-005 | Vote slug used as lookup key without unique constraint | Resolved | [Finding](high/F-005-vote-slug-unique-constraint.md) | [Resolution](resolutions/F-005-resolution.md) |
| F-006 | Live proposal versioning is not atomic | Resolved | [Finding](high/F-006-live-proposal-versioning-not-atomic.md) | [Resolution](resolutions/F-006-resolution.md) |
| F-007 | Destructive database wipe script lacks production guard | Resolved (script removed) | [Finding](high/F-007-destructive-database-wipe-script.md) | [Resolution](resolutions/F-007-resolution.md) |
| F-008 | Some frontend routes bypass shared session handling | Accepted (by design) | [Finding](high/F-008-frontend-routes-bypass-session-handling.md) | [Resolution](resolutions/F-008-resolution.md) |
| F-009 | Repository licensing metadata is inconsistent | Resolved | [Finding](high/F-009-repository-licensing-metadata.md) | [Resolution](resolutions/F-009-resolution.md) |
| F-010 | Private package dependency blocks public installation | Resolved | [Finding](high/F-010-private-package-dependency.md) | [Resolution](resolutions/F-010-resolution.md) |
| F-011 | Route loader can hide startup route failures | Resolved | [Finding](high/F-011-route-loader-hides-startup-failures.md) | [Resolution](resolutions/F-011-resolution.md) |
| F-012 | CI can pass despite test failures | Resolved | [Finding](high/F-012-ci-can-pass-despite-test-failures.md) | [Resolution](resolutions/F-012-resolution.md) |

---

## Medium and low

Findings **F-013** through **F-031** are documented in a single consolidated file: [medium-low/F-013-through-F-031.md](medium-low/F-013-through-F-031.md).

| ID | Title | Status | Finding | Resolution |
|----|-------|--------|---------|------------|
| F-013 | COSE validation precedence and error handling | Resolved | [§ F-013](medium-low/F-013-through-F-031.md#f-013-cose-validation-precedence-and-error-handling) | [Inline status](medium-low/F-013-through-F-031.md#f-013-cose-validation-precedence-and-error-handling) |
| F-014 | External dependency resilience (Koios) | Open (upstream, partial) | [§ F-014](medium-low/F-013-through-F-031.md#f-014-external-dependency-resilience-koios) | [Inline status](medium-low/F-013-through-F-031.md#f-014-external-dependency-resilience-koios) |
| F-015 | Inconsistent API error envelope | Resolved | [§ F-015](medium-low/F-013-through-F-031.md#f-015-inconsistent-api-error-envelope) | [Resolution](resolutions/F-015-resolution.md) |
| F-016 | Comment reply-count sorting ignores visibility | Resolved | [§ F-016](medium-low/F-013-through-F-031.md#f-016-comment-reply-count-sorting-ignores-visibility) | [Inline status](medium-low/F-013-through-F-031.md#f-016-comment-reply-count-sorting-ignores-visibility) |
| F-017 | Empty `og:url` in app shell | Resolved | [§ F-017](medium-low/F-013-through-F-031.md#f-017-empty-ogurl-in-app-shell) | [Resolution](resolutions/F-017-resolution.md) |
| F-018 | Autosave debug logging left on | Resolved | [§ F-018](medium-low/F-013-through-F-031.md#f-018-autosave-debug-logging-left-on) | [Inline status](medium-low/F-013-through-F-031.md#f-018-autosave-debug-logging-left-on) |
| F-019 | Missing open-source governance docs | Partially resolved | [§ F-019](medium-low/F-013-through-F-031.md#f-019-missing-open-source-governance-docs) | [Inline status](medium-low/F-013-through-F-031.md#f-019-missing-open-source-governance-docs) |
| F-020 | Dependabot covers only root manifest | Resolved | [§ F-020](medium-low/F-013-through-F-031.md#f-020-dependabot-covers-only-root-manifest) | [Resolution](resolutions/F-020-resolution.md) |
| F-021 | JWT secret in frontend env example | Resolved | [§ F-021](medium-low/F-013-through-F-031.md#f-021-jwt-secret-in-frontend-env-example) | [Inline status](medium-low/F-013-through-F-031.md#f-021-jwt-secret-in-frontend-env-example) |
| F-022 | Notification unsubscribe secret cleared on PUT | Resolved | [§ F-022](medium-low/F-013-through-F-031.md#f-022-notification-unsubscribe-secret-cleared-on-put) | [Resolution](resolutions/F-022-resolution.md) |
| F-023 | Logout does not revoke JWTs | Resolved | [§ F-023](medium-low/F-013-through-F-031.md#f-023-logout-does-not-revoke-jwts) | [Resolution](resolutions/F-023-resolution.md) |
| F-024 | Direct `console.*` logging | Accepted | [§ F-024](medium-low/F-013-through-F-031.md#f-024-direct-console-logging) | [Resolution](resolutions/F-024-resolution.md) |
| F-025 | Missing editor / formatter config | Resolved | [§ F-025](medium-low/F-013-through-F-031.md#f-025-missing-editor--formatter-config) | [Inline status](medium-low/F-013-through-F-031.md#f-025-missing-editor--formatter-config) |
| F-026 | HTTP server not drained on shutdown | Resolved | [§ F-026](medium-low/F-013-through-F-031.md#f-026-http-server-not-drained-on-shutdown) | [Resolution](resolutions/F-026-resolution.md) |
| F-027 | Proposal delete docs say 204, API returns 200 | Resolved | [§ F-027](medium-low/F-013-through-F-031.md#f-027-proposal-delete-docs-say-204-api-returns-200) | [Resolution](resolutions/F-027-resolution.md) |
| F-028 | Login redirect runs in `onMount` | Resolved | [§ F-028](medium-low/F-013-through-F-031.md#f-028-login-redirect-runs-in-onmount) | [Resolution](resolutions/F-028-resolution.md) |
| F-029 | Leftover debug log in wallet signer | Resolved | [§ F-029](medium-low/F-013-through-F-031.md#f-029-leftover-debug-log-in-wallet-signer) | [Resolution](resolutions/F-029-resolution.md) |
| F-030 | Version polling starts at module scope | Resolved | [§ F-030](medium-low/F-013-through-F-031.md#f-030-version-polling-starts-at-module-scope) | [Resolution](resolutions/F-030-resolution.md) |
| F-031 | Hardcoded budget vote slug | Accepted (by design) | [§ F-031](medium-low/F-013-through-F-031.md#f-031-hardcoded-budget-vote-slug) | [Resolution](resolutions/F-031-resolution.md) |

---

## Open backlog

From [F-013–F-031 § What still needs fixing](medium-low/F-013-through-F-031.md#what-still-needs-fixing):

1. **F-014** — Upstream `AbortController` timeouts on Koios/Blockfrost providers (app-side treasury-verify outage→503 mapping is done).
2. **F-019** — Remaining governance docs (CoC, changelog, issue/PR templates); deferred to Intersect GitHub move.

---

## Directory layout

```
docs/audit/
├── README.md                 ← this index
├── critical/                 ← F-001
├── high/                     ← F-002 … F-012
├── medium-low/               ← F-013 … F-031 (consolidated)
└── resolutions/              ← per-finding resolution notes (where written)
```

**Inline status** links point to the finding section in the consolidated medium/low document (includes *Current status* under each heading). Separate resolution files exist where remediation was tracked in a dedicated note.
