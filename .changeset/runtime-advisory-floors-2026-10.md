---
"proposal-module-server": patch
---

Raise the `zod` range to `^4.6.6` in the server and frontend, the server `nodemailer` range to `^10.1.4` and the `undici` override to `^6.29.1`, and resolve `body-parser` 2.4.0 in the server lockfile. These releases fix memory exhaustion when validating oversized collections, address-parser group confusion, and denial-of-service issues in `undici` and `body-parser`.
