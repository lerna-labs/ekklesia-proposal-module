---
"proposal-module-server": patch
---

Convert five root `overrides` entries from exact pins to caret ranges: `undici` to `^6.28.0`, `ip-address` to `^10.3.1`, `nanoid` to `^3.3.18`, `brace-expansion` to `^2.1.4`, and `qs` to `^6.16.0`. Convert `__frontend`'s `cookie` override the same way, to `^0.7.0`. Each entry exists only to clear an advisory floor rather than a compatibility constraint, so a caret range picks up a future patch or minor release on the next `npm install` instead of staying frozen on the pinned version until someone notices a new advisory and edits the manifest by hand.
