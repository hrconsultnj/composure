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

# Stage 5c (2026-05-03): inline output for tasks-open count, high-task hint, and
# graph-stale MANDATORY removed — the digest at by-project/<proj>/<date>/<sid>/
# session-<sid8>.md absorbs all three (Project state section). The model reads
# the digest on-demand via the [sessions] cue. KEEPING below: Cortex pending-task
# AskUserQuestion (interactive, must run inline before first response) + stale
# Cortex tasks hint (data-integrity warning, not info).

# Cortex pending tasks: AskUserQuestion is INTERACTIVE — must stay inline so the
# model asks the user before silently dropping prior work.
if [ "$HAS_CORTEX_TASKS" -eq 1 ] && [ -n "${CORTEX_TASK_LIST:-}" ]; then
  CORTEX_TASK_COUNT=$(echo "$CORTEX_TASK_LIST" | grep -c '^- ' 2>/dev/null || echo 0)
  echo "[composure:resume] Cortex tasks from previous sessions:"
  echo "$CORTEX_TASK_LIST"
  echo "[composure:MANDATORY] Use AskUserQuestion to ask: \"${CORTEX_TASK_COUNT} pending task(s) from previous sessions. Restore them into this session?\" Options: (1) Restore all — recreate as TaskCreate entries, (2) Pick which to restore — show the list and let user choose, (3) Skip — start fresh. Do NOT auto-restore without asking."
fi

# Stale Cortex tasks: data-integrity warning (backlog_ref points to completed/removed
# items) — kept inline because it indicates an inconsistency the digest can't capture.
if [ -n "${CORTEX_STALE_LIST:-}" ]; then
  echo "[composure:hint] ${STALE_COUNT:-0} stale task(s) found (backlog items already completed or removed):"
  echo "$CORTEX_STALE_LIST"
fi

# ── Export plugin root for CLI usage ──
# Agents need this to run Cortex/Graph CLI commands manually.
# Without it, agents guess wrong paths (e.g., ~/.claude/plugins/composure/).
if [ -n "$COMPOSURE_ROOT" ]; then
  echo "[composure:plugin-root] ${COMPOSURE_ROOT}"
fi

exit 0
