---
"proposal-module-server": patch
---

Raise `@lerna-labs/ekklesia-helpers` to `^2.1.0` and resolve 2.1.0 in the root lockfile. Sign-in with a DRep requires the DRep to have `drep_status` `registered`. Outside multisig, a sign-in signature must be made by the key whose hash equals the claimed ID's credential, or, for a pool with a registered calidus key, by that key. A COSE signature's protected `address` header must also name the claimed ID. For a DRep it may instead name the DRep key hash, its CIP-129 ID or a type 6 address carrying the key hash, and for a pool signed with its calidus key, the calidus ID. A plain Ed25519 signature carries no header and is not affected by the header check. DRep IDs whose credential is not 28 bytes, pool IDs that are not 28 bytes, and stake and calidus IDs that are not 29 bytes are rejected. `validateAddress` with `pool` returns `{ error: 'Invalid pool ID' }` for a pool ID that is not 28 bytes.
