# F-005: Vote Slug Is Used as a Lookup Key Without a Unique Constraint

| Field | Value |
|-------|-------|
| **Severity** | High |
| **Finding ID** | F-005 |
| **Category** | Data integrity / unique lookup key |
| **Status** | Resolved |

## Affected Files

- `schema/Vote.js`
- `helper/mongoErrors.js`
- `routes/api/v0/votes.js`

## Observation

`Vote.slug` is required and used as a routing/lookup key. Previously no unique schema constraint or unique index was defined.

## Risk

Duplicate vote slugs can make route handling and vote lookup ambiguous.

## Recommendation

Add a unique index on `slug`, handle duplicate-key errors, and run a migration or pre-release check for existing duplicate slugs.

## Current Status

**Resolved.** Unique index on `Vote.slug` in `schema/Vote.js`; duplicate-key handling via `helper/mongoErrors.js` in vote setup scripts; deploy preflight `__scripts/admin/ensure-vote-slug-unique-index.mjs`. See `docs/audit/resolutions/F-005-resolution.md`.
