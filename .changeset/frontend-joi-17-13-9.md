---
"proposal-module-server": patch
---

Refresh `__frontend`'s transitive `joi` from 17.13.8 to 17.13.9, a development-scope dependency pulled in by `sveltekit-superforms`. This clears GHSA-4528-x5fx-h6hg, which affects `joi` from 17.1.1 up to but not including 17.13.9. The resolved version moved within the existing caret range, with no `package.json` change and no override.
