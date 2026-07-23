# F-012: CI Can Pass Despite Test Failures

| Field | Value |
|-------|-------|
| **Severity** | High |
| **Finding ID** | F-012 |
| **Category** | CI / release readiness |
| **Status** | Resolved |

## Affected Files

- `.github/workflows/ci.yml`
- `package.json` (`test`, `test:guards`, `test:mailer`)
- `__tests/run-guards.js`

## Observation

The original audit cited backend test-report and frontend Playwright workflows that could pass despite failures (`continue-on-error` / non-failing status recording). Those workflows are no longer present.

## Risk

CI can appear successful while tests fail, which weakens release confidence for open-source publication.

## Recommendation

Add CI that runs backend and frontend tests and fails the job on test failure. Upload reports with `always()` if needed, then fail on aggregated outcomes.

## Current Status

**Resolved.** `.github/workflows/ci.yml` runs on push/PR with no `continue-on-error`: backend `npm test` (security ratchets including mail-transport lazy Google import + mailer `node:test`) and frontend `npm run check` (`svelte-check`) then `npm run build`. Root `npm test` is no longer a placeholder. Live Wraith PoCs and mailer/dev-tests remain out of CI by design. Integration/E2E coverage is future work, not a reopen of F-012. See `docs/audit/resolutions/F-012-resolution.md`.
