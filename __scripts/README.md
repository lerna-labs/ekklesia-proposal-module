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

## Data files

| File | Used by |
|------|---------|
| `categories.csv` | Budget pillar metadata (`setup-budget2026.js`). |
| `countries.json` | `seedCountries.js`. |
| `regions.json` | `seedRegions.js`. |
