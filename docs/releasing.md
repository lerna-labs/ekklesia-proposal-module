# Releasing

Production releases are published only from a signed annotated tag that GitHub verifies. Automation never creates a version tag.

1. Promotions land on `main`, and the Release workflow (`release.yml`) opens and updates the `chore: release` pull request (branch `changeset-release/main`). Merging that pull request bumps `package.json` and rolls the changesets into `CHANGELOG.md`. It does not tag or publish anything.
2. The maintainer creates a signed annotated tag at the version commit on `main` and pushes it:

   ```
   git fetch origin main
   git tag -s vX.Y.Z -m "vX.Y.Z" <version-commit-sha>
   git push origin vX.Y.Z
   ```

3. The tag push triggers `publish.yml`. Its first job runs `.github/scripts/verify-release-tag.sh`, and every other job needs it. Nothing is built or published unless all of these hold:
   - the ref is an annotated tag object, not a lightweight tag;
   - GitHub reports the tag object's signature as verified;
   - the tagged commit is an ancestor of `origin/main`;
   - the tag equals `v` plus the `version` in the tagged commit's `package.json`.
4. The publish job builds the frontend, packages the server tarball, and creates the GitHub Release with the `CHANGELOG.md` section as notes, unless a release for the tag already exists.
5. `backport-release.yml` triggers on the same tag push and opens the backport PRs.

To re-run the check against a tag that has already been pushed, for example after a failed run:

```
GITHUB_REPOSITORY=lerna-labs/ekklesia-proposal-module GH_TOKEN=$(gh auth token) .github/scripts/verify-release-tag.sh vX.Y.Z
```
