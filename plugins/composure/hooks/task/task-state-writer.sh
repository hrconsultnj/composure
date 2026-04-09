#!/bin/bash
# PostToolUse hook: write current in-progress task to .composure/current-task.json
# AND sync task state to Cortex for cross-session persistence.
# Fires on TaskCreate, TaskUpdate, TaskList tool calls.
# Contract file between task system and context-resolver.ts + seq-think capture.
set -e

INPUT=$(cat)

TOOL_NAME=$(echo "$INPUT" | jq -r '.tool_name // empty' 2>/dev/null)
if [[ "$TOOL_NAME" != "TaskCreate" && "$TOOL_NAME" != "TaskUpdate" && "$TOOL_NAME" != "TaskList" ]]; then
  exit 0
fi

PROJECT_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
TASK_FILE="${PROJECT_ROOT}/.composure/current-task.json"

mkdir -p "$(dirname "$TASK_FILE")" 2>/dev/null

# Extract task data from tool input + result
TOOL_INPUT=$(echo "$INPUT" | jq -c '.tool_input // {}' 2>/dev/null || echo "{}")
RESULT=$(echo "$INPUT" | jq -c '.tool_result // {}' 2>/dev/null || echo "{}")

# Try to find an in-progress task from the result
IN_PROGRESS=$(echo "$RESULT" | jq -c '
  if .tasks then
    [.tasks[] | select(.status == "in_progress")] | .[0] // null
  elif .status == "in_progress" then
    .
  else
    null
  end
' 2>/dev/null || echo "null")

if [ "$IN_PROGRESS" = "null" ] || [ -z "$IN_PROGRESS" ]; then
  # No task in progress — write null values
  jq -n --arg updated "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
    '{ task_id: null, task_subject: null, updated_at: $updated }' \
    > "$TASK_FILE" 2>/dev/null &
else
  # Write the current task
  TASK_ID=$(echo "$IN_PROGRESS" | jq -r '.id // .taskId // empty')
  TASK_SUBJECT=$(echo "$IN_PROGRESS" | jq -r '.subject // empty')
  jq -n \
    --arg id "$TASK_ID" \
    --arg subject "$TASK_SUBJECT" \
    --arg updated "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
    '{ task_id: $id, task_subject: $subject, updated_at: $updated }' \
    > "$TASK_FILE" 2>/dev/null &
fi

# ── Cortex Sync: persist task state across sessions ────────────
# On TaskCreate or TaskUpdate, write task to Cortex memory so the
# next session on this project can restore pending tasks.
# Follows the memory-fusion.sh pattern: CLI call, backgrounded.
if [[ "$TOOL_NAME" == "TaskCreate" || "$TOOL_NAME" == "TaskUpdate" ]]; then
  SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
  CLI_PATH="${SCRIPT_DIR}/../../cortex/dist/cli.bundle.js"

  if [ -f "$CLI_PATH" ] && [ -f "${HOME}/.composure/cortex/cortex.db" ]; then
    AGENT_ID="$(basename "${CLAUDE_PROJECT_DIR:-$(basename "$PROJECT_ROOT")}")"
    TIMESTAMP="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
    SESSION_ID="${CLAUDE_SESSION_ID:-unknown}"

    # Extract task fields from tool input (TaskCreate/Update provide these)
    T_ID=$(echo "$TOOL_INPUT" | jq -r '.taskId // .id // empty' 2>/dev/null)
    T_SUBJECT=$(echo "$TOOL_INPUT" | jq -r '.subject // empty' 2>/dev/null)
    T_STATUS=$(echo "$TOOL_INPUT" | jq -r '.status // "pending"' 2>/dev/null)
    T_DESC=$(echo "$TOOL_INPUT" | jq -r '.description // empty' 2>/dev/null)

    # For TaskCreate, ID comes from the result, not input
    if [ "$TOOL_NAME" = "TaskCreate" ]; then
      T_ID=$(echo "$RESULT" | jq -r '.id // .taskId // empty' 2>/dev/null)
      T_STATUS="pending"
    fi

    # Skip if we couldn't extract meaningful data
    if [ -n "$T_ID" ] || [ -n "$T_SUBJECT" ]; then
      CONTENT="Task #${T_ID}: ${T_SUBJECT} [${T_STATUS}]"
      [ -n "$T_DESC" ] && CONTENT="${CONTENT} — ${T_DESC}"

      PAYLOAD=$(jq -n \
        --arg agent_id "$AGENT_ID" \
        --arg content "$CONTENT" \
        --arg task_id "$T_ID" \
        --arg subject "$T_SUBJECT" \
        --arg status "$T_STATUS" \
        --arg desc "$T_DESC" \
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
            session_id: $session,
            updated_at: $ts
          }
        }')

      # Search for existing node with same task_id to update vs create
      EXISTING=$(node --experimental-sqlite "$CLI_PATH" search_memory_text \
        "{\"agent_id\":\"${AGENT_ID}\",\"query\":\"Task #${T_ID}:\",\"limit\":3}" 2>/dev/null \
        | jq -r ".results[]? | select(.metadata.task_id == \"${T_ID}\") | .node_id // empty" 2>/dev/null \
        | head -1)

      if [ -n "$EXISTING" ]; then
        # Update existing task node with new status/observations
        node --experimental-sqlite "$CLI_PATH" add_observations \
          "{\"node_id\":\"${EXISTING}\",\"observations\":[\"[${TIMESTAMP}] Status → ${T_STATUS}: ${T_SUBJECT}\"]}" 2>/dev/null
      else
        # Create new task node
        node --experimental-sqlite "$CLI_PATH" create_memory_node "$PAYLOAD" 2>/dev/null
      fi
    fi
  fi &
fi

exit 0
