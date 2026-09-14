---
"proposal-module-server": patch
---

Bump `nodemailer` to 9.1.1 in the root lockfile. The declared range already permitted this version. 9.1.1 fixes a quadratic-time denial of service in address parsing, an allow-list bypass that could route mail to the wrong recipient domain, an IDN/punycode bypass, and a case where `resolveContent` could reach a file or URL past the `disableFileAccess`/`disableUrlAccess` flags.
