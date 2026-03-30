#!/bin/bash
# Launch the composure-graph MCP server from the latest cached plugin version.
# Registered via: claude mcp add composure-graph -- bash ~/.claude/plugins/composure-graph-launcher.sh
# Survives plugin updates because it resolves the path at launch time, not registration time.

# Find the latest composure plugin version in cache
CACHE_BASE="${HOME}/.claude/plugins/cache/my-claude-plugins/composure"
[ ! -d "$CACHE_BASE" ] && CACHE_BASE="${USERPROFILE}/.claude/plugins/cache/my-claude-plugins/composure"
[ ! -d "$CACHE_BASE" ] && CACHE_BASE="${APPDATA}/.claude/plugins/cache/my-claude-plugins/composure"

if [ ! -d "$CACHE_BASE" ]; then
  echo "Composure plugin not found in cache" >&2
  exit 1
fi

# Pick the highest version directory (sort by version number, not mtime)
LATEST=$(ls -d "$CACHE_BASE"/*/ 2>/dev/null | sort -V | tail -1)

if [ -z "$LATEST" ] || [ ! -f "${LATEST}graph/dist/server.js" ]; then
  echo "composure-graph server.js not found in ${LATEST:-$CACHE_BASE}" >&2
  exit 1
fi

exec node --experimental-sqlite "${LATEST}graph/dist/server.js" "$@"
