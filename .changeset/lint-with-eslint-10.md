---
"proposal-module-server": patch
---

Lint the server and the frontend with ESLint 10. `eslint` moves to `^10.16.0` and `@eslint/js` to `^10.0.1` in the root and in `__frontend`. The new `no-useless-assignment` rule reported two initial values that every path overwrote, in `createReadinessHandler` and in the Google send smoke script, and both are now declared without one. Behavior is unchanged.
