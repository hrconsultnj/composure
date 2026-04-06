#!/bin/bash
# ============================================================
# Resume Check — Lightweight SessionStart (resume) Hook
# ============================================================
# Reports open task counts and graph staleness on session resume.
# Replaces the agent hook with a fast command hook (per docs,
# SessionStart only supports type: "command").
#
# Output is injected as context for Claude, who can surface
# relevant info to the user.
#
# Non-blocking (exit 0 always). Timeout: 10 seconds.
# ============================================================

PROJECT_DIR="${CLAUDE_PROJECT_DIR:-.}"

# Skip entirely if Composure not initialized — init-check already tells them
# Dual-read: .composure/ first, .claude/ fallback
if [ -f "$PROJECT_DIR/.composure/no-bandaids.json" ]; then
  ACTIVE_CONFIG="$PROJECT_DIR/.composure/no-bandaids.json"
elif [ -f "$PROJECT_DIR/.claude/no-bandaids.json" ]; then
  ACTIVE_CONFIG="$PROJECT_DIR/.claude/no-bandaids.json"
else
  exit 0
fi

# Resolve plugin root with cache fallback (sub-agents may not have CLAUDE_PLUGIN_ROOT)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/../lib/resolve-plugin-root.sh"

# Version sync moved to session-boot.sh — no longer duplicated here

TASKS_FILE="$PROJECT_DIR/tasks-plans/tasks.md"
GRAPH_DB="$PROJECT_DIR/.code-review-graph/graph.db"

PARTS=()
OPEN=0
DONE=0

# ── Check tasks ──
if [ -f "$TASKS_FILE" ]; then
  OPEN=$(grep -c '^\- \[ \]' "$TASKS_FILE" 2>/dev/null)
  [ -z "$OPEN" ] && OPEN=0
  DONE=$(grep -c '^\- \[x\]' "$TASKS_FILE" 2>/dev/null)
  [ -z "$DONE" ] && DONE=0

  if [ "$OPEN" -gt 0 ]; then
    PARTS+=("Tasks: ${OPEN} open, ${DONE} done. Run /composure:backlog to process.")
  fi
fi

# ── Check graph staleness ──
GRAPH_STALE=0
if [ -f "$GRAPH_DB" ]; then
  # Get graph file modification time vs latest git commit time
  GRAPH_MOD=$(stat -f %m "$GRAPH_DB" 2>/dev/null || stat -c %Y "$GRAPH_DB" 2>/dev/null)
  LAST_COMMIT=$(git -C "${CLAUDE_PROJECT_DIR:-.}" log -1 --format=%ct 2>/dev/null)

  if [ -n "$GRAPH_MOD" ] && [ -n "$LAST_COMMIT" ] && [ "$LAST_COMMIT" -gt "$GRAPH_MOD" ]; then
    GRAPH_STALE=1
    PARTS+=("Code graph is stale.")
  fi
else
  GRAPH_STALE=1
  PARTS+=("No code graph found.")
fi

# ── Output ──
if [ ${#PARTS[@]} -eq 0 ]; then
  # Everything clean — say nothing
  exit 0
fi

printf "[composure:resume] %s" "${PARTS[0]}"
for ((i=1; i<${#PARTS[@]}; i++)); do
  printf " | %s" "${PARTS[$i]}"
done
echo

# High task count hint
if [ "$OPEN" -gt 5 ]; then
  echo "[composure:hint] ${OPEN} open tasks is high. Mention this early — the user may want to clear the backlog before adding more work."
fi

# Stale/missing graph: instruct Claude to build BEFORE any work
if [ "$GRAPH_STALE" -eq 1 ]; then
  GRAPH_SERVER_JS="${COMPOSURE_ROOT}/graph/dist/server.js"
  MCP_AVAILABLE=0
  [ -n "$COMPOSURE_ROOT" ] && [ -f "$GRAPH_SERVER_JS" ] && MCP_AVAILABLE=1

  if [ "$MCP_AVAILABLE" -eq 1 ]; then
    echo '[composure:MANDATORY] Code graph stale — run build_or_update_graph({ full_rebuild: true }) before other work.'
    echo '[composure:hint] Graph for structure (query_graph, get_impact_radius, semantic_search_nodes). Explore agents only for intent/business-logic.'
  else
    echo '[composure:MANDATORY] Code graph stale + MCP may be disconnected. Run /composure:build-graph or restart Claude Code.'
  fi
fi

exit 0
