# F-002: Multisig Session Authentication Does Not Enforce Native-Script Semantics

| Field | Value |
|-------|-------|
| **Severity** | High |
| **Finding ID** | F-002 |
| **Category** | Authentication / multisig authorization |
| **Status** | Open |

## Affected Files

- `helper/verifySignature.js:133-151`
- `helper/verifySignature.js:154-190`
- `routes/api/v0/session.js:290-300`

## Observation

`getScriptCriteria()` computes native-script criteria, including the required signer count, but session authentication later relies on `isPartyToScript()`. That helper only checks whether the signing key hash appears in the script key list. The session login flow accepts this membership result for multisig authentication, so threshold rules and timelock clauses are not enforced.

## Risk

A single member key can authenticate as a script address even when the native script requires multiple signatures or time conditions. This is an authorization bypass for multisig-backed session authentication.

## Recommendation

Replace the membership-only check with full native-script evaluation. The evaluator should enforce all-of, any-of, at-least, and timelock rules. A tested native-script evaluator is preferable to a partial local implementation.

## Current Status

Open. The current source still calls `isPartyToScript()` during multisig login, and that helper still accepts key membership without enforcing threshold or timelock semantics.
