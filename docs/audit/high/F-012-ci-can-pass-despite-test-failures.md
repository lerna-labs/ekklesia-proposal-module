# F-012: CI Can Pass Despite Test Failures

| Field | Value |
|-------|-------|
| **Severity** | High |
| **Finding ID** | F-012 |
| **Category** | CI / release readiness |
| **Status** | Not resolved |

## Affected Files

- `.github/workflows/` (none for tests currently)
- Root `package.json` `test` script

## Observation

The original audit cited backend test-report and frontend Playwright workflows that could pass despite failures (`continue-on-error` / non-failing status recording). Those workflows are no longer present.

## Risk

CI can appear successful while tests fail, which weakens release confidence for open-source publication.

## Recommendation

Add CI that runs backend and frontend tests and fails the job on test failure. Upload reports with `always()` if needed, then fail on aggregated outcomes.

## Current Status

**Not resolved.** Cited workflows are gone; only Dependabot (and CODEOWNERS) remain under `.github/`. No replacement workflow runs backend/frontend tests and fails on failure. Root `npm test` remains a placeholder. See `docs/audit/resolutions/F-012-resolution.md`.
