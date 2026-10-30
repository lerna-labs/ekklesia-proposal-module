#!/usr/bin/env bash
# Verifies that a release tag is a GitHub-verified signed annotated tag on a
# commit reachable from main, and that it matches the version in package.json.
# Usage: verify-release-tag.sh <tag>
# Reads GITHUB_REPOSITORY and GH_TOKEN from the environment.
set -euo pipefail

TAG="${1:?usage: verify-release-tag.sh <tag>}"
REPO="${GITHUB_REPOSITORY:?GITHUB_REPOSITORY is not set}"

fail() {
  echo "::error::$1"
  exit 1
}

ref=$(gh api "repos/$REPO/git/ref/tags/$TAG" --jq '.object.type + " " + .object.sha') \
  || fail "Tag $TAG does not exist in $REPO."
type=${ref%% *}
object_sha=${ref#* }

if [ "$type" != "tag" ]; then
  fail "Tag $TAG is a lightweight tag (ref points at a $type). Release tags must be annotated and signed: git tag -s."
fi

verified=$(gh api "repos/$REPO/git/tags/$object_sha" --jq '.verification.verified')
if [ "$verified" != "true" ]; then
  reason=$(gh api "repos/$REPO/git/tags/$object_sha" --jq '.verification.reason')
  fail "The signature on tag $TAG is not verified by GitHub (reason: $reason)."
fi

commit=$(git rev-parse "refs/tags/$TAG^{commit}") \
  || fail "Tag $TAG is not present in the local clone; fetch tags first."

git fetch --quiet origin main
if ! git merge-base --is-ancestor "$commit" origin/main; then
  fail "Tag $TAG points at $commit, which is not an ancestor of origin/main."
fi

version=$(git show "$commit:package.json" | jq -r .version)
if [ "$TAG" != "v$version" ]; then
  fail "Tag $TAG does not match version $version in package.json at $commit (expected v$version)."
fi

echo "Tag $TAG is a verified signed annotated tag at $commit on main."
