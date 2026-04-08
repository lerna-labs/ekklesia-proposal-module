#!/usr/bin/env bash
# Run Lighthouse (mobile + desktop) for all Hydra Voting pages.
# HTML reports are written under this directory: ./reports/<timestamp>/
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TESTKIT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
cd "${TESTKIT_DIR}"

TS="$(date -u +"%Y-%m-%dT%H-%M-%SZ")"
OUTDIR="${SCRIPT_DIR}/reports/${TS}"
mkdir -p "${OUTDIR}"

URLS=(
  "https://hydra-voting.intersectmbo.org/"
  "https://hydra-voting.intersectmbo.org/votes/cardano-budget-2026"
  "https://hydra-voting.intersectmbo.org/votes/cardano-budget-2026/69d54c8da7f1311ae7e36ef7"
)

safe_name() {
  local url="$1"
  local rest="${url#https://}"
  local path="${rest#*/}"
  path="${path%/}"
  if [[ -z "${path}" ]]; then
    echo "home"
  else
    echo "${path}" | tr '/' '-'
  fi
}

run_lh() {
  local url="$1"
  local preset="$2"
  local label="$3"
  local base
  local out_html
  base="$(safe_name "${url}")-${label}"
  # With a single --output, Lighthouse writes to --output-path exactly. If the
  # path has no extension, the report file has no extension (not *.html). Use a
  # full "*.html" path so reports open as HTML and match *.html globs.
  out_html="${OUTDIR}/${base}.html"
  echo "Running Lighthouse (${label}) -> ${out_html}"
  npx lighthouse "${url}" \
    --preset="${preset}" \
    --output=html \
    --output-path="${out_html}" \
    --chrome-flags="--headless=new --no-sandbox --disable-dev-shm-usage"
}

for url in "${URLS[@]}"; do
  run_lh "${url}" "perf" "mobile"
  run_lh "${url}" "desktop" "desktop"
done

echo "Done. HTML reports: ${OUTDIR}/"
