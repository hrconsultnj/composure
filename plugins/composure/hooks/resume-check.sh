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
[ ! -f "$PROJECT_DIR/.claude/no-bandaids.json" ] && exit 0

# ── Auto-sync composureVersion on every resume ──
PLUGIN_VERSION=$(jq -r '.version // ""' "${CLAUDE_PLUGIN_ROOT}/.claude-plugin/plugin.json" 2>/dev/null)
PROJECT_VERSION=$(jq -r '.composureVersion // ""' "$PROJECT_DIR/.claude/no-bandaids.json" 2>/dev/null)
if [ -n "$PLUGIN_VERSION" ] && [ -n "$PROJECT_VERSION" ] && [ "$PLUGIN_VERSION" != "$PROJECT_VERSION" ]; then
  jq --arg v "$PLUGIN_VERSION" '.composureVersion = $v' "$PROJECT_DIR/.claude/no-bandaids.json" > "$PROJECT_DIR/.claude/no-bandaids.json.tmp" \
    && mv "$PROJECT_DIR/.claude/no-bandaids.json.tmp" "$PROJECT_DIR/.claude/no-bandaids.json" 2>/dev/null
  printf '[composure] Config synced: composureVersion %s → %s\n' "$PROJECT_VERSION" "$PLUGIN_VERSION"
fi

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
  GRAPH_SERVER_JS="${CLAUDE_PLUGIN_ROOT}/graph/dist/server.js"
  MCP_AVAILABLE=0
  [ -n "$CLAUDE_PLUGIN_ROOT" ] && [ -f "$GRAPH_SERVER_JS" ] && MCP_AVAILABLE=1

  if [ "$MCP_AVAILABLE" -eq 1 ]; then
    cat <<'EOMSG'
[composure:MANDATORY] Code graph is stale or missing. You MUST call build_or_update_graph({ full_rebuild: true }) BEFORE doing any other work — no exceptions. Do NOT use Explore agents for structural questions when graph MCP tools exist. The graph costs 15 seconds and 0 tokens. An explore agent costs 5-20K tokens per query.

After building, use graph tools FIRST for: file imports (query_graph), callers/dependents (get_impact_radius), finding code (semantic_search_nodes), function sizes (find_large_functions), string references (query_graph pattern: "references_of" with target as search string, optional scope/context_lines/max_results), dependency chains (query_graph pattern: "dependency_chain" with target + target_to). Only use Explore agents for understanding INTENT (business logic, why something was coded a certain way) — never for STRUCTURE.
EOMSG
  else
    cat <<'EOMSG'
[composure:MANDATORY] Code graph is stale or missing, and the composure-graph MCP server may not be connected. Run /composure:build-graph to attempt the build. If the MCP tool is unavailable, tell the user to restart Claude Code — the plugin auto-registers the MCP server via .mcp.json.
EOMSG
  fi
fi

exit 0
