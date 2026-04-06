#!/bin/bash
# PostToolUse hook: write current in-progress task to .composure/current-task.json
# Fires on TaskCreate, TaskUpdate, TaskList tool calls
# Contract file between task system and context-resolver.ts + seq-think capture
set -e

INPUT=$(cat)

TOOL_NAME=$(echo "$INPUT" | jq -r '.tool_name // empty' 2>/dev/null)
if [[ "$TOOL_NAME" != "TaskCreate" && "$TOOL_NAME" != "TaskUpdate" && "$TOOL_NAME" != "TaskList" ]]; then
  exit 0
fi

PROJECT_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
TASK_FILE="${PROJECT_ROOT}/.composure/current-task.json"

mkdir -p "$(dirname "$TASK_FILE")" 2>/dev/null

# Extract in-progress task from tool result
# TaskList returns .tasks array, TaskCreate/Update return the single task
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

exit 0
