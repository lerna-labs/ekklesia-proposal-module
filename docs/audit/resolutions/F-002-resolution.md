# F-002 Resolution

**Status:** Accepted (by design) — not resolved

**Commits:** [`4522883`](https://github.com/lerna-labs/ekklesia-proposal-module/commit/452288358a5e6ccec5d51923354bad2169aa1633) — *Documentation Updates for F-002*

**How:** Multisig login is membership-only by design. Architecture/docs notes and inline comments in `routes/api/v0/session.js` and `helper/verifySignature.js` state that session auth does not enforce threshold/timelock native-script rules. Full native-script evaluation was declined.

**Remaining:** None — leave membership-only auth; do not treat as an open fix.
