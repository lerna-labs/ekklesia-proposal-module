# F-012 Resolution

**Status:** Resolved

**Commits:** Pending (landed with this change)

**How:**
- Replaced root `npm test` placeholder with `test:guards` (`__tests/run-guards.js`: `*-guard.js` + `atk-route-loader-isolation.js`, including mail-transport lazy Google import) and `test:mailer` (`node --test mailer/tests/*.test.js`).
- Added `.github/workflows/ci.yml` with parallel `backend` (`npm ci` → `npm test`) and `frontend` (`npm ci` → `npm run check` → `npm run build`) jobs on Node 22. No `continue-on-error`.

**Remaining:** No full API/integration or Playwright E2E in CI (needs DB/secrets/wallets). That is future work; F-012’s fail-closed CI requirement is met.
