#!/bin/bash
# ============================================================
# Composure Init Check — SessionStart Hook
# ============================================================
# Checks Composure + companion plugin initialization status.
# If anything is missing, prints ONE unified message with the
# single command that fixes everything.
# Non-blocking (exit 0 always). Runs on startup only.

# ── Not initialized at all ──────────────────────────────────
if [ ! -f ".claude/no-bandaids.json" ]; then
  printf '[composure] Not initialized in this project. Run /composure:initialize to detect your stack, build the code graph, and set up all plugins.\n'
  exit 0
fi

# ── Composure initialized — check companions ────────────────
# Detect which companion plugins are installed by checking for
# their skill files in the plugin cache (reliable, no CLI call).
PLUGIN_CACHE="${CLAUDE_PLUGIN_ROOT%/*}"
MISSING=()

for plugin in sentinel shipyard testbench; do
  for d in "${PLUGIN_CACHE}"/${plugin}/*/; do
    if [ -d "$d" ]; then
      case "$plugin" in
        sentinel)  [ ! -f ".claude/sentinel.json" ]  && MISSING+=("Sentinel (security scanning)") ;;
        shipyard)  [ ! -f ".claude/shipyard.json" ]  && MISSING+=("Shipyard (CI/CD & deployment)") ;;
        testbench) [ ! -f ".claude/testbench.json" ] && MISSING+=("Testbench (test generation)") ;;
      esac
      break
    fi
  done
done

# Supabase Patterns — only flag if project uses Supabase
if [ -f "supabase/config.toml" ] || [ -d "supabase/migrations" ]; then
  for d in "${PLUGIN_CACHE}"/supabase-patterns/*/; do
    if [ -d "$d" ]; then
      [ ! -f ".claude/supabase-patterns.json" ] && MISSING+=("Supabase Patterns (schema guard)")
      break
    fi
  done
fi

# ── Report ───────────────────────────────────────────────────
if [ ${#MISSING[@]} -gt 0 ]; then
  LIST=""
  for m in "${MISSING[@]}"; do
    LIST="${LIST}\n  - ${m}"
  done
  printf "[composure] Companion plugins installed but not initialized:${LIST}\n"
  printf '[composure] Run /composure:initialize to set up everything in one step.\n'
fi

exit 0
