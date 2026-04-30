## Digest email — test suite plan

Companion to `__emails/digest.html`. Everything described here lives inside
`__emails/` for now; if/when this graduates to a real feature we'll move the
rendering pipeline under `helper/` and the fixtures under a proper test tree.

### Purpose

Exercise `digest.html` against a range of realistic payloads, render the HTML,
derive subject + preheader, and deliver the result to a Mailtrap sandbox inbox
so we can eyeball rendering across mail clients and iterate on copy / layout /
CTA behavior — across multiple brands and locales.

### Scope

**In scope**
- Handlebars rendering of the existing template (no template edits from the
  test harness — the template is the unit under test).
- Brand-configurable theming: every color, font, logo, platform name, and
  footer string sourced from `__emails/branding/<name>.json`, deep-merged on
  top of `default.json`. Multi-brand fan-out so several themes render
  side-by-side in a single invocation.
- Full i18n layer: ICU MessageFormat (via `intl-messageformat`), per-locale
  translation catalogs under `__emails/i18n/<tag>.json`, locale-fallback
  chain (requested → base language → `en`) with per-key fallthrough.
- Digest subject + preheader generation from TRD-shaped catalog keys
  (`subject.digest.single.<type>`, `subject.digest.multi.single_vote`,
  `subject.digest.multi.many_votes`, `subject.period.<period>`,
  `preheader.default`). Handles N=1, N≥2/M=1, and N≥2/M≥2 variants with
  CLDR-compliant plurals.
- Delivery to Mailtrap Email Testing (sandbox) via its REST API.
- A growing set of fixture payloads committed to `fixtures/`.

**Out of scope (deferred — call out before adding)**
- Instant-mode emails. The TRD mentions four instant event types; the
  `subject.instant.*` catalog keys already exist, but there is no
  `instant.html` template or dispatcher here yet — this harness renders
  digest payloads only.
- TRD subject-generator features beyond catalog shape: the 78-codepoint
  truncation algorithm (§4.4), the full sanitization pipeline (§4.5 —
  bidi-override stripping, Cf-category removal, whitespace collapse), and
  per-locale platform-name overrides (§3.3 / §4.7). The current subject
  builder is TRD-shaped but does not truncate, sanitize, or swap platform
  name by locale.
- Automated visual regression / DOM snapshots.
- Accessibility audits (contrast ratios, alt text, semantic structure).
- SMTP/IMAP-level bounce handling, DKIM/SPF/DMARC checks, deliverability
  testing.
- Plain-text multipart generation (HTML-only for v1).

### Directory layout

```
__emails/
├── digest.html               # template under test (existing)
├── TEST-PLAN.md              # this file
├── README.md                 # integration + operations guide
├── render.js                 # compile + hydrate + brand-merge + i18n
├── subject.js                # TRD-shaped subject / preheader builder
├── i18n.js                   # locale-aware translator factory
├── mailtrap.js               # fetch-based sandbox client
├── test.js                   # CLI entry point
├── .gitignore                # ignores .rendered/
├── .rendered/                # (gitignored) local HTML previews
├── branding/
│   ├── default.json          # Ekklesia palette / fonts / platform name
│   └── intersect.json        # Intersect Hydra Voting white-label (matches the SvelteKit UI palette)
├── i18n/
│   └── en.json               # Reference translation catalog (TRD-shaped keys)
└── fixtures/
    ├── 01-single-submission-confirmed.json
    ├── 02-single-new-comment.json
    ├── 03-single-profile-withdrawn.json
    ├── 04-few-single-vote.json
    ├── 05-few-many-votes.json
    ├── 06-many-many-votes.json
    ├── 07-all-event-types.json
    └── 08-long-titles.json
```

### Data model

Fixtures are deliberately minimal — the hydrator in `render.js` fills in
`summary`, `preheader`, and every translated string. A fixture only has to
supply the event payload:

```jsonc
{
  "scenario":       "Human-readable description (ignored by renderer).",
  "locale":         "en",                         // optional; defaults to "en" (or --locale flag wins)
  "period":         "6h" | "24h",
  "periodVerbose":  "6 hours" | "24 hours",       // optional; derived via catalog from period
  "votes": [
    { "name": "…", "url": "…", "proposals": [
      { "title": "…", "url": "…", "events": [
        { "type": "<event_type>", "timestamp": "…", /* type-specific fields */ }
      ]}
    ]}
  ],
  "preheader":       "…",                         // optional; derived from catalog if absent
  "preferencesUrl":  "…",                         // optional; stub default
  "unsubscribeUrl":  "…"                          // optional; stub default
}
```

Recipient identity is NOT in the fixture or render context. The module only
knows a wallet identifier (stake1…, drep1…), which doesn't render well as a
greeting, so the template has no "Hello X" line.

Event types and their extra fields:

| Type                     | Extra fields                                      |
|--------------------------|---------------------------------------------------|
| `submission_confirmed`   | —                                                 |
| `verified_badge_applied` | —                                                 |
| `verified_badge_removed` | —                                                 |
| `profile_withdrawn`      | `reason` (required)                               |
| `new_comment`            | `commenter` (required), `preview` (optional)      |
| `voting_opened`          | —                                                 |
| `results_published`      | `resultsUrl` (optional; inline "View results →")  |

### Rendering pipeline (`render.js`)

1. `Handlebars.registerHelper('eq', (a, b) => a === b)` — required by the
   template.
2. Load `digest.html`, compile once (cached per process).
3. Resolve brand: load `branding/default.json`, deep-merge any override
   (bare name, path, or partial object) on top.
4. Resolve translator: `createTranslator(locale)` loads each catalog in the
   fallback chain (requested → base lang → `en`) and returns a `t(key, vars)`
   / `t.raw(key, vars)` pair with per-key fallthrough.
5. `hydrate(fixture, t)` derives `summary` (totals, plural flags, period
   strings pulled from catalog), localizes every event (attaches
   `badgeLabel`, `headline`, optional `reasonLabel`), and builds the default
   preheader from `preheader.default`.
6. `buildChrome(t, data, brand)` pre-resolves every template-chrome string
   into a flat `data.t` object the template reads via triple-brace.
7. Compile + render → HTML string; strip the leading comment block.
8. `buildSubject(data, { platformName, t })` produces the subject from
   `subject.*` catalog keys; `data.preheader` is the preheader.

### Subject / preheader builder (`subject.js`)

Uses TRD v0.3 Appendix A catalog keys. The digest paths are implemented in
full; instant-mode dispatch (`subject.instant.*`) has catalog entries but no
invocation path in this harness.

- **N = 1**: `subject.digest.single.<type>` — e.g.
  `"{platformName} — Submission confirmed: {proposalTitle}"`. Vote events
  (`voting_opened`, `results_published`) substitute `voteName` for the
  entity.
- **N ≥ 2 and M = 1**: `subject.digest.multi.single_vote` — e.g.
  `"{platformName} digest — {N, plural, one {# update} other {# updates}} on {voteName} ({period})"`.
- **N ≥ 2 and M ≥ 2**: `subject.digest.multi.many_votes` — with `{M, plural, ...}`
  for the distinct-vote count.
- **Preheader**: `preheader.default` — same plural structure, no platform
  prefix.

Both call `t.raw(...)` so ampersands and angle brackets in titles survive
into the subject header unescaped (subjects are plain text, not HTML).

Platform name comes from the resolved brand config (`brand.platformName`) or
an explicit `platformName` option; locale-per-platform-name overrides
(TRD §4.7) are deferred.

### Translations (i18n)

All user-visible strings in body + subject live in `__emails/i18n/<tag>.json`.
The reference catalog is `en.json`. Adding a locale is a single-file drop:

```bash
cp __emails/i18n/en.json __emails/i18n/es.json
# translate values; keys stay identical
node __emails/test.js --all --preview --locale=es
```

Fallback chain per TRD §4.6 SL-051: `es-AR` → `es` → `en`. Missing keys warn
once and render `[[body.key.name]]` so gaps surface loudly. Partial catalogs
are valid — untranslated keys independently fall through.

ICU MessageFormat is instantiated with `{ ignoreTag: true }` so `<strong>`
tags in a pattern render as literal HTML, not rich-text components. String
args are HTML-escaped before substitution, and the template reads values via
triple-brace (`{{{t.summary}}}`) — user-supplied content cannot break out of
trusted markup.

### Mailtrap integration (`mailtrap.js`)

- Endpoint: `POST https://sandbox.api.mailtrap.io/api/send/{MAILTRAP_INBOX_ID}`
- Auth:     `Authorization: Bearer {MAILTRAP_TOKEN}`
- Body:     `{ from: {email, name}, to: [{email}], subject, html, category }`
- `category` is set to `<fixture>.<brand>` so sandbox filters stay useful
  when fanning out across themes.

Chosen over Mailtrap SMTP + `nodemailer` because the module already uses
`fetch` for Koios and another transport dep isn't warranted.

### Environment variables

The runner first calls the project's `helper/envLoader.js` (which loads
`.env.${NODE_ENV}` with a fallback to `.env`), then overlays `__emails/.env`
with `override: true` so test-harness credentials can live outside the
docker-managed `.env.development`. Copy `__emails/.env.example` to
`__emails/.env` and fill in:

```
MAILTRAP_TOKEN=        # API token for the sandbox project
MAILTRAP_INBOX_ID=     # numeric inbox id from the Mailtrap UI
MAILTRAP_TO=           # recipient address to stamp on messages; any value works
                       # in sandbox mode (nothing actually delivers)
MAILTRAP_FROM=no-reply@ekklesia.test
MAILTRAP_FROM_NAME=Ekklesia (sandbox)
EMAIL_BRAND=           # brand name or path; overridden by --brand=... on CLI
EMAIL_LOCALE=          # BCP 47 tag; overridden by --locale=... on CLI
```

`__emails/.env` is git-ignored. If `MAILTRAP_TOKEN` or `MAILTRAP_INBOX_ID` is
unset the runner renders locally and skips the send — useful for pure-preview
iterations.

### Installing

Two dev deps:

```
npm install --save-dev handlebars intl-messageformat
```

Both are already in `package.json` — run the install if you just cloned.

### Running

```bash
# list available scenarios + brands
node __emails/test.js

# render every scenario and push to Mailtrap
node __emails/test.js --all

# render a single scenario
node __emails/test.js --scenario=04-few-single-vote

# render locally only (no network call); writes to __emails/.rendered/
node __emails/test.js --all --preview

# render with a different brand config (white-label sanity check)
node __emails/test.js --all --preview --brand=intersect
node __emails/test.js --all --preview --brand=/abs/path/to/brand.json

# fan out across multiple brands in one invocation
node __emails/test.js --all --preview --brands=default,intersect
node __emails/test.js --all --preview --brands=all     # every brand in branding/

# pick a locale (falls back requested → base-lang → en)
node __emails/test.js --all --preview --locale=es

# fan out across locales — intended for translation contributors comparing
# their new catalog against English side-by-side
node __emails/test.js --all --preview --locales=en,es
node __emails/test.js --all --preview --locales=all    # every catalog in i18n/

# or set EMAIL_BRAND=intersect / EMAIL_LOCALE=es in __emails/.env
```

Each render writes `__emails/.rendered/<scenario>.<brand>.<locale>.html` so
every combination of theme and translation stays on disk at once, ready for
side-by-side browser comparison. The brand+locale tag is also used as the
Mailtrap category so sandbox filters stay useful when fanning out.

### Test matrix — starter scenarios

| # | File                                  | Shape               | What it exercises                                           |
|---|---------------------------------------|---------------------|-------------------------------------------------------------|
| 1 | `01-single-submission-confirmed.json` | N=1, M=1            | Digest-of-one path; CTA alignment with minimal content      |
| 2 | `02-single-new-comment.json`          | N=1, M=1            | Optional `preview` blockquote rendering                     |
| 3 | `03-single-profile-withdrawn.json`    | N=1, M=1            | `reason` block with red accent border                       |
| 4 | `04-few-single-vote.json`             | N=3, M=1            | Multiple events stacked under one proposal; divider rules   |
| 5 | `05-few-many-votes.json`              | N=5, M=2            | Multi-vote header separator; per-vote card grouping         |
| 6 | `06-many-many-votes.json`             | N≈20, M=5           | Dense layout, long scroll, CTA repetition, `resultsUrl` link |
| 7 | `07-all-event-types.json`             | N=7, M=2            | Every badge color / copy variant at once; `resultsUrl` link |
| 8 | `08-long-titles.json`                 | N=2, M=1            | Long vote + proposal titles; subject-line sanity check      |

### Extending the matrix

When adding a scenario:
1. Drop a JSON file into `fixtures/` with a two-digit prefix that maintains
   running order (makes `--all` output scannable).
2. Include a `"scenario"` field describing what's being exercised — it's
   ignored by the renderer but surfaces when reading diffs.
3. Prefer the smallest payload that reproduces the variation. The hydrator
   derives `summary` + `preheader`; let it.
4. Once a fixture stabilizes, eyeball the rendered HTML in `.rendered/` and
   the Mailtrap delivery. If copy/layout needs changes, iterate on the
   template or the catalog, not on the fixture — fixtures represent *data*,
   not desired output.

Candidates not in the starter set but worth adding before shipping:
- `09-unicode-content.json` — non-Latin titles, combining characters
- `10-bidi-injection.json` — title containing U+202E; asserts sanitizer
  strips it (will require wiring a sanitizer into `render.js` first)
- `11-zero-events.json` — should we even render or just refuse? (Product
  question.)
- `12-minimum-data.json` — omit every optional field; confirms hydrator
  defaults
- `13-long-reason-and-preview.json` — verifies blockquote width and wrapping
- `14-non-en-locale.json` — paired with a translated catalog (e.g.
  `i18n/es.json`), confirms per-locale rendering end-to-end

### Deferred work

Tracked here until a proper ticket system picks them up — do not file GitHub
issues yet.

- Finish TRD subject-generator parity: 78-codepoint truncation algorithm,
  full sanitization pipeline (bidi overrides, Cf-category stripping,
  whitespace collapse), per-locale platform-name overrides.
- Instant-mode template (`instant.html`) + dispatcher. The
  `subject.instant.*` catalog keys exist; no renderer invokes them yet.
- Event-mapper refactor: move per-type badge/headline derivation out of the
  template into a small `events.js` so admin-configurable future events can
  emit a stable `translationKey` + payload and render through the same
  generic block.
- Additional locale catalogs (`es.json`, `ja.json`, …). No template changes
  required; drop a file and render with `--locale=<tag>`.
- HTML linter step (`html-validate` or similar) on each render.
- Visual regression harness (Playwright screenshot diff against a baseline
  directory) once the template stabilizes.
- Plain-text multipart generation — mail clients that prefer text/plain
  currently see nothing. Low priority while this is sandbox-only.
- Move the harness under `helper/emails/` + a real test runner (Vitest) once
  the module grows a test story more broadly.
