# F-003: Vote Search Builds a MongoDB Regex from Raw User Input

| Field | Value |
|-------|-------|
| **Severity** | High |
| **Finding ID** | F-003 |
| **Category** | Input validation / query safety |
| **Status** | Open |

## Affected Files

- `routes/api/v0/votes.js:94-106`

## Observation

When the vote search input is not an ObjectId, the route passes raw user input directly into MongoDB as a case-insensitive regex.

## Risk

Crafted regex input can cause expensive query evaluation and create a denial-of-service risk on vote search.

## Recommendation

Escape regex metacharacters before query construction, cap search length, or move search to an indexed text-search implementation.

## Current Status

Open. The vote search path still passes raw `searchTerm` into MongoDB `$regex`.
