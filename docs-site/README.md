# Proposal Module documentation site

Source for the published Proposal Module documentation at
<https://proposals.docs.ekklesia.vote>. Built with Jekyll and deployed to GitHub
Pages by `.github/workflows/docs-pages.yml` on every push to `main` that touches
this directory.

These pages are public-facing. They describe the HTTP surface an external
integrator can call and the rules the server enforces. Internal design notes,
schema references and deployment detail stay in `../docs/` and are not
published.

## Local development

Requires Ruby 3.3 with Bundler, and Node.js 24+.

```bash
npm install
bundle install
npm run serve
```

`npm run serve` writes `_data/version.yml` from the module's `package.json` and
then starts Jekyll on <http://localhost:4000>.

## Checks

```bash
npm run fmt:check    # markdown formatting
npm run lint:specs   # OpenAPI validity
npm run postman      # regenerate the Postman collection
```

All three run in CI on every pull request.

## The API specification

`api/openapi.yaml` is the source of truth for the API reference. The interactive
page at `/api/spec/` renders it, and the Postman collection is generated from it
at build time, so neither can drift from it.

When a route changes in `../routes/`, update the specification in the same pull
request.

## Adding a download

1. Create a file in `_downloads/` with `title`, `description`, `version` and
   `file` front matter.
2. Put the file itself in `downloads/_files/`, or generate it into that
   directory during the build.

It then appears on the Downloads page automatically.
