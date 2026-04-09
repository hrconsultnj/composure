#!/bin/bash
# ============================================================
# Task → Cortex Sync — fires on TaskCreated / TaskCompleted
# ============================================================
# Persists task state to Cortex for cross-session awareness.
# Uses native TaskCreated/TaskCompleted events (no tool_name parsing).
# Runs async (non-blocking) — Cortex write is fire-and-forget.
set -e

INPUT=$(cat)

# Extract task data from event payload
# TaskCreated/TaskCompleted events provide task fields directly
TASK_ID=$(echo "$INPUT" | jq -r '.task_id // .id // .taskId // empty' 2>/dev/null)
TASK_SUBJECT=$(echo "$INPUT" | jq -r '.subject // .task_subject // empty' 2>/dev/null)
TASK_STATUS=$(echo "$INPUT" | jq -r '.status // .task_status // "unknown"' 2>/dev/null)
TASK_DESC=$(echo "$INPUT" | jq -r '.description // .task_description // empty' 2>/dev/null)
BACKLOG_REF=$(echo "$INPUT" | jq -r '.metadata.backlog_ref // empty' 2>/dev/null)

# Fallback: try nested structures (tool_input for backward compat)
if [ -z "$TASK_ID" ]; then
  TASK_ID=$(echo "$INPUT" | jq -r '.tool_input.taskId // .tool_input.id // empty' 2>/dev/null)
  TASK_SUBJECT=$(echo "$INPUT" | jq -r '.tool_input.subject // empty' 2>/dev/null)
  TASK_STATUS=$(echo "$INPUT" | jq -r '.tool_input.status // "pending"' 2>/dev/null)
  TASK_DESC=$(echo "$INPUT" | jq -r '.tool_input.description // empty' 2>/dev/null)
  [ -z "$BACKLOG_REF" ] && BACKLOG_REF=$(echo "$INPUT" | jq -r '.tool_input.metadata.backlog_ref // empty' 2>/dev/null)
fi

# Skip if no meaningful data
if [ -z "$TASK_ID" ] && [ -z "$TASK_SUBJECT" ]; then
  exit 0
fi

# ── Write to .composure/current-task.json (contract file) ──
PROJECT_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
TASK_FILE="${PROJECT_ROOT}/.composure/current-task.json"
mkdir -p "$(dirname "$TASK_FILE")" 2>/dev/null

if [ "$TASK_STATUS" = "completed" ] || [ "$TASK_STATUS" = "deleted" ]; then
  jq -n --arg updated "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
    '{ task_id: null, task_subject: null, updated_at: $updated }' \
    > "$TASK_FILE" 2>/dev/null
else
  jq -n \
    --arg id "$TASK_ID" \
    --arg subject "$TASK_SUBJECT" \
    --arg updated "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
    '{ task_id: $id, task_subject: $subject, updated_at: $updated }' \
    > "$TASK_FILE" 2>/dev/null
fi

# ── Cortex sync ─────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CLI_PATH="${SCRIPT_DIR}/../../cortex/dist/cli.bundle.js"

if [ ! -f "$CLI_PATH" ] || [ ! -f "${HOME}/.composure/cortex/cortex.db" ]; then
  exit 0
fi

AGENT_ID="$(basename "${CLAUDE_PROJECT_DIR:-$(basename "$PROJECT_ROOT")}")"
TIMESTAMP="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
SESSION_ID="${CLAUDE_SESSION_ID:-unknown}"

CONTENT="Task #${TASK_ID}: ${TASK_SUBJECT} [${TASK_STATUS}]"
[ -n "$TASK_DESC" ] && CONTENT="${CONTENT} — ${TASK_DESC}"

PAYLOAD=$(jq -n \
  --arg agent_id "$AGENT_ID" \
  --arg content "$CONTENT" \
  --arg task_id "$TASK_ID" \
  --arg subject "$TASK_SUBJECT" \
  --arg status "$TASK_STATUS" \
  --arg desc "$TASK_DESC" \
  --arg backlog_ref "$BACKLOG_REF" \
  --arg session "$SESSION_ID" \
  --arg ts "$TIMESTAMP" \
  '{
    agent_id: $agent_id,
    content: $content,
    content_type: "task",
    metadata: {
      category: "task",
      tags: ["task", $status, "session-task"],
      task_id: $task_id,
      task_subject: $subject,
      task_status: $status,
      task_description: $desc,
      backlog_ref: $backlog_ref,
      session_id: $session,
      updated_at: $ts
    }
  }')

# Search for existing node with same task_id to update vs create
EXISTING=$(node --experimental-sqlite "$CLI_PATH" search_memory_text \
  "{\"agent_id\":\"${AGENT_ID}\",\"query\":\"Task #${TASK_ID}:\",\"limit\":3}" 2>/dev/null \
  | jq -r ".results[]? | select(.metadata.task_id == \"${TASK_ID}\") | .node_id // empty" 2>/dev/null \
  | head -1)

if [ -n "$EXISTING" ]; then
  node --experimental-sqlite "$CLI_PATH" add_observations \
    "{\"node_id\":\"${EXISTING}\",\"observations\":[\"[${TIMESTAMP}] Status → ${TASK_STATUS}: ${TASK_SUBJECT}\"]}" 2>/dev/null
else
  node --experimental-sqlite "$CLI_PATH" create_memory_node "$PAYLOAD" 2>/dev/null
fi

exit 0
