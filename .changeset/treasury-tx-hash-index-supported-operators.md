---
"proposal-module-server": patch
---

Rewrite the #418 unique index on `metaData.treasuryDonationTxHash` to use operators MongoDB's `partialFilterExpression` actually supports. The `$nin`/`$ne` version added for #418 could never be created: MongoDB rejects `$not`-based operators there, so `createIndex` failed and Mongoose's `autoIndex` only surfaced it as a model error event, leaving the service running without the index and the draft-to-live promote race open. The filter now selects the live/withdrawn statuses directly (`$in`) and a non-empty string hash (`$type` plus `$gt`), which are both allowed in a partial filter and create the index correctly on MongoDB 7. `__scripts/admin/ensure-treasury-tx-hash-unique-index.mjs` uses the same filter shape.
