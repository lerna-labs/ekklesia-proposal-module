---
"proposal-module-server": patch
---

Raise the `googleapis` range to `^189.0.0` and resolve 189.0.0 in the root lockfile, which clears Dependabot alert `#196` (`glob`, GHSA-3g3m-2fjr-6pw4) and Dependabot alert `#198` (`minimatch`, GHSA-g3hv-75wg-m249). `googleapis` 189 depends on `googleapis-common` 9 and `gaxios` 8, which no longer pull in `rimraf`, `glob` or `minimatch`.
