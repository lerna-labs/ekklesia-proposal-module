# proposal-module-server

## 1.6.2

### Patch Changes

- ff64466: Add Vote.slug unique-index deploy preflight and clear duplicate-key errors in vote setup scripts (F-005).
- ee845fc: Delete orphan archived proposal snapshots when a live version CAS update throws after archive save (F-006).
- 37e153f: Add Contributor Covenant Code of Conduct and link it from CONTRIBUTING (F-019).
- 66f9fd9: Reject JWTs whose user no longer exists instead of treating missing users as sessionVersion 0 (F-023).
- 666c16d: Add ESLint, Prettier, and EditorConfig at the repo root and a Svelte-aware setup under `__frontend` (#494 / F-025).
- 94126f6: Clear remaining `__frontend` ESLint warnings (unused imports/props, empty catches, obsolete `svelte-ignore`) with no intentional behavior change; bump frontend to 2.1.5.
- dda7199: Add in-repo GitHub issue forms and a PR checklist template (#492); issues stay in this repository.

## 1.6.1

### Patch Changes

- Enforce global uniqueness of treasury donation tx hashes for non-draft/non-archived proposals (#418), so concurrent draft→live promotes cannot reuse one donation.
