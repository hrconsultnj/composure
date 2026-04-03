#!/bin/bash
# Graph Update Hook — PostToolUse on Edit|Write
# Triggers incremental graph update for changed source files.
# Works in main conversation AND sub-agents.
# Non-blocking (exit 0 always). Timeout: 15 seconds.

# Read tool input from stdin
INPUT=$(cat)
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty' 2>/dev/null)

[ -z "$FILE_PATH" ] && exit 0

# Only update for source files the parser handles
case "$FILE_PATH" in
  *.tsx|*.ts|*.jsx|*.js|*.py|*.go|*.rs) ;;
  *) exit 0 ;;
esac

# Skip generated/vendored directories
case "$FILE_PATH" in
  */node_modules/*|*/.next/*|*/dist/*|*/.expo/*) exit 0 ;;
  */.code-review-graph/*) exit 0 ;;
esac

# Find update.js — try CLAUDE_PLUGIN_ROOT first, then fall back to searching
# the plugin cache. Sub-agents may not have CLAUDE_PLUGIN_ROOT set.
GRAPH_UPDATE=""

if [ -n "$CLAUDE_PLUGIN_ROOT" ] && [ -f "${CLAUDE_PLUGIN_ROOT}/graph/dist/update.js" ]; then
  GRAPH_UPDATE="${CLAUDE_PLUGIN_ROOT}/graph/dist/update.js"
else
  # Search common plugin cache locations
  for CACHE_DIR in \
    "${HOME}/.claude/plugins/cache/my-claude-plugins/composure" \
    "${USERPROFILE}/.claude/plugins/cache/my-claude-plugins/composure" \
    "${APPDATA}/.claude/plugins/cache/my-claude-plugins/composure"; do
    if [ -d "$CACHE_DIR" ]; then
      # Find the latest version directory
      LATEST=$(ls -td "$CACHE_DIR"/*/ 2>/dev/null | head -1)
      if [ -n "$LATEST" ] && [ -f "${LATEST}graph/dist/update.js" ]; then
        GRAPH_UPDATE="${LATEST}graph/dist/update.js"
        break
      fi
    fi
  done
fi

[ -z "$GRAPH_UPDATE" ] && exit 0

# Run incremental update for this single file
node --experimental-sqlite "$GRAPH_UPDATE" --file "$FILE_PATH" 2>/dev/null || true

exit 0
