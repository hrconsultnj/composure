#!/bin/bash
# ============================================================
# Subagent Tracker — fires on SubagentStart / SubagentStop
# ============================================================
# Tracks agent lifecycle in Cortex. Powers the "N agents active"
# status in the Cabin dashboard.
set -e

INPUT=$(cat)

# Extract agent data from event payload
AGENT_NAME=$(echo "$INPUT" | jq -r '.name // .agent_name // .agentId // "unnamed"' 2>/dev/null)
AGENT_DESC=$(echo "$INPUT" | jq -r '.description // .prompt // empty' 2>/dev/null | head -c 200)
EVENT_TYPE="${CLAUDE_HOOK_EVENT_NAME:-unknown}"

# Determine if this is start or stop
case "$EVENT_TYPE" in
  SubagentStart) STATUS="started" ;;
  SubagentStop)  STATUS="completed" ;;
  *)             STATUS="unknown" ;;
esac

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

CONTENT="Subagent ${STATUS}: ${AGENT_NAME}"
[ -n "$AGENT_DESC" ] && CONTENT="${CONTENT} — ${AGENT_DESC}"

PAYLOAD=$(jq -n \
  --arg agent_id "$AGENT_ID" \
  --arg content "$CONTENT" \
  --arg subagent_name "$AGENT_NAME" \
  --arg status "$STATUS" \
  --arg session "$SESSION_ID" \
  --arg ts "$TIMESTAMP" \
  '{
    agent_id: $agent_id,
    content: $content,
    content_type: "observation",
    metadata: {
      category: "agent",
      tags: ["subagent", $status, "auto-captured"],
      subagent_name: $subagent_name,
      subagent_status: $status,
      session_id: $session,
      captured_at: $ts
    }
  }')

if [ "$STATUS" = "completed" ]; then
  # Update existing node if we created one on start
  EXISTING=$(node --experimental-sqlite "$CLI_PATH" search_memory_text \
    "{\"agent_id\":\"${AGENT_ID}\",\"query\":\"Subagent started: ${AGENT_NAME}\",\"limit\":1}" 2>/dev/null \
    | jq -r '.results[0]?.node_id // empty' 2>/dev/null)

  if [ -n "$EXISTING" ]; then
    node --experimental-sqlite "$CLI_PATH" add_observations \
      "{\"node_id\":\"${EXISTING}\",\"observations\":[\"[${TIMESTAMP}] Subagent completed: ${AGENT_NAME}\"]}" 2>/dev/null
  else
    node --experimental-sqlite "$CLI_PATH" create_memory_node "$PAYLOAD" 2>/dev/null
  fi
else
  node --experimental-sqlite "$CLI_PATH" create_memory_node "$PAYLOAD" 2>/dev/null
fi

exit 0
