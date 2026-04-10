#!/bin/bash
# ============================================================
# Session Boot — Consolidated SessionStart Hook
# ============================================================
# Consolidated SessionStart hook. Single config read, single output block.
#
# Responsibilities:
#   1. Auto-bootstrap .composure/ if not initialized
#   2. Version sync (composureVersion stamp)
#   3. Stack detection + architecture guidance
#   4. Cortex memory injection (project + global + recent activity on resume)
#   5. Companion plugin auto-install + config check
#   6. Health drift check (24h throttled)
#   7. Task count + graph staleness (was resume-check.sh)
#   8. Guardrails ruleset detection (was guardrails-load.sh)
#
# Lifecycle-aware via stdin JSON `source` field:
#   startup → full boot (all 8 sections)
#   resume  → compact (stack 1-liner + cortex + recent + tasks + graph)
#
# Non-blocking (exit 0 always). Timeout: 8 seconds.
# ============================================================

# ── Read lifecycle event from stdin ──────────────────────────
INPUT=""
if read -t 2 -r INPUT_LINE 2>/dev/null; then
  INPUT="$INPUT_LINE"
fi
EVENT=$(echo "$INPUT" | jq -r '.source // "startup"' 2>/dev/null)
[ -z "$EVENT" ] && EVENT="startup"
SESSION_ID=$(echo "$INPUT" | jq -r '.session_id // ""' 2>/dev/null)

PROJECT_DIR="${CLAUDE_PROJECT_DIR:-.}"

# ── Resolve plugin root ─────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/../lib/resolve-plugin-root.sh"

# ── Auto-update health check (24h throttled, global concern) ──
# Runs before project-type detection so workspace/folder sessions
# also get warnings about misconfigured auto-update.
source "${SCRIPT_DIR}/../lib/auto-update-check.sh"

# ── Detect project type ────────────────────────────────────
source "${SCRIPT_DIR}/../lib/detect-project-type.sh"
echo "[composure:project-type] ${PROJECT_TYPE}"

# ── workspace/folder: minimal boot — Cortex identity only ──
case "$PROJECT_TYPE" in
  workspace|folder)
    if [ "$HAS_CLAUDE_HISTORY" -eq 1 ]; then
      printf '[composure:context] %s (%s) — Claude has session history here\n' "$(basename "$PROJECT_DIR")" "$PROJECT_TYPE"
    else
      printf '[composure:context] %s (%s)\n' "$(basename "$PROJECT_DIR")" "$PROJECT_TYPE"
    fi

    # Cortex global memory injection (cross-project awareness)
    CLI_PATH="${COMPOSURE_ROOT}/cortex/dist/cli.bundle.js"
    if [ -f "$CLI_PATH" ] && [ -f "${HOME}/.composure/cortex/cortex.db" ]; then
      GLOBAL_MEMORIES=$(node --experimental-sqlite "$CLI_PATH" search_memory \
        "{\"agent_id\":\"global\",\"limit\":5,\"tags\":[\"cross-project\"]}" 2>/dev/null)
      GLOBAL_COUNT=$(echo "$GLOBAL_MEMORIES" | jq -r '.count // 0' 2>/dev/null)

      if [ "${GLOBAL_COUNT:-0}" -gt 0 ]; then
        printf '[cortex] Global memories: %d cross-project\n' "$GLOBAL_COUNT"
        echo "$GLOBAL_MEMORIES" | jq -r '.results[]? | "  - " + (.content // "")[0:80]' 2>/dev/null
      else
        printf '[cortex] No cross-project memories yet.\n'
      fi
    fi

    # Version sync still applies (plugin-level, not project-level)
    PLUGIN_VERSION=$(jq -r '.version // ""' "${COMPOSURE_ROOT}/.claude-plugin/plugin.json" 2>/dev/null)

    # Permissions auto-sync
    PERMS_SCRIPT="${COMPOSURE_ROOT}/bin/composure-permissions.mjs"
    if [ -f "$PERMS_SCRIPT" ] && [ -n "$PLUGIN_VERSION" ]; then
      PERMS_STAMP=""
      [ -f "${HOME}/.composure/last-permissions-sync" ] && PERMS_STAMP=$(cat "${HOME}/.composure/last-permissions-sync" 2>/dev/null)
      if [ "$PERMS_STAMP" != "$PLUGIN_VERSION" ]; then
        PERMS_OUT=$(node "$PERMS_SCRIPT" sync --plugin-version "$PLUGIN_VERSION" 2>/dev/null)
        echo "$PERMS_OUT" | grep -q "Added" && echo "$PERMS_OUT"
      fi
    fi

    # Cache prune (global maintenance — runs everywhere)
    CACHE_BASE="${HOME}/.claude/plugins/cache/composure-suite"
    if [ -d "$CACHE_BASE" ]; then
      for plugin_dir in "$CACHE_BASE"/*/; do
        [ ! -d "$plugin_dir" ] && continue
        count=0
        for ver in $(ls "$(basename "$plugin_dir" | xargs -I{} echo "$CACHE_BASE/{}")" 2>/dev/null | sort -t. -k1,1nr -k2,2nr -k3,3nr); do
          [ ! -d "${plugin_dir}${ver}" ] && continue
          count=$((count + 1))
          [ "$count" -gt 2 ] && rm -rf "${plugin_dir}${ver}"
        done
      done
      rm -rf "${HOME}/.claude/plugins/cache/temp_local_"* 2>/dev/null
    fi

    exit 0
    ;;
esac

# ── From here: PROJECT_TYPE is project or monorepo ─────────

# ── 1. Auto-bootstrap if not initialized ────────────────────
if [ ! -f "${PROJECT_DIR}/.composure/no-bandaids.json" ] && [ ! -f "${PROJECT_DIR}/.claude/no-bandaids.json" ]; then
  BOOT_VERSION=$(jq -r '.version // "0.0.0"' "${COMPOSURE_ROOT}/.claude-plugin/plugin.json" 2>/dev/null)

  # Quick stack detection (<1s)
  FRONTEND="null"; BACKEND="null"; LANG="typescript"
  [ -f "${PROJECT_DIR}/next.config.js" ] || [ -f "${PROJECT_DIR}/next.config.ts" ] || [ -f "${PROJECT_DIR}/next.config.mjs" ] && FRONTEND="nextjs"
  [ -f "${PROJECT_DIR}/vite.config.ts" ] || [ -f "${PROJECT_DIR}/vite.config.js" ] && FRONTEND="vite"
  [ -f "${PROJECT_DIR}/angular.json" ] && FRONTEND="angular"
  [ -f "${PROJECT_DIR}/app.json" ] && grep -q '"expo"' "${PROJECT_DIR}/app.json" 2>/dev/null && FRONTEND="expo"
  [ -f "${PROJECT_DIR}/supabase/config.toml" ] || [ -d "${PROJECT_DIR}/supabase/migrations" ] && BACKEND="supabase"
  [ -f "${PROJECT_DIR}/requirements.txt" ] || [ -f "${PROJECT_DIR}/pyproject.toml" ] && LANG="python"
  [ -f "${PROJECT_DIR}/go.mod" ] && LANG="go"
  [ -f "${PROJECT_DIR}/Cargo.toml" ] && LANG="rust"

  # Create directory scaffold
  mkdir -p "${PROJECT_DIR}/.composure/frameworks/generated" \
           "${PROJECT_DIR}/.composure/frameworks/project" \
           "${PROJECT_DIR}/.composure/workspaces" \
           "${PROJECT_DIR}/.composure/cortex" \
           "${PROJECT_DIR}/.composure/graph" 2>/dev/null
  mkdir -p "${PROJECT_DIR}/tasks-plans/blueprints" \
           "${PROJECT_DIR}/tasks-plans/archive" \
           "${PROJECT_DIR}/tasks-plans/docs" 2>/dev/null

  # Write .gitignore templates (only if missing)
  if [ ! -f "${PROJECT_DIR}/.composure/.gitignore" ]; then
    cat > "${PROJECT_DIR}/.composure/.gitignore" 2>/dev/null <<'EOIGNORE'
# Composure — auto-generated .gitignore
# Configs and framework docs are tracked. Generated DBs and ephemeral state are ignored.
# Customize: remove lines for paths your team wants to track.

# Graph database (rebuilt by /composure:build-graph, contains absolute paths)
graph/

# Cortex memory (per-developer, lives at ~/.composure/cortex/)
cortex/
cortex.db*

# Ephemeral session state
current-task.json
last-health-check
hook-activity.log
task-sync-debug.jsonl

# Scratch space
workspaces/
EOIGNORE
  fi

  if [ ! -f "${PROJECT_DIR}/tasks-plans/.gitignore" ]; then
    cat > "${PROJECT_DIR}/tasks-plans/.gitignore" 2>/dev/null <<'EOIGNORE'
# Composure — auto-generated .gitignore
# Backlog, blueprints, research, ideas, and audits are tracked.
# Per-developer session logs and archives are ignored.

# Per-developer daily session logs
sessions/

# Archived completed items (git history preserves them)
archive/

# Native task file (auto-generated)
.session-tasks.jsonl
EOIGNORE
  fi

  # Write minimal config
  cat > "${PROJECT_DIR}/.composure/no-bandaids.json" 2>/dev/null <<EOJSON
{
  "composureVersion": "${BOOT_VERSION}",
  "autoBootstrapped": true,
  "frameworks": {
    "${LANG}": {
      "frontend": "${FRONTEND}",
      "backend": "${BACKEND}"
    }
  }
}
EOJSON

  # Ensure global Cortex directory
  mkdir -p "${HOME}/.composure/cortex" 2>/dev/null

  # Build stack label
  STACK_MSG=""
  [ "$FRONTEND" != "null" ] && STACK_MSG="${FRONTEND}"
  [ "$BACKEND" != "null" ] && [ -n "$STACK_MSG" ] && STACK_MSG="${STACK_MSG} + ${BACKEND}"
  [ "$BACKEND" != "null" ] && [ -z "$STACK_MSG" ] && STACK_MSG="${BACKEND}"
  [ -z "$STACK_MSG" ] && STACK_MSG="${LANG}"

  # Register project in global Cortex (fire-and-forget)
  CLI_PATH="${COMPOSURE_ROOT}/cortex/dist/cli.bundle.js"
  if [ -f "$CLI_PATH" ]; then
    PROJECT_NAME="$(basename "${PROJECT_DIR}")"
    TIMESTAMP="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
    PAYLOAD=$(jq -n \
      --arg project "$PROJECT_NAME" \
      --arg root "$(cd "$PROJECT_DIR" && pwd)" \
      --arg stack "$STACK_MSG" \
      --arg ts "$TIMESTAMP" \
      '{
        agent_id: "__system__",
        content: ("Project registered: " + $project + " | Stack: " + $stack + " | Path: " + $root + " | First seen: " + $ts),
        content_type: "fact",
        metadata: {
          category: "project-registry",
          project: $project,
          project_root: $root,
          stack: $stack,
          registered_at: $ts,
          tags: ["project", "auto-bootstrap"]
        }
      }')
    node --experimental-sqlite "$CLI_PATH" create_memory_node "$PAYLOAD" 2>/dev/null &
  fi

  printf '[composure] Auto-initialized project (%s). Run /composure:initialize for full setup.\n' "$STACK_MSG"
fi

# ── Resolve config (dual-read) ──────────────────────────────
source "${SCRIPT_DIR}/../lib/resolve-config.sh"

if [ -z "$COMPOSURE_CONFIG" ]; then
  echo "[composure] No stack config found. Run /composure:initialize to set up."
  exit 0
fi

# ── 2. Version sync ─────────────────────────────────────────
PLUGIN_VERSION=$(jq -r '.version // ""' "${COMPOSURE_ROOT}/.claude-plugin/plugin.json" 2>/dev/null)
PROJECT_VERSION=$(jq -r '.composureVersion // ""' "$COMPOSURE_CONFIG" 2>/dev/null)
if [ -n "$PLUGIN_VERSION" ] && [ -n "$PROJECT_VERSION" ] && [ "$PLUGIN_VERSION" != "$PROJECT_VERSION" ]; then
  jq --arg v "$PLUGIN_VERSION" '.composureVersion = $v' "$COMPOSURE_CONFIG" > "${COMPOSURE_CONFIG}.tmp" \
    && mv "${COMPOSURE_CONFIG}.tmp" "$COMPOSURE_CONFIG" 2>/dev/null
  printf '[composure] Config synced: composureVersion %s → %s\n' "$PROJECT_VERSION" "$PLUGIN_VERSION"
fi

# ── 2b. Permissions auto-sync (version-stamped) ─────────────
PERMS_SCRIPT="${COMPOSURE_ROOT}/bin/composure-permissions.mjs"
if [ -f "$PERMS_SCRIPT" ] && [ -n "$PLUGIN_VERSION" ]; then
  PERMS_STAMP=""
  [ -f "${HOME}/.composure/last-permissions-sync" ] && PERMS_STAMP=$(cat "${HOME}/.composure/last-permissions-sync" 2>/dev/null)
  if [ "$PERMS_STAMP" != "$PLUGIN_VERSION" ]; then
    PERMS_OUT=$(node "$PERMS_SCRIPT" sync --plugin-version "$PLUGIN_VERSION" 2>/dev/null)
    echo "$PERMS_OUT" | grep -q "Added" && echo "$PERMS_OUT"
  fi
fi

# ── 2c. Gitignore backfill (create if missing) ────────────────
if [ ! -f "${PROJECT_DIR}/.composure/.gitignore" ]; then
  cat > "${PROJECT_DIR}/.composure/.gitignore" 2>/dev/null <<'EOIGNORE'
# Composure — auto-generated .gitignore
# Configs and framework docs are tracked. Generated DBs and ephemeral state are ignored.
# Customize: remove lines for paths your team wants to track.

# Graph database (rebuilt by /composure:build-graph, contains absolute paths)
graph/

# Cortex memory (per-developer, lives at ~/.composure/cortex/)
cortex/
cortex.db*

# Ephemeral session state
current-task.json
last-health-check
hook-activity.log
task-sync-debug.jsonl

# Scratch space
workspaces/
EOIGNORE
fi

if [ ! -f "${PROJECT_DIR}/tasks-plans/.gitignore" ] && [ -d "${PROJECT_DIR}/tasks-plans" ]; then
  cat > "${PROJECT_DIR}/tasks-plans/.gitignore" 2>/dev/null <<'EOIGNORE'
# Composure — auto-generated .gitignore
# Backlog, blueprints, research, ideas, and audits are tracked.
# Per-developer session logs and archives are ignored.

# Per-developer daily session logs
sessions/

# Archived completed items (git history preserves them)
archive/

# Native task file (auto-generated)
.session-tasks.jsonl
EOIGNORE
fi

# ── 3. Stack note ────────────────────────────────────────────
FRONTEND=$(jq -r '.frameworks | to_entries[0].value.frontend // "null"' "$COMPOSURE_CONFIG" 2>/dev/null)
BACKEND=$(jq -r '.frameworks | to_entries[0].value.backend // "null"' "$COMPOSURE_CONFIG" 2>/dev/null)
LANGS=$(jq -r '.frameworks | keys | join(", ")' "$COMPOSURE_CONFIG" 2>/dev/null)

case "$FRONTEND" in
  nextjs)  CATEGORY="fullstack"; ENTRY="fullstack/INDEX.md → nextjs/nextjs.md" ;;
  vite)    CATEGORY="frontend";  ENTRY="frontend/INDEX.md → vite/vite.md" ;;
  angular) CATEGORY="frontend";  ENTRY="frontend/INDEX.md → angular/angular.md" ;;
  expo)    CATEGORY="mobile";    ENTRY="mobile/INDEX.md → expo/expo.md" ;;
  *)       CATEGORY="frontend";  ENTRY="frontend/INDEX.md → core.md" ;;
esac

if [ "$EVENT" = "startup" ]; then
  cat <<EOF
[composure:stack] Detected: ${LANGS} | frontend=${FRONTEND} | backend=${BACKEND:-none}
Architecture: ${CATEGORY} (${ENTRY})
Non-trivial work → /composure:blueprint | Routine → /composure:app-architecture
EOF
else
  echo "[composure:stack] ${LANGS} | ${FRONTEND} | arch=${CATEGORY}"
fi

# ── 4. Cortex memory injection ───────────────────────────────
CLI_PATH="${COMPOSURE_ROOT}/cortex/dist/cli.bundle.js"
if [ -f "$CLI_PATH" ] && [ -f "${HOME}/.composure/cortex/cortex.db" ]; then
  AGENT_ID="$COMPOSURE_AGENT_ID"

  # Search project memories (fast — local SQLite, no network)
  PROJECT_MEMORIES=$(node --experimental-sqlite "$CLI_PATH" search_memory \
    "{\"agent_id\":\"${AGENT_ID}\",\"limit\":8}" 2>/dev/null)
  PROJECT_COUNT=$(echo "$PROJECT_MEMORIES" | jq -r '.count // 0' 2>/dev/null)

  # Search global cross-project memories
  GLOBAL_MEMORIES=$(node --experimental-sqlite "$CLI_PATH" search_memory \
    "{\"agent_id\":\"global\",\"limit\":5,\"tags\":[\"cross-project\"]}" 2>/dev/null)
  GLOBAL_COUNT=$(echo "$GLOBAL_MEMORIES" | jq -r '.count // 0' 2>/dev/null)

  # Check for active thinking sessions
  ACTIVE_SESSIONS=$(node --experimental-sqlite "$CLI_PATH" list_thinking_sessions \
    "{\"agent_id\":\"${AGENT_ID}\",\"status\":\"active\"}" 2>/dev/null)
  SESSION_COUNT=$(echo "$ACTIVE_SESSIONS" | jq -r '.count // 0' 2>/dev/null)

  if [ "${PROJECT_COUNT:-0}" -gt 0 ] || [ "${GLOBAL_COUNT:-0}" -gt 0 ] || [ "${SESSION_COUNT:-0}" -gt 0 ]; then
    printf '[cortex] agent_id=%s\n' "$AGENT_ID"

    # Output project memory summaries (truncated to first 80 chars each)
    if [ "${PROJECT_COUNT:-0}" -gt 0 ]; then
      printf '[cortex] Project memories: %d loaded\n' "$PROJECT_COUNT"
      echo "$PROJECT_MEMORIES" | jq -r '.results[]? | "  - " + (.content // "")[0:80]' 2>/dev/null
    fi

    # Output global memories
    if [ "${GLOBAL_COUNT:-0}" -gt 0 ]; then
      printf '[cortex] Global memories: %d cross-project\n' "$GLOBAL_COUNT"
      echo "$GLOBAL_MEMORIES" | jq -r '.results[]? | "  - " + (.content // "")[0:80]' 2>/dev/null
    fi

    # Note active thinking sessions count (lazy-loaded on sequential_think)
    if [ "${SESSION_COUNT:-0}" -gt 0 ]; then
      printf '[cortex] %d active thinking session(s) — auto-loaded when you use sequential_think.\n' "$SESSION_COUNT"
    fi
  else
    printf '[cortex] agent_id=%s | No memories yet — notable changes auto-captured.\n' "$AGENT_ID"
  fi

  # ── 4b. Recent activity context (resume only) ────────────────
  if [ "$EVENT" = "resume" ]; then
    # Recent auto-captured observations (last 24h)
    RECENT=$(node --experimental-sqlite "$CLI_PATH" search_memory \
      "{\"agent_id\":\"${AGENT_ID}\",\"query\":\"auto-captured\",\"limit\":5}" 2>/dev/null)
    RECENT_COUNT=$(echo "$RECENT" | jq -r '.count // 0' 2>/dev/null)

    # Latest completed thinking session
    LATEST_SESSION=$(node --experimental-sqlite "$CLI_PATH" list_thinking_sessions \
      "{\"agent_id\":\"${AGENT_ID}\",\"status\":\"completed\",\"limit\":1}" 2>/dev/null)
    LATEST_TITLE=$(echo "$LATEST_SESSION" | jq -r '.sessions[0]?.title // empty' 2>/dev/null)

    # Today's daily log
    TODAY_LOG="${PROJECT_DIR}/tasks-plans/sessions/$(date +%Y-%m-%d).md"

    RECENT_PARTS=()
    [ "${RECENT_COUNT:-0}" -gt 0 ] && RECENT_PARTS+=("${RECENT_COUNT} recent changes captured")
    [ -n "$LATEST_TITLE" ] && RECENT_PARTS+=("Last session: \"${LATEST_TITLE}\"")
    [ -f "$TODAY_LOG" ] && RECENT_PARTS+=("Daily log: $(wc -l < "$TODAY_LOG" | tr -d ' ') lines")

    if [ ${#RECENT_PARTS[@]} -gt 0 ]; then
      printf '[cortex:recent] %s' "${RECENT_PARTS[0]}"
      for ((i=1; i<${#RECENT_PARTS[@]}; i++)); do
        printf ' | %s' "${RECENT_PARTS[$i]}"
      done
      echo
    fi
  fi

  # ── 4c. Memory prune (startup only — archive non-critical to Cortex) ──
  if [ "$EVENT" = "startup" ]; then
    PRUNE_SCRIPT="${COMPOSURE_ROOT}/hooks/cortex/memory-prune.sh"
    if [ -f "$PRUNE_SCRIPT" ]; then
      # Project memories
      PROJECT_MEM_DIR="${HOME}/.claude/projects"
      for mem_dir in "$PROJECT_MEM_DIR"/*/memory; do
        [ -d "$mem_dir" ] && bash "$PRUNE_SCRIPT" "$mem_dir" "$AGENT_ID" 2>/dev/null || true
      done
      # Global memories
      [ -d "${HOME}/.claude/memory" ] && bash "$PRUNE_SCRIPT" "${HOME}/.claude/memory" "global" 2>/dev/null || true
    fi
  fi

  # ── 4d. Cross-session visibility (startup + resume) ─────────
  # Surface OTHER sessions that have been active in this project
  # within the last hour. Data source: turn-capture.mjs writes
  # session-turn observations to global Cortex under __system__.
  # Silent when no other sessions active.
  if [ -n "$SESSION_ID" ]; then
    PROJECT_NAME="$(basename "$PROJECT_DIR")"

    ACTIVE_RAW=$(node --experimental-sqlite "$CLI_PATH" search_memory \
      "{\"agent_id\":\"__system__\",\"limit\":200}" 2>/dev/null || true)

    if [ -n "$ACTIVE_RAW" ]; then
      ACTIVE_SUMMARY=$(echo "$ACTIVE_RAW" | jq -c --arg proj "$PROJECT_NAME" --arg me "$SESSION_ID" '
        def ts_parse: sub("\\.[0-9]+Z$"; "Z") | fromdateiso8601;
        [.results[]?
         | select(
             .metadata.category == "session-turn" and
             .metadata.project == $proj and
             .metadata.session_id != $me and
             (.metadata.timestamp | ts_parse) > (now - 3600)
           )
        ]
        | group_by(.metadata.session_id)
        | map({
            sid:   (.[0].metadata.session_id_short // (.[0].metadata.session_id | .[0:8])),
            turns: ([.[].metadata.turn_number | select(. != null)] | max // 0),
            last:  ([.[].metadata.timestamp] | max),
            files: ([.[] | (.metadata.files.edit // []) + (.metadata.files.write // []) | .[]?] | unique | length)
          })
        | sort_by(.last) | reverse
        | .[:5]
      ' 2>/dev/null)

      COUNT=$(echo "$ACTIVE_SUMMARY" | jq -r 'length // 0' 2>/dev/null)
      if [ "${COUNT:-0}" -gt 0 ]; then
        if [ "$COUNT" -eq 1 ]; then
          printf '[composure:active-sessions] 1 other session recently active in %s:\n' "$PROJECT_NAME"
        else
          printf '[composure:active-sessions] %d other sessions recently active in %s:\n' "$COUNT" "$PROJECT_NAME"
        fi
        echo "$ACTIVE_SUMMARY" | jq -r '
          def ts_parse: sub("\\.[0-9]+Z$"; "Z") | fromdateiso8601;
          .[] |
          ((now - (.last | ts_parse)) | floor) as $secs |
          (if $secs < 60 then "\($secs)s"
           elif $secs < 3600 then "\(($secs / 60) | floor)m"
           else "\(($secs / 3600) | floor)h"
           end) as $ago |
          "  - session \(.sid) — \(.turns) turn\(if .turns == 1 then "" else "s" end), last \($ago) ago (\(.files) file\(if .files == 1 then "" else "s" end))"
        ' 2>/dev/null
        echo "[composure:hint] Another Claude session is working here. Coordinate via Cortex before editing shared files."
      fi
    fi
  fi
fi

# ── 5. Companion plugin auto-install + config check ──────────
COMPANIONS="design-forge sentinel shipyard testbench"
INSTALLED_JSON="${HOME}/.claude/plugins/installed_plugins.json"
INSTALLED_COMPANIONS=0
MISSING_INSTALL=()
MISSING_INIT=()

# Auto-install missing companion plugins
if [ -f "$INSTALLED_JSON" ] && command -v claude >/dev/null 2>&1; then
  for plugin in $COMPANIONS; do
    if grep -q "\"${plugin}@composure-suite\"" "$INSTALLED_JSON" 2>/dev/null; then
      INSTALLED_COMPANIONS=$((INSTALLED_COMPANIONS + 1))
    else
      MISSING_INSTALL+=("$plugin")
    fi
  done

  if [ ${#MISSING_INSTALL[@]} -gt 0 ]; then
    NEWLY_INSTALLED=0
    for plugin in "${MISSING_INSTALL[@]}"; do
      if claude plugin install "${plugin}@composure-suite" >/dev/null 2>&1; then
        printf '[composure] Auto-installed: %s\n' "$plugin"
        NEWLY_INSTALLED=$((NEWLY_INSTALLED + 1))
      fi
    done
    if [ "$NEWLY_INSTALLED" -gt 0 ]; then
      printf '[composure:action-required] %d companion plugin(s) just installed. Run /reload-plugins to activate them.\n' "$NEWLY_INSTALLED"
    fi
  fi
fi

# Check if installed companions are initialized (config exists)
if [ -n "$COMPOSURE_ROOT" ]; then
  PLUGIN_CACHE="${COMPOSURE_ROOT%/*}"
  for plugin in sentinel shipyard testbench; do
    for d in "${PLUGIN_CACHE}"/${plugin}/*/; do
      if [ -d "$d" ]; then
        case "$plugin" in
          sentinel)  [ ! -f "${PROJECT_DIR}/.composure/sentinel.json" ] && [ ! -f "${PROJECT_DIR}/.claude/sentinel.json" ]  && MISSING_INIT+=("Sentinel") ;;
          shipyard)  [ ! -f "${PROJECT_DIR}/.composure/shipyard.json" ] && [ ! -f "${PROJECT_DIR}/.claude/shipyard.json" ]  && MISSING_INIT+=("Shipyard") ;;
          testbench) [ ! -f "${PROJECT_DIR}/.composure/testbench.json" ] && [ ! -f "${PROJECT_DIR}/.claude/testbench.json" ] && MISSING_INIT+=("Testbench") ;;
        esac
        break
      fi
    done
  done
fi

if [ ${#MISSING_INIT[@]} -gt 0 ]; then
  printf '[composure] Not initialized: %s — run /composure:initialize\n' "$(IFS=', '; echo "${MISSING_INIT[*]}")"
fi

# ── 6. Health drift check (24h throttled) ────────────────────
CHECK_FILE="${PROJECT_DIR}/.composure/last-health-check"
RUN_HEALTH=0

if [ -f "$CHECK_FILE" ]; then
  LAST_CHECK=$(cat "$CHECK_FILE" 2>/dev/null || echo "0")
  NOW=$(date +%s)
  [ $(( NOW - LAST_CHECK )) -gt 86400 ] && RUN_HEALTH=1
else
  RUN_HEALTH=1
fi

if [ "$RUN_HEALTH" -eq 1 ]; then
  DRIFT=0
  [ -n "$COMPOSURE_ROOT" ] && [ ! -f "${COMPOSURE_ROOT}/.claude-plugin/plugin.json" ] && DRIFT=1
  for BIN in composure-fetch.mjs composure-token.mjs; do
    [ ! -x "${HOME}/.composure/bin/${BIN}" ] && DRIFT=1 && break
  done

  [ "$DRIFT" -eq 1 ] && echo "[composure] Install drift detected. Run /composure:health for details."
  mkdir -p "$(dirname "$CHECK_FILE")" 2>/dev/null
  date +%s > "$CHECK_FILE" 2>/dev/null
fi

# ── 7. Tasks + Cortex pending + graph staleness ─────────────
# Consolidated from resume-check.sh — single block output.
TASKS_FILE="$PROJECT_DIR/tasks-plans/tasks.md"
GRAPH_DB="$PROJECT_DIR/.composure/graph/graph.db"
[ ! -f "$GRAPH_DB" ] && GRAPH_DB="$PROJECT_DIR/.code-review-graph/graph.db"

RESUME_PARTS=()
OPEN=0
DONE=0

if [ -f "$TASKS_FILE" ]; then
  OPEN=$(grep -c '^\- \[ \]' "$TASKS_FILE" 2>/dev/null || echo 0)
  DONE=$(grep -c '^\- \[x\]' "$TASKS_FILE" 2>/dev/null || echo 0)
  [ "$OPEN" -gt 0 ] && RESUME_PARTS+=("Tasks: ${OPEN} open, ${DONE} done. Run /composure:backlog to process.")
fi

# ── Cortex pending tasks from previous sessions ──
CORTEX_TASK_LIST=""
CORTEX_STALE_LIST=""
CORTEX_STALE_COUNT=0
CORTEX_DB="${HOME}/.composure/cortex/cortex.db"

if [ -f "$CORTEX_DB" ] && [ -f "$CLI_PATH" ]; then
  AGENT_ID="$COMPOSURE_AGENT_ID"

  CORTEX_RAW=$(timeout 2 node --experimental-sqlite "$CLI_PATH" search_memory_text \
    "{\"agent_id\":\"${AGENT_ID}\",\"query\":\"Task #\",\"limit\":20}" 2>/dev/null || true)

  if [ -n "$CORTEX_RAW" ]; then
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
            CORTEX_TASK_LIST="${CORTEX_TASK_LIST}${LINE} (linked: ${REF})"$'\n'
          else
            CORTEX_STALE_LIST="${CORTEX_STALE_LIST}${LINE} (completed in backlog)"$'\n'
            CORTEX_STALE_COUNT=$((CORTEX_STALE_COUNT + 1))
          fi
        else
          CORTEX_STALE_LIST="${CORTEX_STALE_LIST}${LINE} (source file removed)"$'\n'
          CORTEX_STALE_COUNT=$((CORTEX_STALE_COUNT + 1))
        fi
      else
        CORTEX_TASK_LIST="${CORTEX_TASK_LIST}${LINE}"$'\n'
      fi
    done <<< "$PENDING_JSON"

    CORTEX_TASK_LIST=$(printf '%s' "$CORTEX_TASK_LIST" | sed '/^$/d')
    CORTEX_STALE_LIST=$(printf '%s' "$CORTEX_STALE_LIST" | sed '/^$/d')
  fi
fi

# ── Graph staleness ──
GRAPH_STALE=0
if [ -f "$GRAPH_DB" ]; then
  GRAPH_MOD=$(stat -f %m "$GRAPH_DB" 2>/dev/null || stat -c %Y "$GRAPH_DB" 2>/dev/null)
  LAST_COMMIT=$(git -C "$PROJECT_DIR" log -1 --format=%ct 2>/dev/null)
  if [ -n "$GRAPH_MOD" ] && [ -n "$LAST_COMMIT" ] && [ "$LAST_COMMIT" -gt "$GRAPH_MOD" ]; then
    GRAPH_STALE=1
    RESUME_PARTS+=("Code graph is stale.")
  fi
else
  GRAPH_STALE=1
  RESUME_PARTS+=("No code graph found.")
fi

# ── Output consolidated resume block ──
if [ ${#RESUME_PARTS[@]} -gt 0 ]; then
  printf "[composure:resume] %s" "${RESUME_PARTS[0]}"
  for ((i=1; i<${#RESUME_PARTS[@]}; i++)); do
    printf " | %s" "${RESUME_PARTS[$i]}"
  done
  echo
fi

# Cortex pending tasks get their own block for readability
if [ -n "$CORTEX_TASK_LIST" ]; then
  CORTEX_TASK_COUNT=$(echo "$CORTEX_TASK_LIST" | grep -c '^- ' 2>/dev/null || echo 0)
  echo "[composure:resume] Cortex tasks from previous sessions:"
  echo "$CORTEX_TASK_LIST"
  # Interactive restoration only on startup (not clear/compact)
  if [ "$EVENT" = "startup" ]; then
    echo "[composure:MANDATORY] Use AskUserQuestion to ask: \"${CORTEX_TASK_COUNT} pending task(s) from previous sessions. Restore them into this session?\" Options: (1) Restore all — recreate as TaskCreate entries, (2) Pick which to restore — show the list and let user choose, (3) Skip — start fresh. Do NOT auto-restore without asking."
  fi
fi

# Stale Cortex tasks
if [ -n "$CORTEX_STALE_LIST" ]; then
  echo "[composure:hint] ${CORTEX_STALE_COUNT} stale task(s) found (backlog items already completed or removed):"
  echo "$CORTEX_STALE_LIST"
fi

[ "$OPEN" -gt 5 ] && echo "[composure:hint] ${OPEN} open tasks is high. Mention this early — the user may want to clear the backlog before adding more work."

if [ "$GRAPH_STALE" -eq 1 ]; then
  GRAPH_SERVER_JS="${COMPOSURE_ROOT}/graph/dist/server.js"
  if [ -n "$COMPOSURE_ROOT" ] && [ -f "$GRAPH_SERVER_JS" ]; then
    echo '[composure:MANDATORY] Code graph stale — run build_or_update_graph({ full_rebuild: true }) before other work.'
    echo '[composure:hint] Graph for structure (query_graph, get_impact_radius, semantic_search_nodes). Explore agents only for intent/business-logic.'
  else
    echo '[composure:MANDATORY] Code graph stale + MCP may be disconnected. Run /composure:build-graph or restart Claude Code.'
  fi
fi

# Export plugin root for CLI usage (agents need this for Cortex/Graph CLI)
if [ -n "$COMPOSURE_ROOT" ]; then
  echo "[composure:plugin-root] ${COMPOSURE_ROOT}"
fi

# ── 7b. Open decision threads (tasks-plans/research/ subdirs) ──
# Surface decision folders as resumable context. A folder (not a flat file)
# under tasks-plans/research/ is the convention for a multi-decision research
# thread — see ideas/composure-hook-improvements spec §5.
if [ "$EVENT" = "startup" ] || [ "$EVENT" = "resume" ]; then
  RESEARCH_DIR="${PROJECT_DIR}/tasks-plans/research"
  if [ -d "$RESEARCH_DIR" ]; then
    DECISION_FOLDERS=$(find "$RESEARCH_DIR" -mindepth 1 -maxdepth 1 -type d 2>/dev/null | head -10)
    if [ -n "$DECISION_FOLDERS" ]; then
      DECISION_COUNT=$(echo "$DECISION_FOLDERS" | wc -l | tr -d ' ')
      echo "[composure:decisions] ${DECISION_COUNT} open decision thread(s) in tasks-plans/research/:"
      echo "$DECISION_FOLDERS" | while read -r dfolder; do
        dname=$(basename "$dfolder")
        dreadme="${dfolder}/README.md"
        dstatus=""
        [ -f "$dreadme" ] && dstatus=$(head -5 "$dreadme" | grep -iE "^status:" | head -1 | sed 's/^[Ss]tatus: *//' | tr -d '\r')
        if [ -n "$dstatus" ]; then
          echo "  - ${dname} (${dstatus})"
        else
          echo "  - ${dname}"
        fi
      done
    fi
  fi
fi

# ── 8. Guardrails ruleset detection (was guardrails-load.sh) ──
GUARDRAILS_CONFIG=""
[ -f "${PROJECT_DIR}/.composure/guardrails.json" ] && GUARDRAILS_CONFIG="${PROJECT_DIR}/.composure/guardrails.json"

if [ -n "$GUARDRAILS_CONFIG" ]; then
  DOMAIN_NAME=$(python3 -c "
import json
try:
  data = json.load(open('$GUARDRAILS_CONFIG'))
  print(data.get('domain', {}).get('name', 'custom'))
except:
  print('custom')
" 2>/dev/null)
  echo "[guardrails] Active ruleset: ${DOMAIN_NAME}"
fi

# ── Legacy path drift detection ──────────────────────────────
LEGACY_DRIFT=()

# Config in old .claude/ path
if [ -f "${PROJECT_DIR}/.claude/no-bandaids.json" ] && [ ! -f "${PROJECT_DIR}/.composure/no-bandaids.json" ]; then
  LEGACY_DRIFT+=("config still in .claude/ (should be .composure/)")
fi

# Frameworks in old .claude/ path
if [ -d "${PROJECT_DIR}/.claude/frameworks" ]; then
  LEGACY_DRIFT+=("frameworks/ still in .claude/ (should be .composure/frameworks/)")
fi

# Loose cortex.db (should be inside cortex/ subfolder)
if [ -f "${PROJECT_DIR}/.composure/cortex.db" ] && [ ! -f "${PROJECT_DIR}/.composure/cortex/cortex.db" ]; then
  LEGACY_DRIFT+=("cortex.db loose at .composure/cortex.db (should be .composure/cortex/cortex.db)")
fi

# Companion configs in old .claude/ path
for cfg in sentinel.json shipyard.json testbench.json composure-pro.json; do
  if [ -f "${PROJECT_DIR}/.claude/${cfg}" ] && [ ! -f "${PROJECT_DIR}/.composure/${cfg}" ]; then
    LEGACY_DRIFT+=("${cfg} in .claude/ (should be .composure/)")
  fi
done

if [ ${#LEGACY_DRIFT[@]} -gt 0 ]; then
  printf '[composure:upgrade] Legacy paths detected — run `/composure:auth migrate` to fix:\n'
  for d in "${LEGACY_DRIFT[@]}"; do
    printf '  - %s\n' "$d"
  done
fi

# ── Prune plugin cache (keep latest 2 versions per plugin) ──
# Also cleans temp_local_ directories left by plugin installs
CACHE_BASE="${HOME}/.claude/plugins/cache/composure-suite"
if [ -d "$CACHE_BASE" ]; then
  for plugin_dir in "$CACHE_BASE"/*/; do
    [ ! -d "$plugin_dir" ] && continue
    count=0
    for ver in $(ls "$(basename "$plugin_dir" | xargs -I{} echo "$CACHE_BASE/{}")" 2>/dev/null | sort -t. -k1,1nr -k2,2nr -k3,3nr); do
      [ ! -d "${plugin_dir}${ver}" ] && continue
      count=$((count + 1))
      [ "$count" -gt 2 ] && rm -rf "${plugin_dir}${ver}"
    done
  done
  rm -rf "${HOME}/.claude/plugins/cache/temp_local_"* 2>/dev/null
fi

exit 0
