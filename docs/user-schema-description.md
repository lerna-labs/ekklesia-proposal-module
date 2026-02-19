# Ekklesia Budget Module — User Schema – Field Reference

---

| Field              | Detail                                                                  |
|--------------------|-------------------------------------------------------------------------|
| **Document Title** | User Schema – Field Reference                                           |
| **Version**        | 0.1.0                                                                   |
| **Created**        | February 19, 2026                                                       |
| **Last Revised**   | February 19, 2026                                                       |
| **Companion Doc**  | [Login Flow](login-flow.md) · [API Specification](api-specification.md) |
| **Prepared By**    | Adam Dean · <adam@crypto2099.io>, Mad Orkestra · <mad@madorkestra.com>  |
| **Status**         | Draft                                                                   |

---

This document lists every **User** field: **schema path**, **required** status,
**type**, and **validation** notes. A User record is created or updated on every
successful login. The `_id` is the user's Bech32 Cardano address (stake or
DRep), used as the primary key throughout the system — there is no separate
surrogate key. Roles (Proposer, DRep, Admin) are not stored on the User
document; they are derived at request time from the JWT `signType` and from
budget `admins` arrays.

Implementation: [../schema/User.js](../schema/User.js).

---

## Top-level (user root)

| Field      | Schema path | Required | Type   | Immutable | Validation / notes                                                                                                                                                                                                 |
|------------|-------------|----------|--------|-----------|--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| ID         | `_id`       | Yes      | String | Yes       | Bech32-encoded Cardano address (`stake1…` or `drep1…`). Set on creation; cannot be changed. Used as the foreign key in Proposal (`proposerId`), Comment (`userId`), CommentLike (`userId`), and Budget (`admins`). |
| Name       | `name`      | No       | String | No        | Display name resolved at login from the DRep registry (for DRep addresses) or ADA handle service (for stake addresses). May be absent if neither service returns a result. Updated on each successful login.       |
| Last login | `lastLogin` | No       | Date   | No        | Timestamp of the most recent successful authentication. Defaults to `Date.now` on creation; updated on every successful `PUT /session`.                                                                            |
| Created at | `createdAt` | —        | Date   | Yes       | Set by Mongoose `timestamps: true` on first save. Immutable.                                                                                                                                                       |
| Updated at | `updatedAt` | —        | Date   | No        | Set by Mongoose `timestamps: true` and updated by a `pre("save")` middleware hook on every save.                                                                                                                   |

---

## Schema notes

**`_id` as Bech32 address**

Unlike most Mongoose documents, `_id` here is a `String` (not an `ObjectId`).
This is intentional — the Bech32 address is the stable, globally unique
identifier for a Cardano wallet or DRep credential, and using it directly as the
primary key avoids the need for a separate lookup table. The consequence is that
`User` documents cannot be referenced via standard Mongoose ObjectId population;
consumers must join on the string `_id` manually.

**Role derivation**

The User collection does not store a `role` field. Roles are contextual and
derived at runtime:

| Role         | How determined                                                                    |
|--------------|-----------------------------------------------------------------------------------|
| **Proposer** | Any authenticated user who owns a Proposal (`proposal.proposerId === req.userId`) |
| **DRep**     | JWT `signType === "drep"`                                                         |
| **Admin**    | Authenticated user's `_id` appears in `budget.admins` for the relevant budget     |
| **Viewer**   | Unauthenticated (no JWT)                                                          |

**Display name resolution**

`name` is populated on successful login (`PUT /session`) by querying external
services:

- For `drep` sign type → DRep registry lookup
- For `stake` sign type → ADA handle service lookup

These calls are non-blocking; if neither service returns a result, the `User`
record is upserted without a `name`. The `name` field is updated on every
subsequent login if a value is resolved.

**`versionKey: false`**

Mongoose's default `__v` version key is disabled on this schema. Optimistic
concurrency control is not required for User documents as concurrent writes are
unlikely and last-write-wins is acceptable for display name and login timestamp
updates.

---

## Indexes

| Index   | Fields | Type   | Notes                                                            |
|---------|--------|--------|------------------------------------------------------------------|
| Primary | `_id`  | Unique | Default MongoDB `_id` index; `_id` is the Bech32 address string. |

No additional indexes are defined. Lookups are always by `_id` (Bech32 address),
which is covered by the primary index.

---

## Example User Document

```json
{
  "_id": "stake1ux9r7ej8vphv0mkzfm0k7xrtghq4rsk0hzlwcmdkve2ja4gzqmhkq",
  "name": "$alice",
  "lastLogin": "2026-02-19T10:30:00Z",
  "createdAt": "2026-01-15T08:00:00Z",
  "updatedAt": "2026-02-19T10:30:00Z"
}
```

```json
{
  "_id": "drep1ygcevxnpwdlep24c3ueznpk2lnll3t8ht6vupzjxmqrm87g9cxvq",
  "name": "DRep: Super Powerful DRep!",
  "lastLogin": "2026-02-19T09:15:00Z",
  "createdAt": "2026-02-01T12:00:00Z",
  "updatedAt": "2026-02-19T09:15:00Z"
}
```

---

## Related docs

- [login-flow.md](login-flow.md) — Full authentication flow including User
  upsert on `PUT /session`
- [api-specification.md](api-specification.md)
    - `GET /session` — Returns `userId` and `name` from the User record
    - `PUT /session` — Triggers User upsert after successful signature
      verification
- [budget-schema-description.md](budget-schema-description.md) — `admins` field
  references User `_id` values
- [proposal-schema-description.md](proposal-schema-description.md) —
  `proposerId` references User `_id`
- [comment-schema-description.md](comment-schema-description.md) — `userId`
  references User `_id`
- Schema implementation: [../schema/User.js](../schema/User.js)

---

## Revision History

This document follows [Semantic Versioning 2.0.0](https://semver.org/). Version
numbers use the form **MAJOR.MINOR.PATCH**:

- **MAJOR** — Incompatible schema or field changes (e.g. renamed paths, removed
  fields, breaking validation).
- **MINOR** — Backwards-compatible additions (e.g. new fields, new indexes, new
  constraints).
- **PATCH** — Backwards-compatible fixes and clarifications (e.g. typo
  corrections, clarified wording).

| Version | Date       | Description                                                                                                                       |
|---------|------------|-----------------------------------------------------------------------------------------------------------------------------------|
| 0.1.0   | 2026-02-19 | Initial schema description: field reference, schema notes on Bech32 _id and role derivation, indexes, examples, and related docs. |