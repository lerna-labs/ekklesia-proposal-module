# Security PoCs (v2 Wraith run, 2026-05-06)

Adversarial exploit scripts targeting the v2 branch of `proposal-module`
(commit `5b88e17`). Each script reproduces a finding from the Wraith run.
Run each against a local dev instance only — they exercise live HTTP and
will create / mutate documents in the connected MongoDB.

| Script | Finding | Target |
|---|---|---|
| `atk-cc-cold-promote-race.js` | CC-COLD-001 (CRITICAL) | `PUT /api/v0/proposals/:id` (status=live) on a `cc-vote2026` form |
| `atk-treasury-promote-race.js` | TX-HASH-001 regression (CRITICAL) | `PUT /api/v0/proposals/:id` (status=live) on a `budget2026` form |
| `atk-mail-relay-abuse.js` | NOTIFY-ABUSE-001 (HIGH) | `PUT /api/v0/notifications` |
| `atk-mail-deps-blackout.js` | MAIL-DEPS-001 (HIGH) | server boot, route mount diagnostic |

## Pre-requisites

- A `proposal-module` dev instance with all `package.json` deps installed
  (the v2 branch added `googleapis` and `google-auth-library`; if those are
  missing, `npm install` first or `MAIL-DEPS-001` will mask everything).
- Two valid sessions for the same proposer stake (race scripts) — JWT
  cookies from the SvelteKit frontend are fine.
- For `atk-treasury-promote-race.js`: a real preprod tx hash whose donor
  stake matches the test proposer (same fixture set used in the
  2026-04-21 run still works).

## Cleanup

The race scripts tag created proposals with `[Wraith-2026-05-06-V2]` in the
title. After confirming, drop them with the `__scripts/wipeDB.js` flow or a
direct delete by tag.
