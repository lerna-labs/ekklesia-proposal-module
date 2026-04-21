## Digest email — test suite plan

Companion to `__emails/digest.html`. Everything described here lives inside `__emails/`
for now; if/when this graduates to a real feature we'll move the rendering pipeline
under `helper/` and the fixtures under a proper test tree.

### Purpose

Exercise `digest.html` against a range of realistic payloads, render the HTML, derive
subject + preheader, and deliver the result to a Mailtrap sandbox inbox so we can
eyeball rendering across mail clients and iterate on copy / layout / CTA behavior.

### Scope

**In scope**
- Handlebars rendering of the existing template (no template edits from the test
  harness — the template is the unit under test).
- Subject and preheader generation that matches the current comment block at the top
  of `digest.html` (single-event vs. multi-event digest).
- Delivery to Mailtrap Email Testing (sandbox) via its REST API.
- A growing set of fixture payloads committed to `fixtures/`.

**Out of scope (deferred — call out before adding)**
- The full i18n subject generator in `.claude/email-notification-generation.md` (TRD
  v0.3). That spec adds locale fallback, ICU plurals, per-deployment platform-name
  config, and a 78-codepoint truncation algorithm. The harness here uses a minimal
  English-only subject builder so we can iterate on *template visuals* without
  blocking on the subject-generator feature.
- Instant-mode emails (the TRD mentions them; this harness is digest-only because
  that's what `digest.html` renders).
- Automated visual regression / DOM snapshots.
- Accessibility audits (contrast ratios, alt text, semantic structure).
- SMTP/IMAP-level bounce, DKIM, or deliverability testing.
- Plain-text multipart generation (HTML-only for v1).

### Directory layout

```
__emails/
├── digest.html               # template under test (existing)
├── TEST-PLAN.md              # this file
├── render.js                 # compile + hydrate + render
├── subject.js                # minimal subject/preheader builder
├── mailtrap.js               # fetch-based sandbox client
├── test.js                   # CLI entry point
├── .gitignore                # ignores .rendered/
├── .rendered/                # (gitignored) local HTML previews
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

Fixtures are deliberately minimal — the hydrator in `render.js` fills in `summary`
and `preheader` if a fixture omits them. A fixture only has to supply:

```jsonc
{
  "scenario": "Human-readable description (ignored by renderer).",
  "candidate":      { "displayName": "…" },
  "period":         "6h" | "24h",
  "periodVerbose":  "6 hours" | "24 hours",   // optional; derived from period
  "votes": [
    { "name": "…", "url": "…", "proposals": [
      { "title": "…", "url": "…", "events": [
        { "type": "<event_type>", "timestamp": "…", /* type-specific fields */ }
      ]}
    ]}
  ],
  "preheader":       "…",                     // optional; derived if absent
  "preferencesUrl":  "…",                     // optional; stub default
  "unsubscribeUrl":  "…"                      // optional; stub default
}
```

Event types and their extra fields follow the comment block in `digest.html`:

| Type                     | Extra fields                       |
|--------------------------|------------------------------------|
| `submission_confirmed`   | —                                  |
| `verified_badge_applied` | —                                  |
| `verified_badge_removed` | —                                  |
| `profile_withdrawn`      | `reason` (required)                |
| `new_comment`            | `commenter`, `preview` (optional)  |
| `voting_opened`          | —                                  |
| `results_published`      | —                                  |

### Rendering pipeline (`render.js`)

1. `Handlebars.registerHelper('eq', (a, b) => a === b)` — required by the template.
2. Load `digest.html`, compile once.
3. `hydrate(fixture)` derives `summary` (totals, plural flags, period strings) and
   `preheader` if the fixture didn't specify them. This keeps fixtures focused on the
   interesting variation and avoids drift between `totalEvents` and the actual event
   list.
4. Compile + render → HTML string.
5. `buildSubject(data)` → subject string, `data.preheader` → preheader string.

### Subject / preheader builder (`subject.js`)

Mirrors the comment block at the top of `digest.html`, not the TRD:

- **N = 1**: `Ekklesia — {humanized type}: {proposal or vote title}`
  (Vote title is used for `voting_opened` and `results_published`; proposal title
  otherwise.)
- **N ≥ 2**: `Ekklesia digest — {N} update(s) ({period})`
- **Preheader**: `{N} updates across {M} vote(s) from the last {periodVerbose}`

The `platformName` is a parameter (defaults to `"Ekklesia"`) so the same harness can
test a white-label deployment. No truncation, no locale fallback, no ICU plurals —
those arrive with the TRD feature.

### Mailtrap integration (`mailtrap.js`)

- Endpoint: `POST https://sandbox.api.mailtrap.io/api/send/{MAILTRAP_INBOX_ID}`
- Auth:     `Authorization: Bearer {MAILTRAP_TOKEN}`
- Body:     `{ from: {email, name}, to: [{email}], subject, html, category }`
- `category` is set to the fixture name so messages are easy to filter in the inbox.

Chosen over Mailtrap SMTP + `nodemailer` because we already use `fetch` for Koios
and don't want another transport dep.

### Environment variables

The runner first calls the project's `helper/envLoader.js` (which loads
`.env.${NODE_ENV}` with a fallback to `.env`), then overlays `__emails/.env` with
`override: true` so test-harness credentials can live outside the docker-managed
`.env.development`. Copy `__emails/.env.example` to `__emails/.env` and fill in:

```
MAILTRAP_TOKEN=        # API token for the sandbox project
MAILTRAP_INBOX_ID=     # numeric inbox id from the Mailtrap UI
MAILTRAP_TO=           # recipient address to stamp on messages; any value works
                       # in sandbox mode (nothing actually delivers)
MAILTRAP_FROM=no-reply@ekklesia.test
MAILTRAP_FROM_NAME=Ekklesia (sandbox)
```

`__emails/.env` is git-ignored. If `MAILTRAP_TOKEN` or `MAILTRAP_INBOX_ID` is unset
the runner renders locally and skips the send — useful for pure-preview
iterations.

### Installing

The only new runtime dep is Handlebars:

```
npm install --save-dev handlebars
```

No changes to `package.json` are made by this plan doc — run the install when you
want to execute the suite.

### Running

```bash
# list available scenarios
node __emails/test.js

# render every scenario and push to Mailtrap
node __emails/test.js --all

# render a single scenario
node __emails/test.js --scenario=04-few-single-vote

# render locally only (no network call); writes to __emails/.rendered/
node __emails/test.js --all --preview
```

Each run writes `__emails/.rendered/<scenario>.html` so you can open it in a browser
alongside the Mailtrap inbox for side-by-side comparison.

### Test matrix — starter scenarios

| # | File                                  | Shape               | What it exercises                                           |
|---|---------------------------------------|---------------------|-------------------------------------------------------------|
| 1 | `01-single-submission-confirmed.json` | N=1, M=1            | Digest-of-one path; CTA alignment with minimal content      |
| 2 | `02-single-new-comment.json`          | N=1, M=1            | Optional `preview` blockquote rendering                     |
| 3 | `03-single-profile-withdrawn.json`    | N=1, M=1            | `reason` block with red accent border                       |
| 4 | `04-few-single-vote.json`             | N=3, M=1            | Multiple events stacked under one proposal; divider rules   |
| 5 | `05-few-many-votes.json`              | N=5, M=2            | Multi-vote header separator; per-vote card grouping         |
| 6 | `06-many-many-votes.json`             | N≈20, M=5           | Dense layout, long scroll, CTA repetition                   |
| 7 | `07-all-event-types.json`             | N=7, M=2            | Every badge color / copy variant at once                    |
| 8 | `08-long-titles.json`                 | N=2, M=1            | Long vote + proposal titles; subject-line sanity check      |

### Extending the matrix

When adding a scenario:
1. Drop a JSON file into `fixtures/` with a two-digit prefix that maintains running
   order (makes `--all` output scannable).
2. Include a `"scenario"` field describing what's being exercised — it's ignored by
   the renderer but surfaces when reading diffs.
3. Prefer the smallest payload that reproduces the variation. The hydrator derives
   `summary` + `preheader`; let it.
4. Once a fixture stabilizes, eyeball the rendered HTML in `.rendered/` and the
   Mailtrap delivery. If copy/layout needs changes, iterate on the template, not on
   the fixture — fixtures represent *data*, not desired output.

Candidates not in the starter set but worth adding before shipping:
- `09-unicode-content.json` — non-Latin titles, combining characters
- `10-bidi-injection.json` — title containing U+202E; asserts sanitizer strips it
  (will require wiring a sanitizer into `render.js` first)
- `11-zero-events.json` — should we even render or just refuse? (Product question.)
- `12-minimum-data.json` — omit every optional field; confirms hydrator defaults
- `13-long-reason-and-preview.json` — verifies blockquote width and wrapping

### Deferred work (track here until we have proper tickets)

- Wire the full TRD v0.3 subject generator (i18n, ICU plurals, platform-name config,
  78-codepoint truncation) and swap it in behind a flag.
- Add an HTML linter step (`html-validate` or similar) to each render.
- Consider a visual regression harness (Playwright screenshot against each
  rendered file) once the template stabilizes.
- Plain-text multipart generation — mail clients that prefer text/plain currently
  see nothing. Low priority while this is sandbox-only.
- Move the harness under `helper/` + a real test runner (Vitest) once the module
  grows a test story more broadly.