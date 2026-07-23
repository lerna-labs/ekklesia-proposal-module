# F-002 Resolution

**Status:** Not resolved (documented only)

**Commits:** [`4522883`](https://github.com/lerna-labs/ekklesia-proposal-module/commit/452288358a5e6ccec5d51923354bad2169aa1633) — *Documentation Updates for F-002*

**How:** Added architecture/docs notes and inline comments in `routes/api/v0/session.js` and `helper/verifySignature.js` stating multisig login is membership-only by design and does not enforce threshold/timelock rules.

**Remaining:** Session auth still calls `isPartyToScript()` with no native-script evaluator; a single key can still authenticate as a multisig address.
