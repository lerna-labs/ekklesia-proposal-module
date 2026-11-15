---
"proposal-module-server": patch
---

Raise the `handlebars` range to `^4.7.10` and resolve 4.7.10 in the root lockfile. 4.7.10 fixes three JavaScript injection issues in template compilation: an AST type confusion in `compile`, an own-property check bypass, and unsafe inline embedding of precompiled templates.
