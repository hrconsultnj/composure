#!/bin/bash
# ============================================================
# Hook Activity Counter — Shared library
# ============================================================
# Sourced by hooks to record execution counts.
# Each call appends a category line to hook-activity.log.
# session-end-summary.sh reads, counts, reports, and clears.
#
# Usage:
#   source "${SCRIPT_DIR}/../lib/hook-counter.sh"
#   increment_hook_counter "enforcement"
# ============================================================

increment_hook_counter() {
  local LOG="${CLAUDE_PROJECT_DIR:-.}/.composure/hook-activity.log"
  mkdir -p "$(dirname "$LOG")" 2>/dev/null || return 0
  printf '%s\n' "$1" >> "$LOG" 2>/dev/null
}
