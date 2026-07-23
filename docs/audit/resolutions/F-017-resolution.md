# F-017 Resolution

**Status:** Resolved

**Commits:** Pending (landed with this change)

**How:** Shell Open Graph / Twitter meta in `__frontend/src/app.html` uses `__SITE_URL__` placeholders. A Vite plugin in `__frontend/vite.config.js` reads `VITE_SITE_URL` at build/dev and either injects absolute `og:url`, `og:image`, and `twitter:image` (plus image dimensions) or removes those tags when the env var is unset — so empty `content=""` never ships. Documented in `__frontend/.env.example` and `__frontend/README.md` (mirrors backend `FRONTEND_URL`).

**Remaining:** None for F-017. Per-route `PageMetadata` / share routes may still hardcode the production image host; that is outside this finding.
