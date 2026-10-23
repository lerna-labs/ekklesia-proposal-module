# Ekklesia Proposal Module

## Overview

Full-stack Cardano governance proposal platform for collecting proposals and
facilitating public comment and revision. Users authenticate by signing a nonce
challenge with their Cardano wallet (Ed25519/CIP-30 signatures).

**Stack:** Express.js backend, MongoDB (Mongoose), SvelteKit frontend.

## Getting Started

Requires **Node.js 24.5+**.

1. Copy `.env.example` to `.env` and fill in required variables
2. `npm install`
3. `npm start`

### Frontend

The SvelteKit frontend lives in `__frontend/` and installs and runs separately:

```bash
cd __frontend
npm install
npm run dev
```

It builds to `../public`, which the Express backend serves in production, so
run `npm run build` there before `npm start` will serve current frontend
assets. See [`__frontend/README.md`](__frontend/README.md) for its structure,
scripts, and environment variables.

### Vote setup (database)

Create or update vote documents in MongoDB. Requires a working MongoDB connection (`MONGODB_*` in `.env` or `.env.development`).

Fill `ADMINS` in each setup script with Bech32 stake addresses before running. Seed countries and regions first so form dropdowns work:

```bash
node __scripts/seedCountries.js
node __scripts/seedRegions.js
node __scripts/setup-budget2026.js
node __scripts/setup-cc-vote2026.js
```

- **Budget 2026** (`slug: cardano-budget-2026`): official 2026 UTC windows, `budget2026` validation scripts, 1000 ADA treasury donation in lovelace. On first run, pillars load from `__scripts/categories.csv`. Re-running updates dates and settings but keeps existing pillar ids.
- **CC Vote 2026** (`slug: cc-vote-2026`): fixed UTC phase windows and `cc-vote2026` validation scripts.

See [System Architecture](docs/system-architecture.md) for a full overview of
components and deployment.

## Testing and checks

```bash
npm test            # runs test:guards, test:mailer, and test:helper
npm run lint
npm run format:check
```

The frontend has no automated test suite. From `__frontend/`:

```bash
npm run check        # svelte-kit sync + svelte-check, type checking only
npm run lint
npm run format:check
```

## Documentation

Public API documentation is published from `docs-site/` to
<https://proposals.docs.ekklesia.vote>. Update `docs-site/api/openapi.yaml` in
the same pull request as any change to `routes/`.

The documents below are internal references for working on the module itself.
Update the relevant document below when a change affects an API contract,
schema, auth flow, or route. `docs/audit/` holds audit records, not
contributor onboarding material.

| Document                                               | Description                                                                              |
|--------------------------------------------------------|------------------------------------------------------------------------------------------|
| [System Architecture](docs/system-architecture.md)     | Components, data flows, role-based access control, and infrastructure                    |
| [API Specification](docs/api-specification.md)         | All public, authenticated, and admin API endpoints with request/response formats         |
| [Login Flow](docs/login-flow.md)                       | Wallet-based authentication flow (nonce challenge, signature verification, JWT issuance) |
| [User Flows](docs/user-flows.md)                       | User journeys for public viewers, proposers, DReps, and admins                           |
| [Proposal Flow](docs/proposal-flow.md)                 | Proposal lifecycle state machine (draft, live, withdrawn, archived)                      |
| [Proposal Schema](docs/proposal-schema-description.md) | Complete field reference for proposals including validation rules and enums              |
| [Vote Schema](docs/vote-schema-description.md)         | Vote (funding cycle) schema with submission, feedback, and review date windows           |
| [Comment Schema](docs/comment-schema-description.md)   | Comment and reply schema including likes and withdrawal details                          |
| [User Schema](docs/user-schema-description.md)         | User schema with Bech32 address keys and runtime role derivation                         |
| [Notifications](docs/notification-system-implementation.md) | Email notifications, preferences API, cron milestones, and mail transport           |
| [Proposal List Projection](docs/proposal-list-projection-contract.md) | Vote-specific `GET /proposals` list field contract                         |

