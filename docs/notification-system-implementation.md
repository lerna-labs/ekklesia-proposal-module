# Ekklesia Proposal Module — Notification System (Implementation)

---

| Field              | Detail                                                                 |
|--------------------|------------------------------------------------------------------------|
| **Document Title** | Notification System (Implementation)                                  |
| **Version**        | 0.1.0                                                                  |
| **Created**        | May 4, 2026                                                            |
| **Last Revised**   | May 4, 2026                                                            |
| **Companion Doc**  | [System Architecture](system-architecture.md) · [User Schema](user-schema-description.md) · [Vote Schema](vote-schema-description.md) |
| **Prepared By**    | Adam Dean · <adam@crypto2099.io>, Mad Orkestra · <mad@madorkestra.com> |
| **Status**         | Draft                                                                  |

---

## Table of Contents

- [Ekklesia Proposal Module — Notification System (Implementation)](#ekklesia-proposal-module--notification-system-implementation)
    - [Table of Contents](#table-of-contents)
    - [1. Purpose \& Scope](#1-purpose--scope)
    - [2. User Settings \& Eligibility](#2-user-settings--eligibility)
    - [3. Event Catalog](#3-event-catalog)
    - [4. Mail Pipeline](#4-mail-pipeline)
    - [5. Cron \& Dispatch](#5-cron--dispatch)
    - [6. Persistence](#6-persistence)
    - [7. HTTP API (Settings \& Verification)](#7-http-api-settings--verification)
    - [8. Environment \& Operations](#8-environment--operations)
    - [9. Dev Verification](#9-dev-verification)
    - [Related Docs \& Source Files](#related-docs--source-files)
    - [Revision History](#revision-history)

---

## 1. Purpose & Scope

This document describes the **current implementation** of notification emails in
the Proposal Module: which events exist, how they are triggered, how recipients
are chosen, how HTML is rendered, and how scheduled jobs flush queued work.

It complements high-level product notes and applies to the codebase under
[`mailer/`](../mailer/), [`routes/api/v0/notifications.js`](../routes/api/v0/notifications.js),
[`routes/api/v0/proposals.js`](../routes/api/v0/proposals.js),
[`routes/api/v0/comments.js`](../routes/api/v0/comments.js), and
[`cron/notification-milestones.js`](../cron/notification-milestones.js).

**In scope:** email-backed notifications (submission, withdrawal, comments,
vote milestones), user notification preferences, verification email for the
notification address, Mailtrap-based transport.

**Out of scope for this doc:** push or in-app notifications; per-event toggles
beyond schedule and verified email; detailed frontend UX for the notifications
dashboard.

---

## 2. User Settings & Eligibility

Notification preferences live on [`User.notification`](../schema/User.js):

| Path                              | Role |
|-----------------------------------|------|
| `notification.email`              | Active delivery address (lowercased). |
| `notification.pendingEmail`       | Address awaiting verification. |
| `notification.verifiedAt`         | When `email` was confirmed; required for **broadcast** notification sends. |
| `notification.schedule`         | `never` \| `6h` \| `daily` (default **`daily`**). |
| `notification.lastCommentDigestSentAt` | Throttle anchor for comment digest sends. |
| `notification.locale`            | Mail catalog locale (e.g. `en`). |
| `notification.unsubscribeSecret` | Reserved for signed unsubscribe links (helper exists; flow may be partial). |

**Instant/broadcast emails** (everything except the verification magic link) use
[`mailer/notificationDispatch.js`](../mailer/notificationDispatch.js):

- Require **`notification.email`** and **`notification.verifiedAt`**.
- If **`schedule === "never"`**, instant sends are **skipped**, except
  **proposal withdrawn by admin**, which uses **`bypassScheduleNever`** so the
  proposer still receives the withdrawal notice.

**Comment digests** only run for users whose schedule is **`6h`** or **`daily`**
(missing or null schedule is treated like digest-eligible in queries).

---

## 3. Event Catalog

| Event | Trigger | Timing | Primary recipient(s) | Implementation notes |
|-------|---------|--------|----------------------|----------------------|
| **Submission confirmed** | Proposal created or updated **draft → live** | In-request, after save | Proposer | [`sendSubmissionConfirmedNotification`](../mailer/notificationDispatch.js): POST create with `status === "live"`; PUT when `previousStatus === "draft"` and `status === "live"`. |
| **Proposal withdrawn (admin)** | `PUT /proposals/:id/withdraw` when actor is **vote admin** (not proposer) | In-request, after save | Proposer | [`sendProposalWithdrawnNotification`](../mailer/notificationDispatch.js): includes category (`reason`) and admin comment; **`bypassScheduleNever: true`**. |
| **New comment** | `POST /comments` on a live proposal | **Not** sent inline; row queued then cron | Proposer | [`queueCommentNotificationEvent`](../mailer/notificationDispatch.js); skipped when commenter is proposer. |
| **Voting opened** | Cron finds votes with `votingStartDate <= now` and no dispatch flag | Cron | All users passing eligibility in [`listEligibleUsersForMilestones`](../mailer/notificationDispatch.js) | Instant template, event type `voting_opened`. |
| **Results published** | Cron finds votes with `resultsPublishedAt` set, `<= now`, and no dispatch flag | Cron | Same milestone fan-out | Event `results_published`; CTA URL prefers `Vote.resultsUrl`, then `votingUrl`, then vote page. |

Transaction-style **“verify your email”** messages are sent from
[`routes/api/v0/notifications.js`](../routes/api/v0/notifications.js) when the
user adds or changes an address; they are **not** part of the event table above
and intentionally bypass schedule suppression.

---

## 4. Mail Pipeline

| Layer | Responsibility |
|-------|----------------|
| **Rendering** | [`mailer/render.js`](../mailer/render.js): `renderInstantDigestFromPayload` (single event, subject from `subject.instant.*`), `renderDigestFromPayload` (multi-event digest layout + [`buildSubject`](../mailer/subject.js)), `renderTransactional` (verification and similar). |
| **i18n** | [`mailer/i18n/`](../mailer/i18n/en.json) — event copy and subjects. |
| **Branding** | [`mailer/branding/`](../mailer/branding/) — merged with defaults; `EMAIL_BRAND` env selects pack (e.g. `intersect`). |
| **Transport** | [`mailer/transport.js`](../mailer/transport.js) — `EMAIL_PROVIDER` (default **`mailtrap`**); requires `MAILTRAP_INBOX_ID` and `MAILTRAP_TOKEN` for sends. |
| **Unsubscribe URL** | [`helper/notificationUnsubscribe.js`](../helper/notificationUnsubscribe.js) — signed URLs merged into rendered fixtures where applicable. |

Mail failures in HTTP handlers are **logged**; API responses still succeed if the
save succeeded.

---

## 5. Cron & Dispatch

[`cron/notification-milestones.js`](../cron/notification-milestones.js) loads
environment, connects to MongoDB, and runs [`runNotificationCron`](../mailer/cronRunner.js),
which delegates to [`runNotificationDispatch`](../mailer/notificationDispatch.js).

`runNotificationDispatch` runs **in parallel**:

1. **`runVoteMilestoneDispatch`** — voting-open and results-published sweeps; sets
   `Vote.notificationDispatch.votingOpenedSentAt` / `resultsPublishedSentAt` after
   processing each qualifying vote (see schema).
2. **`runCommentDigestDispatch`** — for each eligible user, if the user’s
   `schedule` interval has passed since `lastCommentDigestSentAt`, loads pending
   [`CommentNotificationEvent`](../mailer/commentNotificationEvent.js) rows,
   groups them into the digest tree, sends **one** digest email, marks events
   `sent`, and updates `lastCommentDigestSentAt`.

Recommended cadence: run the cron every **1–5 minutes** (or as operational policy
dictates). Heavy milestone fan-out should respect provider rate limits.

---

## 6. Persistence

| Store | Path / model | Purpose |
|-------|--------------|---------|
| **Vote** | `notificationDispatch.votingOpenedSentAt`, `notificationDispatch.resultsPublishedSentAt` | Idempotency for milestone emails. |
| **Vote** | `resultsPublishedAt`, `resultsUrl`, `votingUrl` | Results milestone detection and link targets. |
| **CommentNotificationEvent** | Collection `commentNotificationEvents` | One document per `commentId` (unique); `status` `pending` \| `sent`; upsert on queue. |

Indexes on comment events support recipient + status + time window queries.

---

## 7. HTTP API (Settings & Verification)

[`GET/PUT /api/v0/notifications`](../routes/api/v0/notifications.js) — authenticated;
returns or updates email, schedule, and verification-related fields.

Additional routes cover verification token handling, resend limits, and
unsubscribe (rate-limited). Verification emails use **`renderTransactional`** with
`transactionalType: "verify_email"` and **`showUnsubscribe: false`**.

---

## 8. Environment & Operations

| Variable | Usage |
|----------|--------|
| `FRONTEND_URL` | Base for proposal/vote links and dashboard URLs in fixtures. |
| `MAIL_FROM_EMAIL`, `MAIL_FROM_NAME` | From header. |
| `EMAIL_BRAND` | Brand JSON name under `mailer/branding/`. |
| `EMAIL_PROVIDER` | Mail backend (`mailtrap` default). |
| `MAILTRAP_INBOX_ID`, `MAILTRAP_TOKEN` | Required for sending via Mailtrap API. |
| `JWT_SECRET` | Required for notification verification tokens (`routes/api/v0/notifications.js`). |

---

## 9. Dev Verification

[`mailer/dev-tests/email-events.test.js`](../mailer/dev-tests/email-events.test.js)
renders the supported **event** fixtures (instant path for proposal/vote
milestones; digest path for aggregated comments) and optionally sends a few
samples to Mailtrap, with **`MAILTRAP_SEND_COOLDOWN_MS`** (default 1100 ms)
between API calls to reduce HTTP 429 responses.

Run from repository root:

```bash
node mailer/dev-tests/email-events.test.js
```

---

## Related Docs & Source Files

- [system-architecture.md](system-architecture.md)
- [user-schema-description.md](user-schema-description.md) — extend with
  `notification` subdocument when documenting User fields in detail
- [vote-schema-description.md](vote-schema-description.md) — `notificationDispatch`,
  `resultsPublishedAt`, URLs
- [api-specification.md](api-specification.md) — proposal and comment routes
- Implementation hub: [`mailer/notificationDispatch.js`](../mailer/notificationDispatch.js)

---

## Revision History

This document follows [Semantic Versioning 2.0.0](https://semver.org/). Version
numbers use the form **MAJOR.MINOR.PATCH**:

- **MAJOR** — Behavior or architecture described is no longer accurate in a breaking way.
- **MINOR** — New events, routes, or env vars documented.
- **PATCH** — Clarifications, typos, cross-links.

| Version | Date       | Description |
|---------|------------|-------------|
| 0.1.0   | 2026-05-04 | Initial implementation overview: eligibility, event catalog, mailer, cron, persistence, API surface, env, dev test script. |
