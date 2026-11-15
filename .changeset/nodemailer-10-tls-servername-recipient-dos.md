---
"proposal-module-server": patch
---

Bump `nodemailer` from 9.1.1 to 10.0.13 (declared range `^10.0.2`), clearing two runtime-scope alerts: GHSA-6vj9 (SMTP credential disclosure through TLS server name reuse) and GHSA-8vvx (denial of service from deeply nested recipient arrays), both fixed in 10.0.2. The only breaking change in 10.x is a Node.js 20 floor, which the repository's Node 24 requirement already meets; the single call site, an in-memory stream transport in `mailer/googleWorkspaceSend.js`, needs no change.
