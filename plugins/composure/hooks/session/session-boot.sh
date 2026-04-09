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

PROJECT_DIR="${CLAUDE_PROJECT_DIR:-.}"

# ── Resolve plugin root ─────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/../lib/resolve-plugin-root.sh"

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

    # Output active thinking sessions
    if [ "${SESSION_COUNT:-0}" -gt 0 ]; then
      echo "$ACTIVE_SESSIONS" | jq -r '.sessions[]? | "[cortex] Active session: \"" + .title + "\" (" + (.thought_count // 0 | tostring) + " thoughts)"' 2>/dev/null
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

# ── 7. Task count + graph staleness (was resume-check.sh) ────
TASKS_FILE="$PROJECT_DIR/tasks-plans/tasks.md"
GRAPH_DB="$PROJECT_DIR/.composure/graph/graph.db"
[ ! -f "$GRAPH_DB" ] && GRAPH_DB="$PROJECT_DIR/.code-review-graph/graph.db"

RESUME_PARTS=()
OPEN=0

if [ -f "$TASKS_FILE" ]; then
  OPEN=$(grep -c '^\- \[ \]' "$TASKS_FILE" 2>/dev/null || echo 0)
  DONE=$(grep -c '^\- \[x\]' "$TASKS_FILE" 2>/dev/null || echo 0)
  [ "$OPEN" -gt 0 ] && RESUME_PARTS+=("Tasks: ${OPEN} open, ${DONE} done. Run /composure:backlog to process.")
fi

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
fi

if [ ${#RESUME_PARTS[@]} -gt 0 ]; then
  printf "[composure:resume] %s" "${RESUME_PARTS[0]}"
  for ((i=1; i<${#RESUME_PARTS[@]}; i++)); do
    printf " | %s" "${RESUME_PARTS[$i]}"
  done
  echo
fi

[ "$OPEN" -gt 5 ] && echo "[composure:hint] ${OPEN} open tasks is high. Mention this early — the user may want to clear the backlog before adding more work."

if [ "$GRAPH_STALE" -eq 1 ]; then
  GRAPH_SERVER_JS="${COMPOSURE_ROOT}/graph/dist/server.js"
  if [ -n "$COMPOSURE_ROOT" ] && [ -f "$GRAPH_SERVER_JS" ]; then
    echo '[composure:MANDATORY] Code graph stale — run build_or_update_graph({ full_rebuild: true }) before other work.'
  else
    echo '[composure:MANDATORY] Code graph stale + MCP may be disconnected. Run /composure:build-graph or restart Claude Code.'
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

# ── Legacy upgrade notice ────────────────────────────────────
if [ -f "${PROJECT_DIR}/.claude/no-bandaids.json" ] && [ ! -f "${PROJECT_DIR}/.composure/no-bandaids.json" ]; then
  printf '[composure:upgrade] Configs in legacy .claude/ — run `composure-auth upgrade` to migrate.\n'
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
