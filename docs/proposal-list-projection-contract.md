# Proposal List Projection Contract

This document defines the frontend-facing field contract for `GET /api/v0/proposals` list items.

The list endpoint now supports vote-specific projection scripts:

- `validation/budget2026/listProjection.js`
- `validation/cc-vote2026/listProjection.js`

The route applies projection after `excludeScript`:

- `routes/api/v0/proposals.js`

## Consumer Map

### Public vote listing

- `__frontend/src/routes/votes/[voteSlug]/+page.svelte`
  - renders list rows and passes each proposal to `ProposalCard`
- `__frontend/src/lib/ProposalCard.svelte`
  - delegates to vote-specific cards

### Vote cards

- `__frontend/src/lib/votes/budget2026/ProposalCard.svelte`
  - root: `_id`/`id`, `title`/`name`, `status`, `proposerId`, `submittedAt`, `updatedAt`, `commentCount`, `summary`, `withdrawalDetails`
  - `metaData`: `proposerDetails.name`, `contractingParty.legalEntityType`, `totalBudget`, `conversionRate`

- `__frontend/src/lib/votes/ccVote2026/ProposalCard.svelte`
  - root: `_id`/`id`, `title`/`name`, `status`, `proposerId`, `submittedAt`, `updatedAt`, `commentCount`, `withdrawalDetails`
  - `metaData`: `track`, and track-specific `motivation` (`individual|organisation|consortium`)

### Private dashboard list

- `__frontend/src/routes/(private)/dashboard/+page.js`
- `__frontend/src/routes/(private)/dashboard/+page.svelte`
  - relies on root fields only: `_id`, `title`, `status`, `updatedAt`, `proposerId`

## Guardrails

- Keep `listProjectionScript` configured in vote setup for active forms:
  - `__scripts/setup-budget2026.js`
  - `__scripts/setup-cc-vote2026.js`
  - `__scripts/createDummyData.js`
- Keep projection-shape regression tests updated when list card fields change.
- When adding a new vote form, add/assign:
  - `validation/<form>/listProjection.js`
  - vote `listProjectionScript` configuration
  - tests proving list payload covers card requirements
