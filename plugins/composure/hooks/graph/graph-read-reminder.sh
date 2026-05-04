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
  # Graph returned file paths — set marker and emit cue (Stage 5b conversion).
  # Phase 2: hooks that catch IGNORANCE convert from BLOCK to CUE per noise-reduction-moat.
  touch "$MARKER"
  printf '{"systemMessage":"[graph] Returned file paths. Read directly (~$0.005/file) for content; spawning agents on these is overkill. Graph = structure, file content = domain detail."}\n'
fi

exit 0
