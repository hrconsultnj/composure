#!/bin/bash
# ============================================================
# Session End Summary — fires on SessionEnd
# ============================================================
# Writes a session summary to Cortex so the next session knows
# what happened. Captures: tasks completed, files changed, key
# decisions made during this session.
set -e

# Check Cortex availability
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CLI_PATH="${SCRIPT_DIR}/../../cortex/dist/cli.bundle.js"

if [ ! -f "$CLI_PATH" ] || [ ! -f "${HOME}/.composure/cortex/cortex.db" ]; then
  exit 0
fi

PROJECT_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
AGENT_ID="$(basename "${CLAUDE_PROJECT_DIR:-$(basename "$PROJECT_ROOT")}")"
TIMESTAMP="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
SESSION_ID="${CLAUDE_SESSION_ID:-unknown}"

# Gather session summary data
TASK_FILE="${PROJECT_ROOT}/.composure/current-task.json"
CURRENT_TASK="none"
if [ -f "$TASK_FILE" ]; then
  CURRENT_TASK=$(jq -r '.task_subject // "none"' "$TASK_FILE" 2>/dev/null)
fi

# Count git changes in this session (uncommitted + recent commits)
GIT_CHANGES=""
if git -C "$PROJECT_ROOT" rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  UNCOMMITTED=$(git -C "$PROJECT_ROOT" status -s 2>/dev/null | wc -l | tr -d ' ')
  RECENT_COMMITS=$(git -C "$PROJECT_ROOT" log --oneline --since="4 hours ago" 2>/dev/null | wc -l | tr -d ' ')
  GIT_CHANGES="${UNCOMMITTED} uncommitted, ${RECENT_COMMITS} recent commits"
fi

CONTENT="Session ended: ${SESSION_ID}. Last task: ${CURRENT_TASK}. Changes: ${GIT_CHANGES:-unknown}."

PAYLOAD=$(jq -n \
  --arg agent_id "$AGENT_ID" \
  --arg content "$CONTENT" \
  --arg session "$SESSION_ID" \
  --arg last_task "$CURRENT_TASK" \
  --arg git_changes "${GIT_CHANGES:-unknown}" \
  --arg ts "$TIMESTAMP" \
  '{
    agent_id: $agent_id,
    content: $content,
    content_type: "observation",
    metadata: {
      category: "session",
      tags: ["session-end", "auto-captured"],
      session_id: $session,
      last_task: $last_task,
      git_changes: $git_changes,
      ended_at: $ts
    }
  }')

node --experimental-sqlite "$CLI_PATH" create_memory_node "$PAYLOAD" 2>/dev/null

# ── Hook activity summary ────────────────────────────────────
ACTIVITY_LOG="${PROJECT_ROOT}/.composure/hook-activity.log"
if [ -f "$ACTIVITY_LOG" ]; then
  # Count each category
  CHECKS=$(grep -c '^check$' "$ACTIVITY_LOG" 2>/dev/null || echo 0)
  ENFORCEMENTS=$(grep -c '^enforcement$' "$ACTIVITY_LOG" 2>/dev/null || echo 0)
  GRAPH_UPDATES=$(grep -c '^graph_update$' "$ACTIVITY_LOG" 2>/dev/null || echo 0)
  QUALITY=$(grep -c '^quality$' "$ACTIVITY_LOG" 2>/dev/null || echo 0)
  TOTAL=$(wc -l < "$ACTIVITY_LOG" 2>/dev/null | tr -d ' ')

  SUMMARY_PARTS=()
  [ "$CHECKS" -gt 0 ] && SUMMARY_PARTS+=("${CHECKS} checks passed")
  [ "$ENFORCEMENTS" -gt 0 ] && SUMMARY_PARTS+=("${ENFORCEMENTS} enforcements triggered")
  [ "$GRAPH_UPDATES" -gt 0 ] && SUMMARY_PARTS+=("${GRAPH_UPDATES} graph updates")
  [ "$QUALITY" -gt 0 ] && SUMMARY_PARTS+=("${QUALITY} quality scans")

  if [ ${#SUMMARY_PARTS[@]} -gt 0 ]; then
    printf '[composure] Session: %s' "${SUMMARY_PARTS[0]}"
    for ((i=1; i<${#SUMMARY_PARTS[@]}; i++)); do
      printf ', %s' "${SUMMARY_PARTS[$i]}"
    done
    printf '.\n'
  fi

  # Clear for next session
  rm -f "$ACTIVITY_LOG" 2>/dev/null
fi

# ── Final JSONL ledger sync (safety net) ─────────────────────
# The incremental sync in task-cortex-sync.sh handles task-by-task.
# This catches the full session snapshot on close — pending tasks
# that were never completed get their final state recorded.
RESOLVER="${SCRIPT_DIR}/../../scripts/task-resolver.mjs"
if [ -f "$RESOLVER" ]; then
  node "$RESOLVER" --sync --project "$(basename "$PROJECT_ROOT")" 2>/dev/null || true
fi

exit 0
