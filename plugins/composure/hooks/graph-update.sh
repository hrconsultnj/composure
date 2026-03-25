#!/bin/bash
# Graph Update Hook — PostToolUse on Edit|Write
# Triggers incremental graph update for changed source files.
# Non-blocking (exit 0 always). Timeout: 15 seconds.

# Read tool input from stdin
INPUT=$(cat)
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty' 2>/dev/null)

[ -z "$FILE_PATH" ] && exit 0

# Only update for source files the parser handles
case "$FILE_PATH" in
  *.tsx|*.ts|*.jsx|*.js) ;;
  *) exit 0 ;;
esac

# Skip generated/vendored directories
case "$FILE_PATH" in
  */node_modules/*|*/.next/*|*/dist/*|*/.expo/*) exit 0 ;;
  */.code-review-graph/*) exit 0 ;;
esac

# Check if graph dist exists (graph may not be built yet)
GRAPH_UPDATE="${CLAUDE_PLUGIN_ROOT}/graph/dist/update.js"
[ ! -f "$GRAPH_UPDATE" ] && exit 0

# Run incremental update for this single file
node --experimental-sqlite "$GRAPH_UPDATE" --file "$FILE_PATH" 2>/dev/null || true

exit 0
