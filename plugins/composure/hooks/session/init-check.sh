#!/bin/bash
# ============================================================
# Composure Init Check — SessionStart Hook
# ============================================================
# Checks Composure + companion plugin initialization status.
# Non-blocking (exit 0 always). Runs on startup only.
#
# Plugin/MCP health checks are handled by /composure:initialize
# Step 9 (not this hook) because they need claude plugin list
# output and context-window awareness that bash can't provide.

# ── Auto-bootstrap if not initialized ───────────────────────
# Instead of blocking with "run /composure:initialize", silently create
# a minimal .composure/ setup so hooks, Cortex, and graph work immediately.
# Full /composure:initialize is still recommended for stack detection + docs.
if [ ! -f ".composure/no-bandaids.json" ] && [ ! -f ".claude/no-bandaids.json" ]; then
  # Resolve plugin version for the config stamp
  SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
  BOOT_VERSION=$(jq -r '.version // "0.0.0"' "${SCRIPT_DIR}/../../.claude-plugin/plugin.json" 2>/dev/null)

  # Quick stack detection (bash-level, <1s)
  FRONTEND="null"; BACKEND="null"; LANG="typescript"
  [ -f "next.config.js" ] || [ -f "next.config.ts" ] || [ -f "next.config.mjs" ] && FRONTEND="nextjs"
  [ -f "vite.config.ts" ] || [ -f "vite.config.js" ] && FRONTEND="vite"
  [ -f "angular.json" ] && FRONTEND="angular"
  [ -f "app.json" ] && grep -q '"expo"' app.json 2>/dev/null && FRONTEND="expo"
  [ -f "supabase/config.toml" ] || [ -d "supabase/migrations" ] && BACKEND="supabase"
  [ -f "requirements.txt" ] || [ -f "pyproject.toml" ] && LANG="python"
  [ -f "go.mod" ] && LANG="go"
  [ -f "Cargo.toml" ] && LANG="rust"

  # Create .composure/ directory scaffold
  mkdir -p .composure/frameworks/generated \
           .composure/frameworks/project \
           .composure/development/workspaces \
           .composure/cortex \
           .composure/graph 2>/dev/null

  # Create tasks-plans/ scaffold
  mkdir -p tasks-plans/backlog \
           tasks-plans/blueprints \
           tasks-plans/archive \
           tasks-plans/ideas \
           tasks-plans/reference 2>/dev/null

  # Write minimal no-bandaids.json config
  cat > .composure/no-bandaids.json 2>/dev/null <<EOJSON
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

  # Ensure global Cortex directory exists
  mkdir -p "${HOME}/.composure/cortex" 2>/dev/null

  # Build stack label for display + Cortex registration
  STACK_MSG=""
  [ "$FRONTEND" != "null" ] && STACK_MSG="${FRONTEND}"
  [ "$BACKEND" != "null" ] && [ -n "$STACK_MSG" ] && STACK_MSG="${STACK_MSG} + ${BACKEND}"
  [ "$BACKEND" != "null" ] && [ -z "$STACK_MSG" ] && STACK_MSG="${BACKEND}"
  [ -z "$STACK_MSG" ] && STACK_MSG="${LANG}"

  PROJECT_ROOT="$(pwd)"
  PROJECT_NAME="$(basename "$PROJECT_ROOT")"
  TIMESTAMP="$(date -u +%Y-%m-%dT%H:%M:%SZ)"

  # Register project in global Cortex (fire-and-forget, backgrounded)
  # Creates a memory node so the brain knows this project exists.
  # Only runs on first bootstrap — subsequent sessions skip this entire block.
  CLI_PATH="${SCRIPT_DIR}/../../cortex/dist/cli.bundle.js"
  if [ -f "$CLI_PATH" ]; then
    PAYLOAD=$(jq -n \
      --arg project "$PROJECT_NAME" \
      --arg root "$PROJECT_ROOT" \
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

  printf '[composure] Auto-initialized project (%s). Run /composure:initialize for full stack detection + companion setup.\n' "$STACK_MSG"
  # Don't exit — continue to companion checks below
fi

# Resolve active config path (.composure/ preferred)
if [ -f ".composure/no-bandaids.json" ]; then
  ACTIVE_CONFIG=".composure/no-bandaids.json"
else
  ACTIVE_CONFIG=".claude/no-bandaids.json"
fi

# ── Resolve plugin root with cache fallback ─────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/../lib/resolve-plugin-root.sh"

# ── Composure initialized — check companions ────────────────
if [ -n "$COMPOSURE_ROOT" ]; then
  PLUGIN_CACHE="${COMPOSURE_ROOT%/*}"
else
  PLUGIN_CACHE=""
fi
MISSING=()

for plugin in sentinel shipyard testbench; do
  for d in "${PLUGIN_CACHE}"/${plugin}/*/; do
    if [ -d "$d" ]; then
      case "$plugin" in
        sentinel)  [ ! -f ".composure/sentinel.json" ] && [ ! -f ".claude/sentinel.json" ]  && MISSING+=("Sentinel (security scanning)") ;;
        shipyard)  [ ! -f ".composure/shipyard.json" ] && [ ! -f ".claude/shipyard.json" ]  && MISSING+=("Shipyard (CI/CD & deployment)") ;;
        testbench) [ ! -f ".composure/testbench.json" ] && [ ! -f ".claude/testbench.json" ] && MISSING+=("Testbench (test generation)") ;;
      esac
      break
    fi
  done
done

# Composure Pro Patterns — only flag if project uses Supabase
# Detection is via .claude/composure-pro.json (created by /composure-pro:initialize)
# License validation is handled by composure-pro's own pro-license-check.sh hook
if [ -f "supabase/config.toml" ] || [ -d "supabase/migrations" ]; then
  if [ ! -f ".composure/composure-pro.json" ] && [ ! -f ".claude/composure-pro.json" ]; then
    # Check if plugin is installed but not initialized
    for d in "${PLUGIN_CACHE}"/composure-pro/*/; do
      if [ -d "$d" ]; then
        MISSING+=("Composure Pro Patterns (schema guard, RLS, entity registry)")
        break
      fi
    done
  fi
fi

if [ ${#MISSING[@]} -gt 0 ]; then
  LIST=""
  for m in "${MISSING[@]}"; do
    LIST="${LIST}\n  - ${m}"
  done
  printf "[composure] Companion plugins installed but not initialized:${LIST}\n"
  printf '[composure] Run /composure:initialize to set up everything in one step.\n'
fi

# ── Upgrade notification (legacy .claude/ → .composure/) ────
if [ -f ".claude/no-bandaids.json" ] && [ ! -f ".composure/no-bandaids.json" ]; then
  printf '[composure:upgrade] Project configs in legacy .claude/ location. Run `composure-auth upgrade` in your terminal to migrate to .composure/ for cleaner management.\n'
fi

# ── Config freshness check ──────────────────────────────────
# Compare plugin version against what the project was last initialized with.
# If stale, suggest /composure:update-project to pick up new defaults + docs.
STALE_ITEMS=()

# 1. Plugin version stamp — auto-sync on every session start
PLUGIN_VERSION=$(jq -r '.version // ""' "${COMPOSURE_ROOT}/.claude-plugin/plugin.json" 2>/dev/null)
PROJECT_VERSION=$(jq -r '.composureVersion // ""' "$ACTIVE_CONFIG" 2>/dev/null)
if [ -n "$PLUGIN_VERSION" ] && [ -n "$PROJECT_VERSION" ] && [ "$PLUGIN_VERSION" != "$PROJECT_VERSION" ]; then
  jq --arg v "$PLUGIN_VERSION" '.composureVersion = $v' "$ACTIVE_CONFIG" > "${ACTIVE_CONFIG}.tmp" \
    && mv "${ACTIVE_CONFIG}.tmp" "$ACTIVE_CONFIG" 2>/dev/null
  printf '[composure] Config synced: composureVersion %s → %s\n' "$PROJECT_VERSION" "$PLUGIN_VERSION"
fi

# 2. Framework docs freshness — flag if any generated doc is >14 days old
OLDEST_DOC=""
if [ -d ".claude/frameworks" ]; then
  NOW=$(date +%s)
  FRAMEWORKS_DIR=".composure/frameworks"
  [ ! -d "$FRAMEWORKS_DIR" ] && FRAMEWORKS_DIR=".claude/frameworks"
  for doc in $(find "$FRAMEWORKS_DIR" -name "*.md" -path "*/generated/*" 2>/dev/null); do
    DOC_MOD=$(stat -f %m "$doc" 2>/dev/null || stat -c %Y "$doc" 2>/dev/null)
    if [ -n "$DOC_MOD" ]; then
      AGE_DAYS=$(( (NOW - DOC_MOD) / 86400 ))
      if [ "$AGE_DAYS" -gt 14 ]; then
        OLDEST_DOC="$doc (${AGE_DAYS} days old)"
        break
      fi
    fi
  done
fi
[ -n "$OLDEST_DOC" ] && STALE_ITEMS+=("Framework docs stale: ${OLDEST_DOC}")

# 3. Stack drift — check if package.json changed since config was generated
CONFIG_MOD=$(stat -f %m "$ACTIVE_CONFIG" 2>/dev/null || stat -c %Y "$ACTIVE_CONFIG" 2>/dev/null)
for pkg in package.json apps/*/package.json; do
  [ ! -f "$pkg" ] && continue
  PKG_MOD=$(stat -f %m "$pkg" 2>/dev/null || stat -c %Y "$pkg" 2>/dev/null)
  if [ -n "$PKG_MOD" ] && [ -n "$CONFIG_MOD" ] && [ "$PKG_MOD" -gt "$CONFIG_MOD" ]; then
    STALE_ITEMS+=("package.json newer than config — stack may have changed")
    break
  fi
done

if [ ${#STALE_ITEMS[@]} -gt 0 ]; then
  printf '[composure:update] Project config may be stale:\n'
  for s in "${STALE_ITEMS[@]}"; do
    printf '  - %s\n' "$s"
  done
  printf '[composure:update] Run /composure:update-project to refresh.\n'
fi

exit 0
