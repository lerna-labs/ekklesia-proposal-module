# F-004: Proposal Public Field Exclusion Can Fail Open

| Field | Value |
|-------|-------|
| **Severity** | High |
| **Finding ID** | F-004 |
| **Category** | Privacy / public data exposure |
| **Status** | Partially resolved |

## Affected Files

- `schema/Vote.js`
- `routes/api/v0/proposals.js`
- `validation/applyPublicFieldExclusion.js`
- `validation/budget2026/excludeScript.js`

## Observation

The vote schema makes `excludeScript` optional. Public proposal retrieval strips non-public fields only when the vote has a loadable exclusion script. The Budget 2026 exclusion script identifies fields such as contact information, KYC data, legal declarations, and proposer email as non-public.

## Risk

A vote with a missing or misconfigured exclusion script can expose sensitive proposal metadata through public proposal endpoints.

## Recommendation

Fail closed for Budget 2026 proposal data. Make exclusion mandatory for applicable votes, or apply a built-in denylist when the configured exclusion script is absent or fails to load.

## Current Status

**Partially resolved.** When a vote has `excludeScript` set but the script fails to load, public responses strip `metaData` (fail closed). Startup warns on unloadable exclude scripts. Votes with no `excludeScript` still return full proposal data to public callers; exclusion is not mandatory. See `docs/audit/resolutions/F-004-resolution.md`.
