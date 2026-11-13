---
layout: default
title: API Overview
description:
  The public HTTP surface of the Proposal Module: endpoints, parameters and
  conventions.
---

The Proposal Module exposes a REST API for reading vote cycles, proposals and
comments, and for acting on them as an authenticated wallet. It is independent
of the Ekklesia [Voting API](https://docs.ekklesia.vote/api/voting/): separate
service, separate database, separate session.

<div class="card-grid">

<a href="{{ '/api/authentication/' | relative_url }}" class="card">
<h3>Authentication</h3>
<p>Challenge, signature and session cookie, for single wallets and for multi-signature scripts.</p>
</a>

<a href="{{ '/api/spec/' | relative_url }}" class="card">
<h3>Interactive Specification</h3>
<p>Full OpenAPI specification with request and response schemas, examples and try-it-out.</p>
</a>

</div>

You can also download the [OpenAPI
YAML]({{ '/api/openapi.yaml' | relative_url }}) or the [Postman
collection]({{ '/downloads/' | relative_url }}) directly.

## Base URL

Every instance serves its own base URL, and all API endpoints are prefixed with
`/api/v0/`. Service status endpoints sit outside that prefix, directly under the
host.

## Conventions

**Identifiers.** Vote cycles, proposals and comments are identified by
24-character MongoDB object ids. Vote cycles can also be addressed by slug in
the same position. Users are identified by their bech32 credential, not by an
opaque id.

**Pagination.** List endpoints take `page` (default 1) and `limit` (default 10,
maximum 100), and return the page under `data` with a `meta` object:

```json
{
  "data": [],
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 0,
    "totalPages": 0,
    "hasNextPage": false,
    "hasPreviousPage": false
  }
}
```

**Errors.** Errors return a JSON body with a `status` of `"error"` and a
human-readable `message`. Validation failures on proposal writes add an `errors`
object keyed by field path, mirroring the shape the frontend renders.

**Duplicate parameters.** Passing the same filtering or sorting parameter twice
is rejected rather than silently resolved to one of the values.

**Optional authentication.** Several read endpoints accept a session but do not
require one. Signing in widens what they return: your own drafts, the non-public
fields of your own proposals, your withdrawn comments, and whether you have
liked a comment.

## Endpoints

### Service status

Outside the `/api/v0/` prefix.

| Method | Path             | Access | Description                            |
| ------ | ---------------- | ------ | -------------------------------------- |
| `GET`  | `/health`        | Public | Service status and version information |
| `GET`  | `/health/health` | Public | Liveness check for load balancers      |
| `GET`  | `/health/db`     | Public | Database connection status             |

### Session

| Method   | Path       | Access        | Description                             |
| -------- | ---------- | ------------- | --------------------------------------- |
| `POST`   | `/session` | Public        | Request a challenge to sign             |
| `PUT`    | `/session` | Public        | Submit the signature, receive a session |
| `GET`    | `/session` | Authenticated | Current session, name and admin cycles  |
| `DELETE` | `/session` | Authenticated | Log out and invalidate issued tokens    |

### Vote cycles

| Method | Path                  | Access | Description                             |
| ------ | --------------------- | ------ | --------------------------------------- |
| `GET`  | `/votes`              | Public | List cycles, with search and pagination |
| `GET`  | `/votes/{identifier}` | Public | One cycle, by id or by slug             |

### Proposals

| Method   | Path                       | Access            | Description                          |
| -------- | -------------------------- | ----------------- | ------------------------------------ |
| `GET`    | `/proposals`               | Public            | List proposals for a cycle           |
| `GET`    | `/proposals/{id}`          | Public            | One proposal in full                 |
| `POST`   | `/proposals`               | Authenticated     | Create a draft or submit a proposal  |
| `PUT`    | `/proposals/{id}`          | Proposer          | Update, creating a version when live |
| `DELETE` | `/proposals/{id}`          | Proposer          | Delete an own draft                  |
| `PUT`    | `/proposals/{id}/withdraw` | Proposer or admin | Withdraw a live proposal             |

`GET /proposals` requires a `vote` parameter naming the cycle. It also accepts
`proposer`, `search`, `sort`, `direction`, `page` and `limit`, plus whichever
filters that cycle declares, which always include `status`. Values for the
declared filters are validated against the cycle, so an unknown filter value is
an error rather than an empty page.

### Comments

| Method | Path                      | Access        | Description                           |
| ------ | ------------------------- | ------------- | ------------------------------------- |
| `GET`  | `/comments`               | Public        | Top-level comments on a proposal      |
| `GET`  | `/comments/{id}`          | Public        | One comment                           |
| `GET`  | `/comments/{id}/replies`  | Public        | Replies to a comment                  |
| `POST` | `/comments`               | Authenticated | Post a comment or a reply             |
| `PUT`  | `/comments/{id}`          | Author        | Edit, within 15 minutes of posting    |
| `POST` | `/comments/{id}/like`     | Authenticated | Toggle a like: 201 added, 200 removed |
| `PUT`  | `/comments/{id}/withdraw` | Vote admin    | Withdraw a comment with a reason      |

`GET /comments` requires a `proposal` parameter and sorts by `date`,
`replyCount` or `likeCount`. Comment responses carry the author's credential,
display name and role on that proposal, a reply count, a like count, and whether
the caller has liked it.

### Notifications

Email notification settings for the signed-in wallet.

| Method   | Path                         | Access        | Description                              |
| -------- | ---------------------------- | ------------- | ---------------------------------------- |
| `GET`    | `/notifications`             | Authenticated | Current settings                         |
| `PUT`    | `/notifications`             | Authenticated | Set the address and digest schedule      |
| `DELETE` | `/notifications/pending`     | Authenticated | Cancel an unconfirmed address change     |
| `POST`   | `/notifications/resend`      | Authenticated | Resend the confirmation email            |
| `POST`   | `/notifications/verify`      | Public        | Confirm an address with an emailed token |
| `POST`   | `/notifications/unsubscribe` | Public        | Unsubscribe with an emailed token        |

An address is never used until it is confirmed: it is held as a pending address,
and a confirmation link is emailed to it. The digest schedule is `never`, `6h`
or `daily`.

### Reference data

| Method | Path         | Access | Description                                |
| ------ | ------------ | ------ | ------------------------------------------ |
| `GET`  | `/countries` | Public | Country names and ISO 3166-1 alpha-2 codes |
| `GET`  | `/regions`   | Public | Region names                               |

### Share pages

| Method | Path                               | Access | Description                      |
| ------ | ---------------------------------- | ------ | -------------------------------- |
| `GET`  | `/share/votes/{slug}/{proposalId}` | Public | Link preview page for a proposal |

Returns a small HTML document carrying Open Graph and Twitter card metadata for
the proposal, then redirects to the proposal on the frontend. It is intended for
social and chat clients unrolling a link, not for API clients.

## Rate limits

Limits are applied per IP address. Exceeding one returns `429`.

| Endpoints                                         | Limit                     |
| ------------------------------------------------- | ------------------------- |
| `GET` on votes, proposals and comments            | 200 per minute            |
| `POST /session`                                   | 5 per minute              |
| `PUT /session`                                    | 10 per minute             |
| `GET /session`                                    | 60 per minute             |
| `DELETE /session`                                 | 20 per minute             |
| Authenticated proposal writes, likes, withdrawals | 10 per minute             |
| Comment writes                                    | 5 per minute, 20 per hour |
| Notification settings writes                      | 10 per minute             |
| Confirmation resend                               | 3 per hour                |
| Address confirmation and unsubscribe              | 20 per minute             |

## Stability

The API is versioned in its path and is at `v0`. Endpoints may change between
releases. Pin to a release of the module rather than tracking its default
branch, and check the
[changelog](https://github.com/lerna-labs/ekklesia-proposal-module/blob/main/CHANGELOG.md)
before upgrading.
