# Ekklesia Proposal Module — Frontend

SvelteKit frontend for the Ekklesia Proposal Module. It talks to the backend API
(see project root) for votes, proposals, categories, session, comments, and
notification settings.

Requires **Node.js 22+**.

## Stack

- **SvelteKit 2** with **Svelte 5** (runes, snippets)
- **adapter-static** — build outputs to `../public` for serving from the Express backend
- **Tailwind CSS 4** + [**shadcn-svelte**](https://shadcn-svelte.com/) for UI components
- **Wallet sign-in** via stake/DRep (Mesh/CIP-30) with httpOnly JWT cookie session

## Structure

- **`src/routes/`** — SvelteKit routes:
  - **`/`** — landing
  - **`/votes`** — list vote cycles
  - **`/votes/[voteSlug]`** — proposals for a vote (filters, search, pagination)
  - **`/votes/[voteSlug]/[proposalId]`** — proposal detail
  - **`/(private)/dashboard`** — auth required; my proposals, new/edit
  - **`/(private)/dashboard/[voteSlug]/new`** — new proposal for the vote with slug `[voteSlug]`
  - **`/(private)/dashboard/[voteSlug]/[proposalId]`** — edit proposal
- **`src/lib/`** — shared code:
  - **`forms/budget2026/`** (and other form folders) — proposal form, schema/config for the vote’s validation script
  - **`form/`** — reusable form primitives (Input, Textarea, DatePicker, etc.)
  - **`components/ui/`** — shadcn-svelte UI (button, card, dialog, select, etc.)
  - **`WalletSigner/`** — wallet connect and sign-in flow
  - **`base/`** — Header, Footer, Logo, VersionCheck
- **`src/stores/`** — session (`loggedIn`, `user`, `sessionExpiresAt`, `api.fetch`) and version store

## Scripts

- **`npm run dev`** — Vite dev server (default port, or set in vite config)
- **`npm run build`** — production build → `../public`
- **`npm run preview`** — preview the static build

## Environment

See [`.env.example`](.env.example).

- **`VITE_API_URL`** — base URL for the backend API (e.g. `http://localhost:3000/api/v0` or same origin). Used for `/votes`, `/proposals`, `/session`, `/notifications`, etc.
- **`VITE_SITE_URL`** — public site origin with no trailing slash (e.g. `https://hydra-voting.intersectmbo.org`). Injected at build/dev into shell `og:url`, `og:image`, and `twitter:image`. Same role as backend `FRONTEND_URL`; if unset, those meta tags are omitted.
- **`VITE_SERVER_STATUS`** — health endpoint path (e.g. `/health`).
- **`VITE_MAINTENANCE_MODE`** — `true` / `false` to show the maintenance banner.
- **`VITE_WALLETSIGNER_USER_TYPES`** — comma-separated sign types (e.g. `stake,drep`).
- **`VITE_WALLETSIGNER_USER_DEFAULT`** — default sign type.
- **`VITE_WALLETSIGNER_MULTISIG`** — `true` / `false` to enable multisig options.

## Auth

Private routes (dashboard, new proposal, edit) require a valid session. Session is established via wallet sign-in; the backend sets an HTTP-only cookie. The frontend never stores the JWT in JavaScript-readable storage. `GET /session` returns `userId`, optional `name`, `expiresIn`, and optional `adminVoteIds`.
