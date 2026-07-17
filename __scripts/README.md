# `__scripts`

MongoDB / local dev helpers. Most load `.env.development` from the repo root (see each file). Run from repo root, e.g. `node __scripts/<script>.js`.

## Root-level scripts

| Script | Purpose |
|--------|---------|
| `createDummyData.js` | Seeds one vote (pillars from `categories.csv`), many proposals (pagination, drafts, live, withdrawn, JSON imports), comments, and users for local UI/dev. |
| `createDummyDataThreeUsers.js` | Lighter dummy set: three users, one vote, three proposals per user (draft / live / withdrawn). |
| `createVoteWindowFixtures.js` | Replaces or creates the budget-2026 vote with **CLI-chosen date windows** (`--window=…`) plus fixture proposals to test submission/review UI states. |
| `setupVotesAndGeoSeed.js` | Runs `seedCountries` → `seedRegions` → `createDummyData` → `setup-cc-vote2026` → `addCcVoteCandidates` in order (full local stack seed). |
| `seedCountries.js` | Wipes and repopulates `Country` from `countries.json`. |
| `seedRegions.js` | Wipes and repopulates `Region` from `regions.json`. |
| `setup-budget2026.js` | Creates or updates the **Cardano Budget 2026** vote (`cardano-budget-2026`) with official windows and metadata aligned with dummy data. |
| `setup-cc-vote2026.js` | Creates or updates **CC Vote 2026** (`cc-vote-2026`); phases start at run time (edit `ADMINS` before production). |
| `addCcVoteCandidates.js` | Adds 11 live CC candidate proposals (mixed tracks) for `cc-vote-2026`. |
| `wipeDB.js` | Deletes all documents in Vote, Proposal, Comment, User, Country, Session, and CommentLike collections. |
| `check-duplicate-vote-slugs.js` | Pre-release check: exits non-zero if any `Vote.slug` is duplicated; otherwise ensures the unique slug index exists. |

## `admin/`

Run from repo root, e.g. `node __scripts/admin/export-proposal.mjs <proposalId>`.

| Script | Purpose |
|--------|---------|
| `export-proposal.mjs` | Exports one proposal by Mongo `_id` to `<id>.json` (Extended JSON) in the **current working directory**; optional `--env`. |
| `import-proposal.mjs` | Imports that JSON back into Mongo; **rewrites `proposerId`** to the constant in the script (edit before use); optional `--env`. |
| `validate-budget-proposal-draft-live.mjs` | Runs budget2026 Zod validation on a JSON file **twice** (as `draft`, then as `live`) without writing to the DB. |

## Data files (not executed)

| File | Used by |
|------|---------|
| `categories.csv` | Budget pillar metadata (`createDummyData`, `setup-budget2026`, etc.). |
| `countries.json` | `seedCountries.js`. |
| `regions.json` | `seedRegions.js`. |
| `proposal1.json`, `proposal2.json` | Imported and remapped in `createDummyData.js`. |
