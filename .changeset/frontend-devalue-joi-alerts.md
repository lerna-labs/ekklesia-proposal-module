---
"proposal-module-server": patch
---

Bump `__frontend`'s transitive `devalue` from 5.8.2 to 5.9.4, clearing a runtime-scope denial-of-service alert (GHSA-9rgm-9g3h-6x36) triggered by malformed input during deserialization. The advisory text states a vulnerable range of `< 5.9.1`, but the release that actually rejects the malformed input ("reject out-of-bounds indices") is 5.9.2, so 5.9.1 alone would not have cleared it. 5.9.4 is the latest 5.9.x release and avoids 6.0.0, which raises the Node floor to 22.17 and changes the `uneval` replacer signature.

Bump `__frontend`'s transitive `joi` from 17.13.4 to 17.13.8, a development-scope dependency pulled in by the SvelteKit tooling. This clears two prototype-pollution alerts, GHSA-gg4h-3hg2-grpc (fixed at 17.13.5) and GHSA-6w3j-5fw6-r9vr (fixed at 17.13.6); 17.13.8 is the latest release on the 17.x line.

Both dependencies are transitive with permissive caret ranges already declared upstream, so the resolved versions moved with no `package.json` change and no override needed.
