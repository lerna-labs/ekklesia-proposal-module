# Email notifications

This directory holds the candidate-facing email notification template, a
brand-configurable render pipeline, and a sandbox test harness for iterating on
visuals before anything is wired into the running module.

Today this is a **harness**: it compiles the template, hydrates a fixture,
builds a subject line, and ships the result to a Mailtrap sandbox inbox.
Nothing here is invoked by `server.js`, and no route in `routes/api/v0/`
produces a notification yet. The platform-side wiring described below is a
design sketch for the feature this harness is meant to support — the sections
flagged **TODO** are work items, not existing code.

## Layout

```
__emails/
├── digest.html          # Handlebars template (the unit under test)
├── render.js            # compile + hydrate + brand-merge + i18n + subject
├── subject.js           # TRD-shaped subject / preheader builder (digest only)
├── i18n.js              # locale-aware translator factory (ICU MessageFormat)
├── mailtrap.js          # fetch-based sandbox client
├── test.js              # CLI entry point (list / render / send)
├── branding/
│   ├── default.json     # Ekklesia palette, fonts, footer copy
│   └── intersect.json   # Intersect Hydra Voting white-label (matches SvelteKit UI)
├── i18n/
│   └── en.json          # Reference translation catalog (add <tag>.json to localize)
├── fixtures/            # Per-scenario JSON payloads
├── TEST-PLAN.md         # Rendering-pipeline spec & test matrix
└── .rendered/           # (gitignored) HTML previews from the last run
```

Related docs:
- `TEST-PLAN.md` — rendering-pipeline spec, test matrix, deferred work.
- `docs/api-specification.md` — existing module routes the notification
  triggers will hang off of.

TRD v0.3 (Email Subject Line Generation) is the authoritative spec the
subject catalog is shaped against. The digest subject + body paths here
already read from the TRD-shaped catalog; instant-mode dispatch, the
78-codepoint truncation algorithm, the full sanitization pipeline, and
per-locale platform-name overrides are deferred — see `TEST-PLAN.md`
"Deferred work" for the current list.

## Customizing for a deployment

`digest.html` reads every color, the font stack, the platform name, the
optional header logo, and the footer copy from `data.brand`. `render.js`
loads `branding/default.json`, deep-merges any override on top, and passes
the result to Handlebars as `brand`.

### Brand schema

```jsonc
{
  "platformName": "Ekklesia",
  "logo": {
    "url":    "https://cdn.example/logo@2x.png",   // "" = text-only header
    "alt":    "Ekklesia",
    "height": 24                                   // px; width auto
  },
  "fontFamily": "-apple-system,BlinkMacSystemFont,'Segoe UI',...",
  "colors": {
    "bodyBackground":     "#f4f5f7",
    "cardBackground":     "#ffffff",
    "headerBackground":   "#0f1419",
    "headerText":         "#ffffff",
    "headerMuted":        "#9aa3ad",
    "text":               "#1a1d24",
    "textSecondary":      "#5a6270",
    "textMuted":          "#9aa3ad",
    "labelText":          "#7a8290",
    "divider":            "#e4e7eb",
    "proposalBackground": "#f9fafb",
    "proposalBorder":     "#eef0f3",
    "footerBackground":   "#fafbfc",
    "link":               "#1e429f",
    "ctaBackground":      "#1a1d24",
    "ctaText":            "#ffffff"
  },
  "footer": {
    "tagline":       "Ekklesia Proposal Module · Built by Ekklesia Voting Tech",
    "automatedNote": "Automated notification — replies to this address are not monitored."
  }
}
```

Overrides can be a full file or a partial patch — `render.js` deep-merges, so
a white-label deployment that only wants a new accent color + platform name
ships a 5-line JSON (see `branding/intersect.json`).

### Where the brand does NOT apply

Badge colors (`CONFIRMED`, `VERIFIED`, `UNVERIFIED`, `WITHDRAWN`, `COMMENT`,
`VOTING OPEN`, `RESULTS`) are intentionally hardcoded in the template. They
carry semantic meaning across deployments and should not drift with brand.
If a deployment can't tolerate them, fork the template — don't dilute the
convention.

### Picking a brand at runtime

```bash
# CLI flag (wins over env)
node __emails/test.js --all --preview --brand=intersect
node __emails/test.js --all --preview --brand=/abs/path/to/brand.json

# or via __emails/.env
EMAIL_BRAND=intersect
```

### Comparing themes side-by-side

Rendered files are named `<scenario>.<brand>.html`, so multiple brand outputs
for the same fixture can live alongside each other in `.rendered/`. Use
`--brands=` (plural) to fan out in a single invocation:

```bash
# pick a specific set
node __emails/test.js --all --preview --brands=default,intersect

# render every brand under branding/ against every fixture
node __emails/test.js --all --preview --brands=all

# or just one scenario across every brand (quick visual diff)
node __emails/test.js --scenario=07 --preview --brands=all
```

Open the resulting files in two browser tabs (or a preview pane) side-by-side
to eyeball how each theme lands on the same content.

From code:

```js
import { renderDigest } from "./__emails/render.js";

const { html, subject, preheader } = await renderDigest(fixturePath, {
  brand:  "intersect",                        // branding/intersect.json
  locale: "en",                               // i18n/en.json
  // brand: "/etc/ekklesia/brand.json",  // absolute path
  // brand: { colors: { link: "#f00" }}, // partial object literal
});
```

## Translations (i18n)

Every user-visible string in the body and subject lives in a per-locale JSON
catalog under `__emails/i18n/<tag>.json`. The template contains no literal
English copy — `render.js` pre-resolves every key via `createTranslator(locale)`
and hands the results to Handlebars as `data.t.*` / `event.badgeLabel` /
`event.headline`. ICU MessageFormat (via `intl-messageformat`) handles CLDR
plurals and variable substitution.

### Key shape

- `subject.*` — TRD v0.3 Appendix A shape, shared between digest and
  (eventual) instant dispatch. Example:
  `"subject.digest.multi.single_vote": "{platformName} digest — {N, plural, one {# update} other {# updates}} on {voteName} ({period})"`.
- `body.*` — chrome + per-event copy. `body.summary`,
  `body.event.<type>.headline`, `body.cta.view_proposal`, etc.
- `preheader.default` — the hidden preview text.

See `i18n/en.json` for the complete reference catalog.

### Adding a locale — contributor workflow

Drop `i18n/<tag>.json` (e.g. `es.json`, `ja.json`, `fr-CA.json`) modeled on
`en.json`, translate the values (keys stay identical), and render it
alongside English so you can eyeball that the layout and plurals hold up:

```bash
# 1. start from the reference catalog
cp __emails/i18n/en.json __emails/i18n/es.json

# 2. translate values in es.json — keys must stay exactly as in en.json

# 3. render your locale + English side-by-side for every fixture
node __emails/test.js --all --preview --locales=en,es
```

Every render is written to `__emails/.rendered/<scenario>.<brand>.<locale>.html`,
so `07-all-event-types.default.en.html` and `07-all-event-types.default.es.html`
live next to each other — open both in browser tabs to compare.

Other useful invocations:

```bash
# One locale, all scenarios
node __emails/test.js --all --preview --locale=es

# Every locale currently in i18n/, against one scenario
node __emails/test.js --scenario=07 --preview --locales=all

# Full visual matrix: every brand × every locale
node __emails/test.js --scenario=07 --preview --brands=all --locales=all
```

Partial catalogs are fine. Fallback chain per TRD §4.6 SL-051: requested tag
→ base language → `en`. Missing keys fall through **per key**, so a catalog
that only translates the summary line + footer still produces a valid email.
Unresolved keys log `[i18n] missing key "…"` once each and render as
`[[body.something.missing]]` in the output so gaps surface loudly during
development.

### HTML in catalog patterns

A handful of keys embed `<strong>` tags in the pattern (`body.summary`,
`body.footer.receiving_note`, `body.event.new_comment.headline`). Translators
must preserve the tags — they may be repositioned to fit natural word order,
but must wrap the same logical value. The translator passes
`{ ignoreTag: true }` to `intl-messageformat` so tags are treated as literal
HTML rather than rich-text components. String arguments are HTML-escaped
before substitution, so a commenter named `<script>alert(1)</script>` cannot
break out of the strong. The template reads these values via triple-brace
Handlebars (`{{{t.summary}}}`) to preserve the intentional markup.

Plain-text contexts (subject, preheader) call `t.raw(...)` which skips
HTML escaping — so `&` stays as `&` in subject headers, not `&amp;`.

### What to translate

Everything in `en.json`, plus proper noun handling per the TRD:

- **`platformName`** is NOT in the catalog — it comes from deployment brand
  config and may or may not need localization per brand (see
  `branding/<name>.json` per TRD §3.3).
- **Badge labels** (`CONFIRMED`, `VERIFIED`, etc.) are ALL-CAPS in English
  but `text-transform: uppercase` in CSS is meaningful only in Latin
  scripts. Translators supply the final rendered form — no CSS transform is
  applied.
- **Timestamps** are currently passed through as fixture strings. Production
  will format them per-locale via `Intl.DateTimeFormat`; `en.json` would
  then not include timestamp strings.

### Contributor workflow

A new locale is a self-contained, reviewable PR: one file, one pair of
before/after rendered previews (`--locale=<new-tag>` vs `--locale=en`), no
code changes. Good shape for outside-contributor work when that path opens.

## Integration into the platform (TODO — design sketch)

Nothing below is implemented yet. This section describes the shape the feature
should take so the harness stays aligned with where it's headed.

### Schema additions

1. **User.email, User.emailVerified, User.locale** — `schema/User.js` currently
   has no contact field. Add email capture on first login or via a dedicated
   preferences endpoint. Locale follows the TRD (BCP 47; `en` default).
2. **User.notificationPreferences** — `{ cadence: "6h" | "24h" | "never" }`.
   "never" short-circuits digest generation entirely.
3. **NotificationEvent collection** — trigger-table rows, one per occurrence:
   `{ userId, proposalId?, voteId?, type, payload, createdAt, dispatchedAt? }`.
   Indexed on `(userId, dispatchedAt)` so the digest worker can stream
   undispatched rows per user.
4. **NotificationSuppression** — unsubscribes, bounces, complaints. A row here
   hard-stops future sends to that address regardless of preferences.

### Write paths — where events are produced

Each domain route emits a `NotificationEvent` as a side effect of the action
that triggered it. Keep the emit **after** the primary write commits so a
failed insert never rolls back governance data.

| Event type                 | Producer                                           |
|----------------------------|----------------------------------------------------|
| `submission_confirmed`     | `helper/verifyDeposit.js` (deposit confirmation)   |
| `verified_badge_applied`   | admin route that toggles `proposal.verified`       |
| `verified_badge_removed`   | same admin route, inverse branch                   |
| `profile_withdrawn`        | `routes/api/v0/proposals.js` withdraw-by-admin     |
| `new_comment`              | `routes/api/v0/comments.js` POST handler           |
| `voting_opened`            | timer/cron crossing `Vote.startDate`               |
| `results_published`        | admin or scheduled results-publish action          |

Helper suggestion: a single `helper/notifications.js` with one exported
function per event type (`recordNewComment(...)`, `recordVotingOpened(...)`)
keeps producers from reaching into Mongo directly and gives us a single place
to add sanitization, rate limiting, and dedupe.

### Dispatch paths — timer vs one-off

Two modes, reflecting the TRD:

**Digest (timer-driven, 6h and 24h).** A worker picks up undispatched events
per user, groups them by user → vote → proposal, rehydrates via the existing
`render.js`, and sends one email. Candidates for the timer:

- `node-cron` in-process. Simplest, fine for single-node deploys. Runs on two
  schedules, `0 */6 * * *` and `0 0 * * *`, each honoring the matching user
  preference.
- External cron / PM2 `cron_restart` hitting an HTTP endpoint. Operationally
  clearer; survives process restarts without re-firing.
- A queue (BullMQ, Agenda) if/when volume or retry semantics warrant it.

The digest worker MUST:
1. Run in a single leader per cadence (lock on Mongo, or a PM2 `instances: 1`
   worker). Otherwise two processes wake up, both send, candidates get dupes.
2. Claim events atomically: set `dispatchedAt` **before** the send, reset on
   failure with a retry count. A crash between send and ack otherwise looks
   like a missed digest; a bare `await sendMail` with no state change looks
   like a repeat digest.
3. Skip users with `cadence: "never"` or with a suppression row.
4. Emit zero emails when a user's window has no events. `summary.totalEvents
   === 0` is never a valid send — it's a bug to reach the template with one.

**Instant (event-driven, not rendered by this harness yet).** Per the TRD,
`profile_withdrawn`, `verified_badge_removed`, `voting_opened`, and
`results_published` are high-urgency and dispatched immediately. The producer
emits the event *and* enqueues an instant send. A second template
(`instant.html`, not yet written) renders those; the digest worker ignores
events that have already been dispatched as instant.

### Service surface

A small module boundary keeps the producer code clean:

```
helper/notifications.js
  recordEvent(userId, type, payload)            // writes NotificationEvent
  sendDigestForUser(userId, period)             // called by the cron worker
  sendInstant(userId, type, payload)            // called inline by producer
  suppress(email, reason)                       // bounce/complaint handler
```

`sendDigestForUser` is the code path that actually reaches into `__emails/`
(eventually promoted to `helper/emails/`). It:

1. Loads `NotificationEvent` rows for the user/window that are not yet
   dispatched.
2. Joins Vote + Proposal for display data.
3. Builds the render context matching the shape in `digest.html`'s comment
   block.
4. Calls `renderDigest(..., { brand })`.
5. Hands off to whichever transport provider the deployment configured
   (see below), then marks events dispatched on success.

### Transport

The harness uses Mailtrap sandbox because it's the lowest-friction way to
eyeball rendering. Production needs an actual provider. The call site is one
function (`sendToMailtrap`) — swap it for an interface with one method
(`send({ from, to, subject, html, text, headers })`) and provide an
implementation per transport.

Candidates and tradeoffs:

| Provider            | Pros                                      | Cons                                   |
|---------------------|-------------------------------------------|----------------------------------------|
| AWS SES             | Cheap at scale, strong reputation control | More ops overhead; region-bound        |
| Postmark            | Best-in-class deliverability / analytics  | Pricier; aimed at transactional only   |
| Mailgun             | Flexible routing, EU region option        | Suspension risk on sandbox tiers       |
| SMTP via nodemailer | No vendor lock                            | You own the reputation problem         |

Whichever one, the deployment SHOULD configure SPF, DKIM, and DMARC for the
`From` domain. Without DKIM, digest mail from white-label deployments will
silently land in spam in Gmail/Outlook.

## Configuration

Harness env vars are loaded by `test.js` — first the project's
`helper/envLoader.js` (`.env.${NODE_ENV}` with `.env` fallback), then
`__emails/.env` with `override: true`.

| Var                  | Purpose                                                    |
|----------------------|------------------------------------------------------------|
| `MAILTRAP_TOKEN`     | API token for the sandbox project                          |
| `MAILTRAP_INBOX_ID`  | Numeric inbox id from the Mailtrap UI                      |
| `MAILTRAP_TO`        | Recipient stamp (any value — nothing actually delivers)    |
| `MAILTRAP_FROM`      | Envelope sender for sandbox messages                       |
| `MAILTRAP_FROM_NAME` | Display name                                               |
| `EMAIL_BRAND`        | Brand-name or path; overridden by `--brand=…` on the CLI   |

Production env vars (TODO, once the transport is picked):

```
EMAIL_PROVIDER=ses|postmark|mailgun|smtp
EMAIL_FROM=no-reply@voting.example
EMAIL_FROM_NAME="Ekklesia"
EMAIL_REPLY_TO=                    # optional; most deployments leave blank
EMAIL_BRAND=default                # resolves against __emails/branding/
EMAIL_UNSUBSCRIBE_SECRET=          # HMAC key for unsubscribe tokens
```

## Running the harness

```bash
# one-time
npm install --save-dev handlebars

# list fixtures
node __emails/test.js

# render + push to Mailtrap
node __emails/test.js --all

# render only (no send) — writes to __emails/.rendered/
node __emails/test.js --all --preview

# render one scenario with a brand override
node __emails/test.js --scenario=07-all-event-types --preview --brand=intersect
```

## Pitfalls and gotchas

Things to keep in mind before shipping — and before any of the integration
above gets written.

### Rendering & template

- **Inline styles are non-negotiable.** Gmail strips `<style>` blocks in most
  contexts; Outlook strips more. Any visual change must live inline. The
  template uses inline styles throughout for that reason. Do not "refactor
  into classes."
- **Outlook ignores `border-radius` and several modern properties.** The card
  will render with square corners in Outlook desktop — this is expected and
  should stay acceptable. Don't chase it with VML conditional comments unless
  product pushes back.
- **CTA buttons are `<td>`-wrapped anchors, not styled buttons.** Outlook
  treats `<button>` erratically; the table cell is the only reliable way.
- **`brand.footer.tagline` / `automatedNote` are HTML-escaped.** Store real
  unicode (`·`, `—`) in the JSON, not entity references. If you need HTML in
  the footer later, switch those two bindings to triple-brace `{{{...}}}` and
  sanitize at config-load time.
- **No plain-text multipart.** Mail clients that prefer text (some CLIs, some
  accessibility tools) currently see nothing. Low priority while sandbox-only,
  but a blocker before production.
- **Preheader uses the body background color to hide itself.** If a brand's
  `bodyBackground` is white, the preheader becomes legible white-on-white
  (fine) but any brand with a dark `bodyBackground` needs the preheader's
  `color` to match — the template already binds both, so this Just Works, but
  it's worth knowing if a renderer ever forks.

### Data & subject line

- **Subject generator is partially TRD-compliant.** Digest subjects now read
  from `subject.*` catalog keys with ICU plurals and the locale-fallback
  chain, matching TRD v0.3 Appendix A for the digest paths. Still deferred
  from the TRD: instant-mode dispatch (`subject.instant.*` keys exist in the
  catalog but aren't invoked — no instant template yet), 78-codepoint
  truncation, the full sanitization pipeline (§4.5), and platform-name
  locale overrides (§3.3 / §4.7).
- **Bidi / zero-width / control characters.** User-supplied proposal and vote
  titles flow directly into both the subject and the HTML body. Sanitize at
  the producer boundary (strip U+202A–U+202E, U+2066–U+2069, other Cf; strip
  C0/C1 control; collapse whitespace). The harness does not sanitize — it
  trusts the fixture. Production must not.
- **HTML-escape everything user-supplied.** Handlebars' default `{{ }}` does
  this, but any future use of `{{{ }}}` for a user-controlled field is an
  injection vector. Audit every triple-brace before merging.
- **Comment previews get truncated silently.** `preview` is displayed as-is;
  a producer that dumps the entire comment body will blow the layout. Cap at
  ~200 chars at the producer and add an ellipsis.

### Dispatch & delivery

- **Digest cadence drift.** A cron that runs every 6h can fire at 0, 6, 12,
  18 UTC. A user who signs up at 05:59 sees their first digest at 06:00 with
  1 minute of content. This is fine, but expect support questions — document
  it in the in-app preferences UI.
- **Timezone handling.** `periodVerbose` is a fixed string ("6 hours",
  "24 hours"), not a wall-clock window. Event timestamps are rendered
  verbatim (`"2026-04-20 04:00 UTC"` in the fixtures) — format them in UTC at
  the producer, never in the user's local time. Mail clients can't be trusted
  to localize for you.
- **Idempotency is a Mongo ack problem, not an email problem.** If the SMTP
  send succeeds but the `dispatchedAt` write fails, the next cron cycle
  re-sends. The claim-before-send ordering in the dispatch notes above is
  load-bearing.
- **Unsubscribe tokens must be unforgeable.** Signed with an HMAC secret, not
  the plain user id. Add `List-Unsubscribe` and `List-Unsubscribe-Post`
  headers once a transport is chosen — Gmail now requires them for senders
  above ~5k/day.
- **Bounce handling is a silent feature.** Without a suppression list, a
  deactivated mailbox gets hit on every digest and the sender reputation
  tanks. Provider webhooks → `suppress(email, reason)` → no more sends.
- **Instant mode is not rendered yet.** The TRD describes 4 instant event
  types. The harness renders digest-only; once `instant.html` exists, wire
  both templates through the same `render.js` with the same brand plumbing
  so a deployment theme applies to both in one change.

### Operations

- **Brand config is trusted input.** `__emails/branding/*.json` is on-disk
  config, not user input. Validate at load time (schema / required keys,
  color-format check) so a typo fails fast instead of shipping an email with
  `color:;` on the CTA.
- **Template caching is process-local.** `render.js` caches the compiled
  template and default brand per-process. Editing `digest.html` or
  `branding/default.json` while the server is running requires a restart.
  Fine for production, occasionally surprising in dev.
- **No visual regression.** A template tweak can silently break a scenario
  nobody looks at. A Playwright screenshot pass over `.rendered/` comparing
  against a baseline directory is the cheapest backstop; worth adding before
  the template stabilizes.

## Future expansion

Ordered rough priority — highest-value first.

1. **Wire the producers.** Everything in the "Integration into the platform"
   section above. This is the gating work.
2. **Event-mapper refactor.** Move per-type badge/headline derivation out of
   the template into a small `events.js` so the template renders one generic
   `{badge, headline, detail?, cta?}` block. Admin-configurable future fields
   emit a stable `translationKey` + payload; the catalog owns copy, the
   template owns layout. Keeps the i18n story clean — new event types add
   catalog entries, not template branches.
3. **Instant template + dispatch.** Second Handlebars file, same brand +
   i18n plumbing, one event per email. `subject.instant.*` catalog keys
   already exist; just need the template and the dispatcher. TRD test cases
   T1–T4 become the fixtures.
4. **Finish TRD subject-generator parity.** 78-codepoint truncation
   (§4.4), full sanitization pipeline (§4.5), platform-name locale
   overrides (§4.7). Swap into `subject.js` behind a flag.
5. **Plain-text multipart.** Derive from the same render context; hand-tune
   a minimal layout in `digest.txt`.
6. **Suppression + bounce webhook.** Provider-dependent. Add a
   `helper/emails/suppression.js` + webhook endpoint.
7. **Locale catalogs beyond English.** `es.json`, `ja.json`, etc. —
   translators copy `en.json` and translate. Partial catalogs fall through
   to `en` per SL-051. No template changes required. Candidate surface for
   community contribution once the producer wiring lands.
8. **Template variants.** Dark mode (`prefers-color-scheme`); accessibility
   audit (contrast, alt text, landmark roles); RTL sample fixture.
9. **Promote to `helper/emails/`.** Once the feature is real, the `__emails/`
   prefix and test-plan-as-spec shape should graduate — harness under
   `__tests__/emails/` (Vitest), production code under `helper/emails/`,
   templates under `helper/emails/templates/`.
10. **Deployment branding delivery.** Currently brand config is a file on
    disk. A deployment may want it in env vars or a Mongo collection so ops
    can roll a new logo without a redeploy. Decide alongside the broader
    config-strategy question the TRD flags (§8 open question 5).
11. **Observability.** Per-send log line with `{userId, period, N, M,
    subject, provider, messageId, locale}`. A small Grafana panel off those.
    Bounces/complaints per 10k sends is the single metric worth alerting on.
