# proposal-module-server

## 1.6.1

### Patch Changes

- Enforce global uniqueness of treasury donation tx hashes for non-draft/non-archived proposals (#418), so concurrent draft→live promotes cannot reuse one donation.
