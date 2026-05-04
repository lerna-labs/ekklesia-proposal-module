# Notification System Foundations - Implementation Notes

## Overview

This document summarizes the first implementation pass of the dashboard notification system.  
Scope delivered:

- user can add an email on dashboard
- user can set notification schedule (`never`, `6h`, `daily`)
- user confirms email via magic-link flow

The implementation is foundation-first and intentionally does **not** include digest scheduling/dispatch yet.

## Backend Changes

### 1) User schema extension

Updated `schema/User.js` with a new `notification` subdocument:

- `notification.email` (confirmed email)
- `notification.pendingEmail` (awaiting confirmation)
- `notification.schedule` (`never | 6h | daily`)
- `notification.verifiedAt`
- `notification.verificationIssuedAt` (used as token `jti`)
- `notification.locale` (default `en`)
- `notification.unsubscribeSecret` (reserved for future unsubscribe flow)

### 2) New notifications API route

Added `routes/api/v0/notifications.js` with:

- `GET /api/v0/notifications`
  - returns current notification settings for authenticated user
- `PUT /api/v0/notifications`
  - updates schedule
  - updates pending email and issues verification token if email changes
  - sends verification email
- `POST /api/v0/notifications/resend`
  - re-issues and re-sends verification token for current `pendingEmail`
- `POST /api/v0/notifications/verify`
  - verifies magic-link token
  - confirms email by moving `pendingEmail -> email` and setting `verifiedAt`

Security/validation notes:

- requires `JWT_SECRET`
- email format validation via `validator.isEmail`
- token payload contains:
  - `purpose: "email-verify"`
  - `userId`
  - `email`
  - `jti` (timestamp from `verificationIssuedAt`)
- verify step enforces:
  - token `email` matches current `pendingEmail`
  - token `jti` matches current `verificationIssuedAt`
  - this invalidates old links when a new link is issued

### 3) Rate limiters

Extended `helper/rateLimiters.js`:

- `notificationsWriteLimiter` (10/min per authenticated user)
- `notificationsResendLimiter` (3/hour per authenticated user)
- `notificationsVerifyLimiter` (20/min per IP)

### 4) Mail transport abstraction

Added `mailer/transport.js` with a generic `send(...)` entrypoint.

Current supported provider:

- `EMAIL_PROVIDER=mailtrap` (Mailtrap API path via `__emails/mailtrap.js`)

This creates a clean path for future provider drivers (`smtp`, `ses`, `postmark`) without changing route call sites.

### 5) Transactional email rendering

Added transactional template and renderer:

- `__emails/transactional.html`
- `renderTransactional(...)` in `__emails/render.js`

Used for the magic-link email body with brand-aware styling via existing brand config.

### 6) Runtime dependency fix

Moved email rendering dependencies to runtime `dependencies` in `package.json`:

- `handlebars`
- `intl-messageformat`

Reason: `__emails/render.js` is imported in server runtime routes and failed on environments that install production deps only.

## Frontend Changes

### 1) Dashboard data load

Updated `__frontend/src/routes/(private)/dashboard/+page.js`:

- fetches `/notifications`
- passes result as `data.notification`

### 2) Dashboard UI integration

Updated `__frontend/src/routes/(private)/dashboard/+page.svelte`:

- imports and renders new `NotificationSettings` card near Account card

### 3) New notification settings component

Added `__frontend/src/lib/notifications/NotificationSettings.svelte`:

- email input
- schedule select (`Never`, `Every 6 hours`, `Daily`)
- status display:
  - Verified
  - Pending confirmation
  - Not configured
- save action -> `PUT /notifications`
- resend action -> `POST /notifications/resend`
- toast feedback for success/error and `emailSendFailed`

### 4) Public verification page

Added:

- `__frontend/src/routes/notifications/verify/+page.js`
- `__frontend/src/routes/notifications/verify/+page.svelte`

Behavior:

- reads `token` from query params
- posts token to `POST /notifications/verify`
- shows state-driven UX (success, invalid/expired, error)
- provides return path to dashboard

## Configuration Changes

Updated `.env.example` with notification/email fields:

- `FRONTEND_URL`
- `EMAIL_PROVIDER`
- `MAILTRAP_INBOX_ID`
- `MAILTRAP_TOKEN`
- `MAIL_FROM_EMAIL`
- `MAIL_FROM_NAME`
- `EMAIL_BRAND`

Branding note:

- existing brand file `__emails/branding/intersect.json` is supported via `EMAIL_BRAND=intersect`

## Non-goals (intentionally deferred)

Not part of this implementation:

- digest worker / cadence scheduler
- event capture pipeline (`NotificationEvent`)
- instant event emails
- suppression list/webhooks
- unsubscribe token flow
- provider drivers beyond Mailtrap API path

These are expected in the production roadmap phase.

## Files Added

- `routes/api/v0/notifications.js`
- `mailer/transport.js`
- `__emails/transactional.html`
- `__frontend/src/lib/notifications/NotificationSettings.svelte`
- `__frontend/src/routes/notifications/verify/+page.js`
- `__frontend/src/routes/notifications/verify/+page.svelte`
- `docs/notification-system-foundations-implementation.md`

## Files Updated

- `schema/User.js`
- `helper/rateLimiters.js`
- `__emails/render.js`
- `__frontend/src/routes/(private)/dashboard/+page.js`
- `__frontend/src/routes/(private)/dashboard/+page.svelte`
- `.env.example`
- `package.json`
- `package-lock.json`

