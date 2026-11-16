---
"proposal-module-server": patch
---

Finish the frontend's move to SvelteKit 3. The engines guard now requires a Node floor of 22.17.0 in both manifests, `vite-plugin-compression` is removed (SvelteKit 3 builds no longer produce the files it wrote), and `invalidateAll`, the `goto` option `replaceState` and the object form of `error(...)` use their SvelteKit 3 replacements `refreshAll`, `replace` and a message plus properties. The `$stores` alias moves to a `#stores` subpath import, and the shadcn-svelte aliases in `components.json` point at `#lib`.
