# F-005: Vote Slug Is Used as a Lookup Key Without a Unique Constraint

| Field | Value |
|-------|-------|
| **Severity** | High |
| **Finding ID** | F-005 |
| **Category** | Data integrity / unique lookup key |
| **Status** | Open |

## Affected Files

- `schema/Vote.js:50-53`
- `routes/api/v0/votes.js:178-196`

## Observation

`Vote.slug` is required, but no unique schema constraint or unique index is defined. The API and frontend use the slug as a routing and lookup key.

## Risk

Duplicate vote slugs can make route handling and vote lookup ambiguous.

## Recommendation

Add a unique index on `slug`, handle duplicate-key errors, and run a migration or pre-release check for existing duplicate slugs.

## Current Status

Open. `Vote.slug` remains required but not unique, and slug lookup still uses `findOne({ slug })`.
