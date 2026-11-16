---
"proposal-module-server": patch
---

Raise `__frontend`'s `@sveltejs/kit` from 2.70.3 to 2.70.4 and `@sveltejs/adapter-static` from 3.0.10 to 3.0.11, and their declared floors to `^2.70.4` and `^3.0.11`. This clears GHSA-jf9x-2fg2-hx4w, which affects `@sveltejs/adapter-static` before 3.0.11, and GHSA-mw6w-2fmv-pvw3 and GHSA-rqp5-r3wg-vg35, which affect `@sveltejs/kit` before 2.70.4. Both are development-scope dependencies, and no other package changes.
