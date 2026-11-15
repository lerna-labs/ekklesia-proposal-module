---
"proposal-module-server": patch
---

The release tag check now ties the verified signature to the commit that is published. It reads the signed tag object once and refuses a tag of a tag. It requires the signed tag's commit to equal the pushed commit before checking that the commit is on `main` and that the tag matches its `package.json` version.
