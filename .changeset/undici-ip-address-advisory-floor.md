---
"proposal-module-server": patch
---

Raise the root `undici` override to `^6.28.1` and the `ip-address` override to `^10.5.1`, and update the lockfile to `undici` 6.29.0 and `ip-address` 10.7.2. `undici` 6.28.1 and later fix GHSA-3wwx-pv8p-q78v, which affects `>= 6.25.0, < 6.28.1`. `ip-address` 10.5.1 and later fix GHSA-2vr4-cq9g-pvrc, which affects `>= 10.2.0, <= 10.5.0`.
