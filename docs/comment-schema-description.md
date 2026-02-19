# Comment and CommentLike schema – field reference

---

| Field              | Detail                                                                                                  |
|--------------------|---------------------------------------------------------------------------------------------------------|
| **Document Title** | Comment & CommentLike Schema – Field Reference                                                          |
| **Version**        | 0.1.1                                                                                                   |
| **Created**        | February 18, 2026                                                                                       |
| **Last Revised**   | February 19, 2026                                                                                       |
| **Companion Doc**  | [System Architecture Specification](system-architecture.md) · [API Specification](api-specification.md) |
| **Prepared By**    | Adam Dean · <adam@crypto2099.io>, Mad Orkestra · <mad@madorkestra.com>                                  |
| **Status**         | Draft                                                                                                   |

---

This document lists every **Comment** and **CommentLike** field:
**schema path**, **required** status, **type**, and **validation** notes.
Comments are attached to proposals; top-level comments have `parentId` null,
replies have `parentId` set to the parent comment’s `_id`. Likes are stored in a
separate **CommentLike** collection.
Implementations: [../schema/Comment.js](../schema/Comment.js), [../schema/CommentLike.js](../schema/CommentLike.js).

---

## Comment – top-level

| Field              | Schema path              | Required | Type                    | Validation / notes                                                                                |
|--------------------|--------------------------|----------|-------------------------|---------------------------------------------------------------------------------------------------|
| Proposal           | `proposalId`             | Yes      | ObjectId (ref Proposal) | The proposal this comment belongs to.                                                             |
| Parent             | `parentId`               | No       | ObjectId (ref Comment)  | Null or omitted for top-level comments; set to parent comment `_id` for replies.                  |
| Author             | `userId`                 | Yes      | String (ref User)       | Bech32 address of the comment author.                                                             |
| Content            | `content`                | Yes      | String                  | Comment body.                                                                                     |
| Status             | `status`                 | Yes      | enum                    | `live`, `withdrawnByAdmin`. API filter accepts `withdrawn` and maps it to `withdrawnByAdmin`.     |
| Withdrawal details | `withdrawalDetails`      | No       | Object                  | Present when status is `withdrawnByAdmin` (or when withdrawn by author, if supported). See below. |
| (timestamps)       | `createdAt`, `updatedAt` | —        | Date                    | Set by Mongoose `timestamps: true`.                                                               |

---

### withdrawalDetails (when present)

| Schema path                  | Required | Type   | Notes                                                                                |
|------------------------------|----------|--------|--------------------------------------------------------------------------------------|
| `withdrawalDetails.category` | —        | enum   | `"Inappropriate content"`, `"Spam"`, `"Policy violation"`, `"Duplicate"`, `"Other"`. |
| `withdrawalDetails.userId`   | —        | String | User who withdrew (admin or author).                                                 |
| `withdrawalDetails.comment`  | —        | String | Reason or free text.                                                                 |
| `withdrawalDetails.date`     | —        | Date   | When withdrawn.                                                                      |

---

## Comment – enums

| Schema path                  | Allowed values                                                                      |
|------------------------------|-------------------------------------------------------------------------------------|
| `status`                     | `live`, `withdrawnByAdmin`                                                          |
| `withdrawalDetails.category` | `"Inappropriate content"`, `"Spam"`, `"Policy violation"`, `"Duplicate"`, `"Other"` |

---

## CommentLike – top-level

Likes are stored in a separate collection. One document per user per comment;
duplicate likes are prevented by a unique compound index on
`(commentId, userId)`.

| Field        | Schema path              | Required | Type                   | Validation / notes                    |
|--------------|--------------------------|----------|------------------------|---------------------------------------|
| Comment      | `commentId`              | Yes      | ObjectId (ref Comment) | The comment that was liked.           |
| User         | `userId`                 | Yes      | String (ref User)      | Bech32 address of the user who liked. |
| (timestamps) | `createdAt`, `updatedAt` | —        | Date                   | Set by Mongoose `timestamps: true`.   |

**Indexes:** `(commentId, userId)` unique; `(commentId)` for counting likes per
comment.

---

## Related docs

- [api-specification.md](api-specification.md)
    -
    `GET /comments` - [API Specification §3.6](api-specification.md#36-get-comments)
    -
    `GET /comments/{commentId}` - [API Specification §3.7](api-specification.md#37-get-commentscommentid)
    -
    `GET /comments/{commentId}/replies` - [API Specification §3.8](api-specification.md#38-get-commentscommentidreplies)
    -
    `POST /comments` - [API Specification §5.5](api-specification.md#55-post-comments)
    -
    `PUT /comments/{commentId}` - [API Specification §5.6](api-specification.md#56-put-commentscommentid)
    -
    `POST /comments/{commentId}/like` - [API Specification §5.7](api-specification.md#57-post-commentscommentidlike)
    -
    `PUT /comments/{commentId}/withdraw` - [API Specification §5.8](api-specification.md#58-put-commentscommentidwithdraw)
- Schema implementations:
    - [../schema/Comment.js](../schema/Comment.js)
    - [../schema/CommentLike.js](../schema/CommentLike.js).

---

## Revision History

This document follows [Semantic Versioning 2.0.0](https://semver.org/). Version
numbers use the form **MAJOR.MINOR.PATCH**:

- **MAJOR** — Incompatible schema or field changes (e.g., renamed paths, removed
  fields).
- **MINOR** — Backwards-compatible additions (e.g., new fields, new status
  values).
- **PATCH** — Backwards-compatible fixes and clarifications (e.g., typo
  corrections, clarified wording).

| Version | Date       | Description                                                                            |
|---------|------------|----------------------------------------------------------------------------------------|
| 0.1.1   | 2026-02-19 | Grammar, cross-linking, and formatting updates.                                        |
| 0.1.0   | 2026-02-18 | Initial schema description: Comment and CommentLike, metadata block, revision history. |
