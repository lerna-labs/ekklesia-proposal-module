# F-010: Private Package Dependency Blocks Public Installation

| Field | Value |
|-------|-------|
| **Severity** | High |
| **Finding ID** | F-010 |
| **Category** | Public installability |
| **Status** | Resolved |

## Affected Files

- `package.json`

## Observation

The root package previously depended on private `@lerna-labs/ekklesia-helpers@^0.1.0`. This blocked public `npm install` for contributors without the required package-registry access.

## Risk

External contributors cannot install or run the backend from a fresh clone.

## Recommendation

Publish the helper package publicly, vendor or replace the required helper code, or document the private registry requirement if the repository is not intended to be fully public.

## Current Status

**Resolved.** Dependency is `@lerna-labs/ekklesia-helpers@^2.0.0` (publicly installable). See `docs/audit/resolutions/F-010-resolution.md`.
