---
"proposal-module-server": patch
---

Releases are now published only from a signed annotated tag that the maintainer pushes at the version commit on `main`. The release workflow no longer creates or pushes a tag, and the publish workflow first verifies that the tag is annotated, that GitHub reports its signature as verified, that the tagged commit is on `main`, and that the tag matches the `package.json` version. Creating the GitHub Release is skipped when it already exists.
