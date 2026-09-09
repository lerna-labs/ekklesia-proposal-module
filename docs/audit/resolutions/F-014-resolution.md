# F-014 Resolution

**Status:** Partially resolved (Koios done; Blockfrost residual)

**Dependency:** `@lerna-labs/ekklesia-helpers@^2.0.1` (validated installed `2.0.1`)

**How:**

- Helpers `2.0.1` bounds `KoiosProvider` and `fetchHandleMe` with a 10s `AbortController` per attempt and one retry (`fetchWithRetry` / `MAX_ATTEMPTS = 2`), matching the audit recommendation for the primary Koios path.
- This app bumps to `^2.0.1` and ratchets the installed dist via `__tests/security/atk-helpers-koios-timeout-guard.js`.
- App-side treasury verify already maps `ProviderError` → HTTP 503.

**Remaining:** `BlockfrostProvider.get` in helpers `2.0.1` still uses bare `fetch()` with no timeout. Close fully when helpers ship Blockfrost timeouts (or when this app stops using Blockfrost as fallback).
