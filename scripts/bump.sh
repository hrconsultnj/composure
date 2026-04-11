#!/bin/bash
# ============================================================
# Manual release bump for composure-suite plugins
# ============================================================
# Replaces the deleted .github/workflows/auto-version.yml.
# Run this when you want a visible update ("Composure updated"
# notification on next user restart).
#
# Usage:
#   scripts/bump.sh <plugin> [level]
#   scripts/bump.sh all [level]
#
# Arguments:
#   <plugin>  composure | design-forge | sentinel | shipyard | testbench | all
#   [level]   patch (default) | minor | major
#
# Examples:
#   scripts/bump.sh composure           # patch bump composure only
#   scripts/bump.sh sentinel minor      # minor bump sentinel
#   scripts/bump.sh all                 # patch bump all 5 plugins
#
# What it touches:
#   plugins/<name>/.claude-plugin/plugin.json   (.version field only)
#
# What it does NOT touch:
#   .claude-plugin/marketplace.json             (matches Anthropic's
#                                                official pattern —
#                                                no version fields here)
#
# Does NOT push. Creates a local commit; you run `git push` when ready.
# ============================================================

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PLUGINS_DIR="$REPO_ROOT/plugins"
ALL_PLUGINS=(composure design-forge sentinel shipyard testbench)

PLUGIN="${1:-}"
LEVEL="${2:-patch}"

if [ -z "$PLUGIN" ]; then
  echo "Usage: $0 <plugin|all> [patch|minor|major]" >&2
  echo "Plugins: ${ALL_PLUGINS[*]}" >&2
  exit 1
fi

case "$LEVEL" in
  patch|minor|major) ;;
  *)
    echo "Error: level must be patch|minor|major (got: $LEVEL)" >&2
    exit 1
    ;;
esac

# ── Resolve target list ─────────────────────────────────────
if [ "$PLUGIN" = "all" ]; then
  TARGETS=("${ALL_PLUGINS[@]}")
else
  # Verify the plugin is one we recognize
  FOUND=0
  for p in "${ALL_PLUGINS[@]}"; do
    [ "$p" = "$PLUGIN" ] && FOUND=1 && break
  done
  if [ "$FOUND" -eq 0 ]; then
    echo "Error: unknown plugin '$PLUGIN'. Must be one of: ${ALL_PLUGINS[*]} | all" >&2
    exit 1
  fi
  TARGETS=("$PLUGIN")
fi

# ── Bump each target ─────────────────────────────────────────
cd "$REPO_ROOT"

SUMMARY=()

for name in "${TARGETS[@]}"; do
  json="$PLUGINS_DIR/$name/.claude-plugin/plugin.json"

  if [ ! -f "$json" ]; then
    echo "Skip: $json not found" >&2
    continue
  fi

  current=$(jq -r '.version // empty' "$json")
  if [ -z "$current" ]; then
    echo "Skip: no .version field in $json" >&2
    continue
  fi

  IFS='.' read -r MAJOR MINOR PATCH <<< "$current"
  case "$LEVEL" in
    patch) PATCH=$((PATCH + 1)) ;;
    minor) MINOR=$((MINOR + 1)); PATCH=0 ;;
    major) MAJOR=$((MAJOR + 1)); MINOR=0; PATCH=0 ;;
  esac
  new="$MAJOR.$MINOR.$PATCH"

  jq --arg v "$new" '.version = $v' "$json" > "${json}.tmp" && mv "${json}.tmp" "$json"
  echo "  $name: $current → $new"
  SUMMARY+=("$name@$new")
done

if [ "${#SUMMARY[@]}" -eq 0 ]; then
  echo "Nothing bumped." >&2
  exit 1
fi

# ── Stage and commit ─────────────────────────────────────────
git add plugins/*/.claude-plugin/plugin.json

if git diff --cached --quiet; then
  echo "No version changes staged — nothing to commit."
  exit 0
fi

# Build compact commit message: "chore: bump composure@1.47.55" or
# "chore: bump composure@1.47.55 sentinel@1.1.32"
JOINED=$(printf " %s" "${SUMMARY[@]}")
JOINED="${JOINED# }"
git commit -m "chore: bump ${JOINED}"

echo ""
echo "Committed. Push when ready:"
echo "  git push origin \$(git rev-parse --abbrev-ref HEAD)"
