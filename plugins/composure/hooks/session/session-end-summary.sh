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

exit 0
