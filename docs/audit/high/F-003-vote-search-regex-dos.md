# F-003: Vote Search Builds a MongoDB Regex from Raw User Input

| Field | Value |
|-------|-------|
| **Severity** | High |
| **Finding ID** | F-003 |
| **Category** | Input validation / query safety |
| **Status** | Resolved |

## Affected Files

- `routes/api/v0/votes.js`
- `helper/escapeRegex.js`

## Observation

When the vote search input is not an ObjectId, the route previously passed raw user input directly into MongoDB as a case-insensitive regex.

## Risk

Crafted regex input can cause expensive query evaluation and create a denial-of-service risk on vote search.

## Recommendation

Escape regex metacharacters before query construction, cap search length, or move search to an indexed text-search implementation.

## Current Status

**Resolved.** Search terms are escaped via `helper/escapeRegex.js` before `$regex` queries, and terms over 100 characters are rejected (`MAX_SEARCH_LENGTH`). See `docs/audit/resolutions/F-003-resolution.md`.
