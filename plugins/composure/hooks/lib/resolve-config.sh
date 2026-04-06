#!/bin/bash
# ============================================================
# Resolve Config — Shared Helper
# ============================================================
# Source this in hooks that need to read project-level config.
# Implements dual-read: .composure/ first, .claude/ fallback.
# Existing projects with .claude/ configs keep working forever.
#
# Expects: PROJECT_DIR to be set by the calling hook
#   (from CLAUDE_PROJECT_DIR, .cwd JSON field, or git root walk)
#
# Sets:
#   COMPOSURE_CONFIG      — path to no-bandaids.json (empty if not found)
#   COMPOSURE_CONFIG_DIR  — the .composure/ or .claude/ parent directory
#
# Usage:
#   PROJECT_DIR="${CLAUDE_PROJECT_DIR:-.}"
#   SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
#   source "${SCRIPT_DIR}/../lib/resolve-config.sh"
# ============================================================

COMPOSURE_CONFIG=""
COMPOSURE_CONFIG_DIR=""

if [ -n "$PROJECT_DIR" ]; then
  # Check .composure/ first (new convention)
  if [ -f "${PROJECT_DIR}/.composure/no-bandaids.json" ]; then
    COMPOSURE_CONFIG="${PROJECT_DIR}/.composure/no-bandaids.json"
    COMPOSURE_CONFIG_DIR="${PROJECT_DIR}/.composure"
  # Fall back to .claude/ (backward compat)
  elif [ -f "${PROJECT_DIR}/.claude/no-bandaids.json" ]; then
    COMPOSURE_CONFIG="${PROJECT_DIR}/.claude/no-bandaids.json"
    COMPOSURE_CONFIG_DIR="${PROJECT_DIR}/.claude"
  fi
fi

# Helper: resolve a companion config with dual-read
# Usage: resolve_companion_config "sentinel" → sets path or empty
resolve_companion_config() {
  local name="$1"
  if [ -n "$PROJECT_DIR" ] && [ -f "${PROJECT_DIR}/.composure/${name}.json" ]; then
    echo "${PROJECT_DIR}/.composure/${name}.json"
  elif [ -n "$PROJECT_DIR" ] && [ -f "${PROJECT_DIR}/.claude/${name}.json" ]; then
    echo "${PROJECT_DIR}/.claude/${name}.json"
  fi
}

# Helper: check if project is initialized (either location)
composure_is_initialized() {
  [ -n "$COMPOSURE_CONFIG" ]
}

# Derive Cortex agent_id for this project
# Convention: project directory basename (e.g. "composure-web", "my-app")
# Global/cross-project namespace: "global"
COMPOSURE_AGENT_ID="$(basename "${PROJECT_DIR:-.}")"

# Helper: find config during project root walk (for hooks that walk up from file path)
# Usage: composure_find_config_in_dir "/path/to/dir" → returns 0 if found
composure_find_config_in_dir() {
  local dir="$1"
  [ -f "${dir}/.composure/no-bandaids.json" ] || [ -f "${dir}/.claude/no-bandaids.json" ]
}
