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

TASKS_FILE="${CLAUDE_PROJECT_DIR:-.}/tasks-plans/tasks.md"
GRAPH_DB="${CLAUDE_PROJECT_DIR:-.}/.code-review-graph/graph.db"

PARTS=()

# ── Check tasks ──
if [ -f "$TASKS_FILE" ]; then
  OPEN=$(grep -c '^\- \[ \]' "$TASKS_FILE" 2>/dev/null)
  [ -z "$OPEN" ] && OPEN=0
  DONE=$(grep -c '^\- \[x\]' "$TASKS_FILE" 2>/dev/null)
  [ -z "$DONE" ] && DONE=0

  if [ "$OPEN" -gt 0 ]; then
    PARTS+=("Tasks: ${OPEN} open, ${DONE} done. Run /composure:review-tasks to process.")
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
if [ "$OPEN" -gt 5 ] 2>/dev/null; then
  echo "[composure:hint] ${OPEN} open tasks is high. Mention this early — the user may want to clear the backlog before adding more work."
fi

# Stale graph: instruct Claude to rebuild BEFORE doing any work
if [ "$GRAPH_STALE" -eq 1 ]; then
  echo "[composure:action-required] The code graph is stale or missing. BEFORE starting any feature work, bug fix, or exploration, rebuild it using the build_or_update_graph MCP tool. Tell the user: 'One moment — rebuilding the code graph so I can map impact accurately instead of exploring blind.' This prevents expensive Explore agent sprawl (30+ file reads) that a single graph query would replace."
fi

exit 0
