# Ekklesia Budget Module — Frontend

SvelteKit frontend for the Ekklesia budget/vote module. It talks to the backend API (see project root) for votes, proposals, categories, session, and comments.

## Stack

- **SvelteKit 2** with **Svelte 5** (runes, snippets)
- **adapter-static** — build outputs to `../public` for serving from the Express backend
- **Tailwind CSS 4** + **bits-ui** for UI components
- **Wallet sign-in** via stake/DRep (Mesh/CIP-30) with JWT session

## Structure

- **`src/routes/`** — SvelteKit routes:
  - **`/`** — landing
  - **`/votes`** — list vote cycles
  - **`/votes/[voteSlug]`** — proposals for a vote (filters, search, pagination)
  - **`/votes/[voteSlug]/[proposalId]`** — proposal detail
  - **`/(private)/dashboard`** — auth required; my proposals, new/edit
  - **`/(private)/dashboard/new`** — new proposal (requires `?vote=<voteId>`)
  - **`/(private)/dashboard/[proposalId]/edit`** — edit proposal
- **`src/lib/`** — shared code:
  - **`budget2026/`** — proposal form (Form.svelte, work packages, legal declarations, etc.) and schema/config for the 2026 validation script
  - **`form/`** — reusable form primitives (Input, Textarea, DatePicker, etc.)
  - **`components/ui/`** — bits-ui–based UI (button, card, dialog, select, etc.)
  - **`WalletSigner/`** — wallet connect and sign-in flow
  - **`base/`** — Header, Footer, Logo, VersionCheck
- **`src/stores/`** — session (user, JWT, api fetch) and version store

## Scripts

- **`npm run dev`** — Vite dev server (default port, or set in vite config)
- **`npm run build`** — production build → `../public`
- **`npm run preview`** — preview the static build

## Environment

- **`VITE_API_URL`** — base URL for the backend API (e.g. `http://localhost:3000/api/v0` or same origin). Used for `/votes`, `/proposals`, `/session`, etc.

## Auth

Private routes (dashboard, new proposal, edit) require a valid session. Session is established via wallet sign-in; the backend sets an HTTP-only cookie and returns `userId`, optional `name`, and `adminVoteIds` from `GET /session`.
