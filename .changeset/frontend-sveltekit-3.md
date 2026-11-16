---
"proposal-module-server": patch
---

Move `__frontend` to `@sveltejs/kit` 3.2.0 and `@sveltejs/adapter-static` 4.0.1, with `typescript` 6.0.3 and `svelte-check` 4.7.8. This clears GHSA-27mw-82g8-phjj and GHSA-pfhg-q3qv-9q6r (`@sveltejs/kit` before 3.0.0), GHSA-6cf5-gc4q-fm3x and GHSA-3r8g-jcqq-3p5j (`@sveltejs/kit` through 3.1.0), GHSA-mw6w-2fmv-pvw3 and GHSA-rqp5-r3wg-vg35 (`@sveltejs/kit` 3.x before 3.1.1), and GHSA-jf9x-2fg2-hx4w (`@sveltejs/adapter-static` 4.x before 4.0.1). SvelteKit configuration now lives in `vite.config.js`, `$lib` imports became `#lib`, and `WalletConnect.svelte` reads `$app/state`. The unused `sveltekit-superforms` and `formsnap` dependencies and the `cookie` override are removed, and the `__frontend` Node floor is now `>=22.17`.
