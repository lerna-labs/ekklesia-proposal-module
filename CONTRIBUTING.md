# Contributing

Thanks for contributing to the Ekklesia Proposal Module.

## Setup

1. Copy `.env.example` to `.env` and fill in required variables (see root [README.md](README.md)).
2. `npm install` at the repository root.
3. Optionally seed votes (countries/regions first): see README “Vote setup”.
4. Frontend: `cd __frontend && npm install && npm run dev`.
5. Backend: `npm start` from the repository root.

## Documentation

Product docs live under [`docs/`](docs/) (indexed from the root README). Do not
treat `docs/audit/` as contributor onboarding material.

## Pull requests

- Keep changes focused; match existing code style.
- Update product docs when you change API contracts, schemas, auth, or routes.
- Prefer clear commit messages that explain *why*.
