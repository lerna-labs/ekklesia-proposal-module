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

tag_json=$(gh api "repos/$REPO/git/tags/$object_sha") \
  || fail "Could not read the tag object for $TAG."
verified=$(jq -r '.verification.verified' <<<"$tag_json")
if [ "$verified" != "true" ]; then
  reason=$(jq -r '.verification.reason' <<<"$tag_json")
  fail "The signature on tag $TAG is not verified by GitHub (reason: $reason)."
fi

target_type=$(jq -r '.object.type' <<<"$tag_json")
if [ "$target_type" != "commit" ]; then
  fail "Tag $TAG points at a $target_type, not a commit. A tag of a tag is not accepted."
fi

commit=$(jq -r '.object.sha' <<<"$tag_json")
expected="${GITHUB_SHA:-$commit}"
if [ "$commit" != "$expected" ]; then
  fail "The signed tag $TAG points at $commit, but the pushed commit is $expected."
fi

if ! git cat-file -e "$commit^{commit}" 2>/dev/null; then
  fail "Commit $commit of tag $TAG is not present in the local clone; fetch it first."
fi

git fetch --quiet origin main
if ! git merge-base --is-ancestor "$commit" origin/main; then
  fail "Tag $TAG points at $commit, which is not an ancestor of origin/main."
fi

version=$(git show "$commit:package.json" | jq -r .version)
if [ "$TAG" != "v$version" ]; then
  fail "Tag $TAG does not match version $version in package.json at $commit (expected v$version)."
fi

echo "Tag $TAG is a verified signed annotated tag at $commit on main."
