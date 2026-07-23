# F-010: Private Package Dependency Blocks Public Installation

| Field | Value |
|-------|-------|
| **Severity** | High |
| **Finding ID** | F-010 |
| **Category** | Public installability |
| **Status** | Fixed |

## Affected Files

- `package.json:39`

## Observation

The root package depends on private `@lerna-labs/ekklesia-helpers@^0.1.0`. This blocks public `npm install` for contributors without the required package-registry access.

## Risk

External contributors cannot install or run the backend from a fresh clone.

## Recommendation

Publish the helper package publicly, vendor or replace the required helper code, or document the private registry requirement if the repository is not intended to be fully public.

## Current Status

Fixed by install verification. The dependency is now `@lerna-labs/ekklesia-helpers@^1.0.0`, and `npm ls` confirms `@lerna-labs/ekklesia-helpers@1.0.0` is installed locally.
