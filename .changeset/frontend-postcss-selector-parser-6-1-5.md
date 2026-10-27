---
"proposal-module-server": patch
---

Raise `__frontend`'s transitive `postcss-selector-parser` from 6.0.10 to 6.1.5, clearing a development-scope alert (GHSA-rj75-hqrm-r3gf, vulnerable below 6.1.5). `@tailwindcss/typography` 0.5.20, its latest release, pins 6.0.10 exactly, so `__frontend/package.json` gains an override scoped to that package. The separate 7.1.6 copy used by `svelte-eslint-parser` is already patched and is untouched.
