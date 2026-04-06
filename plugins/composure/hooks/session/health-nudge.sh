#!/bin/bash
# SessionStart hook: quick health check, warns on first drift
# Only runs if .composure/last-health-check is >24h old or missing
# Non-blocking, fail-safe, single-line output
set -e

PROJECT_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
CHECK_FILE="${PROJECT_ROOT}/.composure/last-health-check"

# Skip if checked within 24 hours
if [ -f "$CHECK_FILE" ]; then
  LAST_CHECK=$(cat "$CHECK_FILE" 2>/dev/null || echo "0")
  NOW=$(date +%s)
  ELAPSED=$(( NOW - LAST_CHECK ))
  if [ "$ELAPSED" -lt 86400 ]; then
    exit 0
  fi
fi

# Quick checks (subset of full /composure:health)
DRIFT_FOUND=0

# Check plugin manifest exists
if [ ! -f "${CLAUDE_PLUGIN_ROOT}/.claude-plugin/plugin.json" ]; then
  DRIFT_FOUND=1
fi

# Check key binaries exist
for BIN in composure-fetch.mjs composure-token.mjs; do
  if [ ! -x "${HOME}/.composure/bin/${BIN}" ]; then
    DRIFT_FOUND=1
    break
  fi
done

# Report drift (single line, not a modal)
if [ "$DRIFT_FOUND" -eq 1 ]; then
  echo "[composure] Install drift detected. Run /composure:health for details."
fi

# Update last-check timestamp
mkdir -p "$(dirname "$CHECK_FILE")" 2>/dev/null
date +%s > "$CHECK_FILE" 2>/dev/null

exit 0
