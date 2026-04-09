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
GRAPH_DB="$PROJECT_DIR/.composure/graph/graph.db"
[ ! -f "$GRAPH_DB" ] && GRAPH_DB="$PROJECT_DIR/.code-review-graph/graph.db"

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

# ── Check Cortex for pending tasks from previous sessions ──
CORTEX_DB="${HOME}/.composure/cortex/cortex.db"
if [ -f "$CORTEX_DB" ]; then
  CORTEX_CLI="${CLAUDE_PLUGIN_ROOT}/cortex/dist/cli.bundle.js"
  # Fallback: resolve from script location if CLAUDE_PLUGIN_ROOT not set
  if [ ! -f "$CORTEX_CLI" ]; then
    CORTEX_CLI="${SCRIPT_DIR}/../../cortex/dist/cli.bundle.js"
  fi

  if [ -f "$CORTEX_CLI" ]; then
    AGENT_ID="$(basename "${CLAUDE_PROJECT_DIR:-$(pwd)}")"

    # Query with 2s timeout — must not block session start
    CORTEX_RAW=$(timeout 2 node --experimental-sqlite "$CORTEX_CLI" search_memory_text \
      "{\"agent_id\":\"${AGENT_ID}\",\"query\":\"Task #\",\"limit\":20}" 2>/dev/null || true)

    if [ -n "$CORTEX_RAW" ]; then
      # Extract pending tasks as JSON lines (task_id, subject, status, backlog_ref)
      PENDING_JSON=$(echo "$CORTEX_RAW" | jq -c '
        .results[]?
        | select(
            .metadata.task_status != null and
            .metadata.task_status != "completed" and
            .metadata.task_status != "deleted"
          )
        | {
            tid: .metadata.task_id,
            subject: .metadata.task_subject,
            status: .metadata.task_status,
            ref: (.metadata.backlog_ref // "")
          }
      ' 2>/dev/null || true)

      # Validate backlog_refs against on-disk state
      VALID_LINES=""
      STALE_LINES=""
      STALE_COUNT=0
      while IFS= read -r row; do
        [ -z "$row" ] && continue
        TID=$(echo "$row" | jq -r '.tid')
        SUBJ=$(echo "$row" | jq -r '.subject')
        STAT=$(echo "$row" | jq -r '.status')
        REF=$(echo "$row" | jq -r '.ref')
        LINE="- Task #${TID}: ${SUBJ} [${STAT}]"

        if [ -n "$REF" ]; then
          REF_FILE="${PROJECT_DIR}/$(echo "$REF" | cut -d'#' -f1)"
          if [ -f "$REF_FILE" ]; then
            ANCHOR=$(echo "$REF" | cut -d'#' -f2)
            if grep -q "^\- \[ \].*${ANCHOR}" "$REF_FILE" 2>/dev/null; then
              VALID_LINES="${VALID_LINES}${LINE} (linked: ${REF})"$'\n'
            else
              STALE_LINES="${STALE_LINES}${LINE} (completed in backlog)"$'\n'
              STALE_COUNT=$((STALE_COUNT + 1))
            fi
          else
            STALE_LINES="${STALE_LINES}${LINE} (source file removed)"$'\n'
            STALE_COUNT=$((STALE_COUNT + 1))
          fi
        else
          VALID_LINES="${VALID_LINES}${LINE}"$'\n'
        fi
      done <<< "$PENDING_JSON"

      # Trim trailing newlines
      VALID_LINES=$(printf '%s' "$VALID_LINES" | sed '/^$/d')
      STALE_LINES=$(printf '%s' "$STALE_LINES" | sed '/^$/d')

      if [ -n "$VALID_LINES" ]; then
        PARTS+=("Cortex tasks from previous sessions:")
        CORTEX_TASK_LIST="$VALID_LINES"
      fi
      if [ -n "$STALE_LINES" ]; then
        CORTEX_STALE_LIST="$STALE_LINES"
      fi
    fi
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

# Separate Cortex task block from inline parts
INLINE_PARTS=()
HAS_CORTEX_TASKS=0
for part in "${PARTS[@]}"; do
  if [ "$part" = "Cortex tasks from previous sessions:" ]; then
    HAS_CORTEX_TASKS=1
  else
    INLINE_PARTS+=("$part")
  fi
done

if [ ${#INLINE_PARTS[@]} -gt 0 ]; then
  printf "[composure:resume] %s" "${INLINE_PARTS[0]}"
  for ((i=1; i<${#INLINE_PARTS[@]}; i++)); do
    printf " | %s" "${INLINE_PARTS[$i]}"
  done
  echo
fi

# Cortex pending tasks get their own block for readability
if [ "$HAS_CORTEX_TASKS" -eq 1 ] && [ -n "${CORTEX_TASK_LIST:-}" ]; then
  echo "[composure:resume] Cortex tasks from previous sessions:"
  echo "$CORTEX_TASK_LIST"
fi

# Stale Cortex tasks (backlog_ref points to completed/removed items)
if [ -n "${CORTEX_STALE_LIST:-}" ]; then
  echo "[composure:hint] ${STALE_COUNT:-0} stale task(s) found (backlog items already completed or removed):"
  echo "$CORTEX_STALE_LIST"
fi

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
