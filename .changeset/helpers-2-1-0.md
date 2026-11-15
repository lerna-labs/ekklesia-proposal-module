---
"proposal-module-server": patch
---

Raise `@lerna-labs/ekklesia-helpers` to `^2.1.0` and resolve 2.1.0 in the root lockfile. Sign-in with a DRep now requires the DRep to have `drep_status` `registered`. A signature must now name the claimed address in its protected `address` header and be made by the key whose hash equals the address's credential. Pool, script DRep, stake and calidus IDs whose payload is not the expected length are rejected, and `validateAddress` with `pool` returns `{ error: 'Invalid pool ID' }` where it used to throw.
