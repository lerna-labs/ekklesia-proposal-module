---
"proposal-module-server": patch
---

Update the root lockfile to `axios` 1.20.0 and raise the `brace-expansion` override to `^2.1.7` (resolving 2.1.7) and the `ip-address` override to `^10.7.1`, and update `__frontend`'s lockfile to `brace-expansion` 1.1.21. These clear the advisories affecting `axios` before 1.20.0, `brace-expansion` 2.x before 2.1.7, and `brace-expansion` 1.x before 1.1.21, and move the `ip-address` floor past `<= 10.7.0`.
