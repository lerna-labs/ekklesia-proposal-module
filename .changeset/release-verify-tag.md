---
"proposal-module-server": patch
---

Creating the GitHub Release now requires the release tag to already exist. If the verified tag were deleted after verification, the release step fails instead of creating an unsigned tag on the default branch.
