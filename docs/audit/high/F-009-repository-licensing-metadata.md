# F-009: Repository Licensing Metadata Is Inconsistent

| Field | Value |
|-------|-------|
| **Severity** | High |
| **Finding ID** | F-009 |
| **Category** | Open-source readiness / licensing |
| **Status** | Resolved |

## Affected Files

- `LICENSE`
- `README.md`
- `package.json`
- `__frontend/package.json`

## Observation

The repository previously had contradictory licensing signals (proprietary/confidential LICENSE/README wording vs package metadata declaring ISC).

## Risk

The repository is not legally ready for open-source publication because contributors and users receive contradictory licensing signals.

## Recommendation

Choose the intended open-source license, replace proprietary README and LICENSE language, and align all package metadata with the selected license.

## Current Status

**Resolved.** Root `LICENSE` is Apache 2.0; root and `__frontend` `package.json` declare `"license": "Apache-2.0"`. Root `README.md` no longer contains a proprietary/confidential notice. See `docs/audit/resolutions/F-009-resolution.md`.
