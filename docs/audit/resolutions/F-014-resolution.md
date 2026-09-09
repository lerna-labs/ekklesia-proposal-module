# F-014 Resolution

**Status:** Resolved (for this module)

**Dependency:** `@lerna-labs/ekklesia-helpers@^2.0.1` (validated installed `2.0.1`)

**How:**

- Helpers `2.0.1` bounds `KoiosProvider` and `fetchHandleMe` with a 10s `AbortController` per attempt and one retry (`fetchWithRetry` / `MAX_ATTEMPTS = 2`).
- This app bumps to `^2.0.1` and ratchets the installed dist via `__tests/security/atk-helpers-koios-timeout-guard.js`.
- App-side treasury verify already maps `ProviderError` → HTTP 503.

**Blockfrost note (not in scope for this module):** Helpers still ship an optional `BlockfrostProvider` whose HTTP `get` uses bare `fetch()`. This proposal module does **not** use it under the documented configuration: [`.env.example`](../../../.env.example) only sets Koios `API_URL` / `API_TOKEN`, and the app never sets `BLOCKFROST_URL` / `BLOCKFROST_PROJECT_ID` / `PRIMARY_PROVIDER`. Helpers only construct Blockfrost when those env vars are present; otherwise the secondary provider stays `null`. Call sites here (`verifyDeposit`, `validateDrep`, `fetchName`) therefore hit Koios only.
