# F-004: Proposal Public Field Exclusion Can Fail Open

| Field | Value |
|-------|-------|
| **Severity** | High |
| **Finding ID** | F-004 |
| **Category** | Privacy / public data exposure |
| **Status** | Open |

## Affected Files

- `schema/Vote.js:95-99`
- `routes/api/v0/proposals.js:731-741`
- `validation/budget2026/excludeScript.js:18-24`

## Observation

The vote schema makes `excludeScript` optional. Public proposal retrieval strips non-public fields only when the vote has a loadable exclusion script. The Budget 2026 exclusion script identifies fields such as contact information, KYC data, legal declarations, and proposer email as non-public.

## Risk

A vote with a missing or misconfigured exclusion script can expose sensitive proposal metadata through public proposal endpoints.

## Recommendation

Fail closed for Budget 2026 proposal data. Make exclusion mandatory for applicable votes, or apply a built-in denylist when the configured exclusion script is absent or fails to load.

## Current Status

Open. `excludeScript` remains optional, and proposal endpoints still filter only when a loadable exclusion script is configured.
