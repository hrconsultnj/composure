#!/usr/bin/env bash
# composure-resolve.sh — path resolution lib for Composure hooks & skills.
#
# Why: every hook today resolves plugin paths via $CLAUDE_PLUGIN_ROOT. That
# couples us to Claude's marketplace cache layout. This lib resolves via
# ~/.composure/manifest.json first, so the same hooks keep working when the
# runtime moves to ~/.composure/installed/ (npm install) or any other host.
#
# Source me, don't execute me:
#   . "$(dirname "$0")/composure-resolve.sh"   # within plugins/composure/scripts/
#   composure_resolve_init
#   echo "$COMPOSURE_RUNTIME_ROOT"
#   echo "$(composure_resolve_plugin sentinel)"
#
# Exposes:
#   $COMPOSURE_RUNTIME_ROOT  — composure plugin runtime root
#   $COMPOSURE_SUITE_ROOT    — parent dir containing all suite plugins
#   $COMPOSURE_MANIFEST      — path to manifest.json (may not exist on cold boot)
#   composure_resolve_plugin <name>  → prints absolute path or empty
#   composure_get_version    <name>  → prints version string or empty
#   composure_manifest_fresh         → exit 0 if manifest exists & schema_v1

COMPOSURE_HOME="${COMPOSURE_HOME:-${HOME}/.composure}"
COMPOSURE_MANIFEST="${COMPOSURE_HOME}/manifest.json"

# Fallback chain when manifest is missing/broken. Order matters:
#   1. $CLAUDE_PLUGIN_ROOT  (current host: Claude Code)
#   2. newest dir under suite cache  (host present, manifest cold)
#   3. give up
_composure_fallback_runtime() {
  if [ -n "${CLAUDE_PLUGIN_ROOT:-}" ] && [ -d "${CLAUDE_PLUGIN_ROOT}" ]; then
    echo "${CLAUDE_PLUGIN_ROOT}"
    return 0
  fi
  local suite="${HOME}/.claude/plugins/cache/composure-suite/composure"
  [ -d "$suite" ] || return 1
  # shellcheck disable=SC2012
  local newest
  newest=$(ls "$suite" 2>/dev/null | sort -V | tail -1)
  [ -n "$newest" ] && [ -d "$suite/$newest" ] && echo "$suite/$newest"
}

composure_manifest_fresh() {
  [ -f "$COMPOSURE_MANIFEST" ] || return 1
  command -v jq >/dev/null 2>&1 || return 1
  local v
  v=$(jq -r '.schema_version // 0' "$COMPOSURE_MANIFEST" 2>/dev/null)
  [ "$v" = "1" ]
}

composure_resolve_plugin() {
  local name="$1"
  [ -z "$name" ] && return 1
  if composure_manifest_fresh; then
    local p
    p=$(jq -r --arg n "$name" '.installed_plugins[$n].runtime_path // ""' "$COMPOSURE_MANIFEST" 2>/dev/null)
    if [ -n "$p" ] && [ -d "$p" ]; then echo "$p"; return 0; fi
  fi
  # Manifest miss → derive from suite cache layout (works for any suite plugin)
  local suite="${HOME}/.claude/plugins/cache/composure-suite/${name}"
  [ -d "$suite" ] || return 1
  # shellcheck disable=SC2012
  local newest
  newest=$(ls "$suite" 2>/dev/null | sort -V | tail -1)
  [ -n "$newest" ] && [ -d "$suite/$newest" ] && echo "$suite/$newest"
}

composure_get_version() {
  local name="$1"
  [ -z "$name" ] && return 1
  if composure_manifest_fresh; then
    jq -r --arg n "$name" '.installed_plugins[$n].version // ""' "$COMPOSURE_MANIFEST" 2>/dev/null
    return 0
  fi
  local root
  root=$(composure_resolve_plugin "$name") || return 1
  jq -r '.version // ""' "$root/.claude-plugin/plugin.json" 2>/dev/null
}

composure_resolve_init() {
  COMPOSURE_RUNTIME_ROOT=$(composure_resolve_plugin composure)
  if [ -z "$COMPOSURE_RUNTIME_ROOT" ]; then
    COMPOSURE_RUNTIME_ROOT=$(_composure_fallback_runtime)
  fi
  if [ -n "$COMPOSURE_RUNTIME_ROOT" ]; then
    COMPOSURE_SUITE_ROOT=$(dirname "$(dirname "$COMPOSURE_RUNTIME_ROOT")")
  fi
  export COMPOSURE_HOME COMPOSURE_MANIFEST COMPOSURE_RUNTIME_ROOT COMPOSURE_SUITE_ROOT
}
