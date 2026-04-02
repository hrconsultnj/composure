#!/bin/bash
# ============================================================
# Graph Read Clear — PreToolUse Hook (lightweight)
# ============================================================
# Clears the graph-read-reminder marker when Claude does a Read.
# This prevents the reminder from firing again until the next graph query batch.

TOOL_NAME="${TOOL_USE_NAME:-$1}"
[ "$TOOL_NAME" != "Read" ] && exit 0

SESSION_ID="${CLAUDE_SESSION_ID:-$$}"
MARKER="/tmp/composure-graph-remind-${SESSION_ID}"
rm -f "$MARKER" 2>/dev/null

exit 0
