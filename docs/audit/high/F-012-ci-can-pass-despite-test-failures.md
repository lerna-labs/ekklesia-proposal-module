# F-012: CI Can Pass Despite Test Failures

| Field | Value |
|-------|-------|
| **Severity** | High |
| **Finding ID** | F-012 |
| **Category** | CI / release readiness |
| **Status** | Not proven |

## Affected Files

- `.github/workflows/generate-test-reports.yml:66-82` (original)
- `.github/workflows/playwright.yml:113-119` (original)

## Observation

The backend test-report workflow records failed command status but does not fail the job. The frontend Playwright step uses `continue-on-error: true`.

## Risk

CI can appear successful while tests fail, which weakens release confidence for open-source publication.

## Recommendation

Upload reports with `always()`, then add a final step that fails the workflow if the backend test status or Playwright outcome failed.

## Current Status

Not proven. The previously cited `continue-on-error` workflows are no longer present, so the original CI failure pattern was not reproduced. However, no replacement test CI workflow was found that proves backend, frontend, or testkit failures fail CI. CI release confidence therefore remains unresolved.
