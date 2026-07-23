# F-022 Resolution

**Status:** Resolved

**Commits:** Pending (landed with this change)

**How:** Removed `$unset` of `notification.unsubscribeSecret` from the PUT `/api/v0/notifications` email-cleared path in `routes/api/v0/notifications.js`. Secret rotation remains only on successful POST `/api/v0/notifications/verify`. `__tests/security/atk-unsubscribe-rotation-timing-guard.js` passes.

**Remaining:** None for F-022.
