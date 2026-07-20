# F-009: Repository Licensing Metadata Is Inconsistent

| Field | Value |
|-------|-------|
| **Severity** | High |
| **Finding ID** | F-009 |
| **Category** | Open-source readiness / licensing |
| **Status** | Open |

## Affected Files

- `LICENSE:1`
- `README.md:3-10`
- `package.json:35`

## Observation

The repository LICENSE and README describe the project as proprietary or confidential, while package metadata declares an ISC license.

## Risk

The repository is not legally ready for open-source publication because contributors and users receive contradictory licensing signals.

## Recommendation

Choose the intended open-source license, replace proprietary README and LICENSE language, and align all package metadata with the selected license.

## Current Status

Open. LICENSE and README still contain proprietary/confidential wording while package metadata still declares ISC.
