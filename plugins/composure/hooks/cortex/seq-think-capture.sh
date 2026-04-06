#!/bin/bash
# PostToolUse hook: capture sequential thinking into Cortex with full context
# Runs after any tool call; short-circuits unless the tool was mcp__sequential-thinking__sequentialthinking
set -e

INPUT=$(cat)

# Extract tool name — only proceed if sequential thinking
TOOL_NAME=$(echo "$INPUT" | jq -r '.tool_name // empty' 2>/dev/null)
if [ "$TOOL_NAME" != "mcp__sequential-thinking__sequentialthinking" ]; then
  exit 0
fi

# Extract the full tool input
TOOL_INPUT=$(echo "$INPUT" | jq -c '.tool_input // {}')
THOUGHT=$(echo "$TOOL_INPUT" | jq -r '.thought // empty')
if [ -z "$THOUGHT" ]; then
  exit 0
fi

# Extract surrounding conversation context from the hook input snapshot
USER_MESSAGE=$(echo "$INPUT" | jq -c '.session.last_user_message // null' 2>/dev/null || echo "null")
ASSISTANT_PRIOR=$(echo "$INPUT" | jq -c '.session.last_assistant_turn // null' 2>/dev/null || echo "null")

# Resolve project + task context
PROJECT_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
PROJECT_NAME="$(basename "$PROJECT_ROOT")"
SESSION_TITLE="${CLAUDE_SESSION_TITLE:-${PROJECT_NAME}-thinking}"

# Build the full capture payload
PAYLOAD=$(jq -n \
  --arg thought "$THOUGHT" \
  --argjson tool_input "$TOOL_INPUT" \
  --argjson user_message "$USER_MESSAGE" \
  --argjson assistant_prior "$ASSISTANT_PRIOR" \
  --arg project_root "$PROJECT_ROOT" \
  --arg project_name "$PROJECT_NAME" \
  --arg session_title "$SESSION_TITLE" \
  '{
    thought: $thought,
    tool_input: $tool_input,
    user_message: $user_message,
    assistant_prior_turn: $assistant_prior,
    project_root: $project_root,
    project_name: $project_name,
    session_title: $session_title,
    source: "seq-thinking-mcp",
    captured_at: now
  }')

# Shell out to cortex CLI — fire-and-forget, never blocks the tool result
node "${CLAUDE_PLUGIN_ROOT}/cortex/dist/cli.bundle.js" capture_thought "$PAYLOAD" 2>/dev/null &

exit 0
