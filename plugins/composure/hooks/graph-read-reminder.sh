#!/bin/bash
# ============================================================
# Graph Read Reminder — PostToolUse Hook
# ============================================================
# After graph queries return file paths, reminds Claude to Read
# those files instead of treating graph results as the final answer.
# Non-blocking (exit 0 always). Session-deduped (once per graph batch).

# Only act on graph MCP tool calls
TOOL_NAME="${TOOL_USE_NAME:-$1}"
case "$TOOL_NAME" in
  *composure-graph*semantic_search*|*composure-graph*query_graph*|*composure-graph*search_references*|*composure-graph*get_impact*|*composure-graph*get_dependency*)
    ;;
  *) exit 0 ;;
esac

# Session dedup — only remind once per "graph batch" (resets after a Read)
SESSION_ID="${CLAUDE_SESSION_ID:-$$}"
MARKER="/tmp/composure-graph-remind-${SESSION_ID}"

# If marker exists, we already reminded and Claude hasn't Read yet — don't spam
[ -f "$MARKER" ] && exit 0

# Read tool output from stdin to check if it returned file paths
OUTPUT=$(cat)
if echo "$OUTPUT" | grep -q '"file_path"'; then
  # Graph returned file paths — set marker and remind
  touch "$MARKER"
  printf '{"systemMessage":"GRAPH RESULTS → READ FILES: The graph returned file paths. Read the key files (Read tool) before presenting findings. Graph shows structure; file content shows domain details, comments, and implementation patterns. Cost: $0.005/file vs $0.15/agent. Do NOT spawn agents to read these files."}\n'
fi

exit 0
