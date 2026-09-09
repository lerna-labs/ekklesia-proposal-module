# `__scripts`

MongoDB setup helpers. Most load `.env.development` from the repo root (see each file). Run from repo root.

Suggested order: `seedCountries` → `seedRegions` → `setup-budget2026` → `setup-cc-vote2026`.

Before running either vote setup script, fill `ADMINS` in that file with Bech32 stake addresses.

## Scripts

| Script | Purpose |
|--------|---------|
| `seedCountries.js` | Wipes and repopulates `Country` from `countries.json` (form/API dropdowns). |
| `seedRegions.js` | Wipes and repopulates `Region` from `regions.json` (CC form/API dropdowns). |
| `setup-budget2026.js` | Creates or updates the **Cardano Budget 2026** vote (`cardano-budget-2026`). |
| `setup-cc-vote2026.js` | Creates or updates **CC Vote 2026** (`cc-vote-2026`). |

Examples:

```bash
node __scripts/seedCountries.js
node __scripts/seedRegions.js
node __scripts/setup-budget2026.js
node __scripts/setup-cc-vote2026.js
```

## Admin / ops

| Script | Purpose |
|--------|---------|
| `admin/ensure-treasury-tx-hash-unique-index.mjs` | Reports colliding non-draft/non-archived `metaData.treasuryDonationTxHash` values, then runs `Proposal.syncIndexes()` for the #418 global partial unique index. Loads `.env` then `.env.production` when present. Use `--check-only` to skip index sync. |
| `admin/ensure-vote-slug-unique-index.mjs` | Reports duplicate `Vote.slug` values, then runs `Vote.syncIndexes()` for the F-005 unique index. Loads `.env` then `.env.production` when present. Use `--check-only` to skip index sync. |

```bash
node __scripts/admin/ensure-treasury-tx-hash-unique-index.mjs --check-only
node __scripts/admin/ensure-treasury-tx-hash-unique-index.mjs
node __scripts/admin/ensure-vote-slug-unique-index.mjs --check-only
node __scripts/admin/ensure-vote-slug-unique-index.mjs
```

## Data files

| File | Used by |
|------|---------|
| `categories.csv` | Budget pillar metadata (`setup-budget2026.js`). |
| `countries.json` | `seedCountries.js`. |
| `regions.json` | `seedRegions.js`. |
