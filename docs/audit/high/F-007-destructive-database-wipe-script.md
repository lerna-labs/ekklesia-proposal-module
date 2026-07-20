# F-007: Destructive Database Wipe Script Lacks Production Guard

| Field | Value |
|-------|-------|
| **Severity** | High |
| **Finding ID** | F-007 |
| **Category** | Destructive setup script |
| **Status** | Partially fixed |

## Affected Files

- `package.json:31` (original)
- `__setup/wipeDB.js:23-25` (original)
- `__scripts/wipeDB.js` (current)

## Observation

`npm run fixtures:clean` originally ran `node __setup/wipeDB.js`. The script deletes all Vote, Proposal, and Comment documents without a production guard, database-name allowlist, or confirmation prompt.

## Risk

A contributor or operator could accidentally wipe shared or production-like data.

## Recommendation

Add an explicit non-production guard, require an allowlisted database name, and require a confirmation or force flag before destructive execution.

## Current Status

Partially fixed based on current source inspection. The old `fixtures:clean` script and `__setup/wipeDB.js` path are gone, but `__scripts/wipeDB.js` still deletes multiple collections without a production guard or confirmation.
