# F-002: Multisig Session Authentication Does Not Enforce Native-Script Semantics

| Field | Value |
|-------|-------|
| **Severity** | High |
| **Finding ID** | F-002 |
| **Category** | Authentication / multisig authorization |
| **Status** | Accepted (by design) |

## Affected Files

- `helper/verifySignature.js`
- `routes/api/v0/session.js`

## Observation

`getScriptCriteria()` computes native-script criteria, including the required signer count, but session authentication later relies on `isPartyToScript()`. That helper only checks whether the signing key hash appears in the script key list. The session login flow accepts this membership result for multisig authentication, so threshold rules and timelock clauses are not enforced.

## Risk

A single member key can authenticate as a script address even when the native script requires multiple signatures or time conditions. This is an authorization bypass for multisig-backed session authentication.

## Recommendation

Replace the membership-only check with full native-script evaluation. The evaluator should enforce all-of, any-of, at-least, and timelock rules. A tested native-script evaluator is preferable to a partial local implementation.

## Current Status

**Accepted (by design) — not resolved.** Multisig session login remains membership-only (`isPartyToScript()`); threshold and timelock rules are intentionally not enforced. Documented in-session/helper comments and architecture notes. See `docs/audit/resolutions/F-002-resolution.md`.
