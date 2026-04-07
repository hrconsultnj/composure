#!/bin/bash
# ============================================================
# Resolve Plugin Root — Shared Helper
# ============================================================
# Source this in hooks that need to access plugin binaries,
# config, or resources. Provides consistent CLAUDE_PLUGIN_ROOT
# fallback for sub-agents and edge cases.
#
# Sets:
#   COMPOSURE_ROOT    — plugin root directory
#   COMPOSURE_BIN     — plugin bin/ directory
#   COMPOSURE_RESOLVED — "plugin" or "cache" (how it was found)
#
# Usage:
#   SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
#   source "${SCRIPT_DIR}/../lib/resolve-plugin-root.sh"
# ============================================================

COMPOSURE_ROOT=""
COMPOSURE_RESOLVED=""

# Primary: CLAUDE_PLUGIN_ROOT (set by the plugin system)
if [ -n "$CLAUDE_PLUGIN_ROOT" ] && [ -d "$CLAUDE_PLUGIN_ROOT" ]; then
  COMPOSURE_ROOT="$CLAUDE_PLUGIN_ROOT"
  COMPOSURE_RESOLVED="plugin"
else
  # Fallback: search plugin cache locations (for sub-agents)
  for CACHE_BASE in \
    "${HOME}/.claude/plugins/cache/composure-suite/composure" \
    "${USERPROFILE}/.claude/plugins/cache/composure-suite/composure" \
    "${APPDATA}/.claude/plugins/cache/composure-suite/composure"; do
    [ -z "$CACHE_BASE" ] && continue
    if [ -d "$CACHE_BASE" ]; then
      # Find the latest version directory
      LATEST=$(ls -td "$CACHE_BASE"/*/ 2>/dev/null | head -1)
      if [ -n "$LATEST" ] && [ -d "$LATEST" ]; then
        COMPOSURE_ROOT="${LATEST%/}"
        COMPOSURE_RESOLVED="cache"
        break
      fi
    fi
  done

  if [ "$COMPOSURE_RESOLVED" = "cache" ]; then
    printf '[composure:warn] CLAUDE_PLUGIN_ROOT not set — using cache fallback.\n' >&2
  fi
fi

COMPOSURE_BIN="${COMPOSURE_ROOT}/bin"
