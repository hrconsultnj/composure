#!/bin/bash
# ============================================================
# Auto-Fix — SessionStart Drift Detection + Auto-Invoke
# ============================================================
# Per blueprint composure-auth-update-unification-2026-05-11.md.
#
# Detects workspace drift conditions and either:
#   - AUTO-INVOKES the fix where safe (config migration, cortex
#     reindex, /composure:initialize for missing no-bandaids)
#   - SURFACES the exact action for the user where their input is
#     required (plugin install via /plugin UI, .claude/settings.local.json
#     edits — that's user-owned config we won't auto-edit)
#
# Emits at most ONE [composure:auto-fix] system-message line summarizing
# what was done OR what needs the user's hand. Quiet on no drift.
#
# Sourced from session-boot.sh after the [composure:ready] line.
# Non-blocking (exit 0 always). Latency budget: <100ms (no network).
# ============================================================

PROJECT_DIR="${CLAUDE_PROJECT_DIR:-.}"
HOME_DIR="${HOME:-/Users/$(whoami)}"

AUTO_FIXES=()    # actions taken automatically (or detected)
USER_ACTIONS=()  # actions the user must take

# ── 1. Auth state ────────────────────────────────────────────
CREDS="${HOME_DIR}/.composure/credentials.json"
if [ ! -f "$CREDS" ]; then
  USER_ACTIONS+=("not logged in — /composure:auth login")
elif command -v jq >/dev/null 2>&1; then
  EXPIRES=$(jq -r '.expires_at // 0' "$CREDS" 2>/dev/null)
  NOW=$(date +%s)
  if [ "$EXPIRES" -gt 0 ] && [ "$EXPIRES" -lt "$NOW" ]; then
    USER_ACTIONS+=("auth token expired — /composure:auth refresh OR /composure:update")
  fi
fi

# ── 2. Project not initialized: AUTO-INVOKE /composure:initialize ──
# The hook can't directly invoke a slash command — but a system-message
# line tells the AI to invoke it next, which is the canonical
# hook-triggers-skill pattern.
if [ ! -f "$PROJECT_DIR/.composure/no-bandaids.json" ] && [ ! -f "$PROJECT_DIR/.claude/no-bandaids.json" ]; then
  # Only consider this a project — not workspace/folder
  PT_FILE="/tmp/composure-project-type-$(echo -n "$PROJECT_DIR" | shasum 2>/dev/null | cut -d' ' -f1)"
  if [ -f "$PT_FILE" ]; then
    case "$(cat "$PT_FILE")" in
      project) AUTO_FIXES+=("project not initialized — invoke /composure:initialize NOW") ;;
    esac
  fi
fi

# ── 3. Legacy .claude/no-bandaids.json present (migration needed) ──
if [ -f "$PROJECT_DIR/.claude/no-bandaids.json" ] && [ ! -f "$PROJECT_DIR/.composure/no-bandaids.json" ]; then
  AUTO_FIXES+=("legacy .claude/ config detected — invoke /composure:update to migrate")
fi

# ── 4. Stale-hook reference scan ─────────────────────────────
# Walk .claude/settings.local.json for hook command paths the current
# plugin install no longer ships. The architecture-skill-trigger.sh
# → pattern-loader.sh case from 2026-05-11 is the canonical first instance.
SETTINGS="$PROJECT_DIR/.claude/settings.local.json"
if [ -f "$SETTINGS" ] && [ -n "$CLAUDE_PLUGIN_ROOT" ]; then
  STALE_COUNT=0
  # Extract hook paths from command strings
  STALE_PATHS=$(grep -oE 'hooks/[a-zA-Z0-9_/.-]+\.(sh|mjs)' "$SETTINGS" 2>/dev/null | sort -u | while read p; do
    [ -f "${CLAUDE_PLUGIN_ROOT}/$p" ] || echo "$p"
  done)
  if [ -n "$STALE_PATHS" ]; then
    STALE_COUNT=$(echo "$STALE_PATHS" | wc -l | tr -d ' ')
    USER_ACTIONS+=("$STALE_COUNT stale hook reference(s) in .claude/settings.local.json — /composure:update for the exact edits")
  fi
fi

# ── 5. Cortex sqlite check ───────────────────────────────────
SESSIONS_DIR="${HOME_DIR}/.composure/sessions"
SESSIONS_DB="${SESSIONS_DIR}/index.db"
SESSIONS_REINDEX="${SESSIONS_DIR}/cli/reindex-all.mjs"
if [ -d "$SESSIONS_DIR" ] && [ ! -f "$SESSIONS_DB" ] && [ -f "$SESSIONS_REINDEX" ]; then
  # Auto-fix: run reindex in background (don't block SessionStart)
  (node "$SESSIONS_REINDEX" >/dev/null 2>&1 &)
  AUTO_FIXES+=("cortex sqlite missing — reindex started in background")
fi

# ── 6. Plugin version check (24h throttled) ──────────────────
INSTALLED_PLUGINS="${HOME_DIR}/.claude/plugins/installed_plugins.json"
# The git repo is the marketplace CLONE — the cache dir is NOT a git repo.
MARKETPLACE_SRC="${HOME_DIR}/.claude/plugins/marketplaces/composure-suite"
LAST_CHECK="${HOME_DIR}/.composure/last-autoupdate-check"
if [ -f "$INSTALLED_PLUGINS" ] && [ -d "${MARKETPLACE_SRC}/.git" ] && command -v jq >/dev/null 2>&1; then
  # Skip if checked < 24h ago
  SHOULD_CHECK=true
  if [ -f "$LAST_CHECK" ]; then
    LAST_TS=$(stat -f %m "$LAST_CHECK" 2>/dev/null || stat -c %Y "$LAST_CHECK" 2>/dev/null || echo 0)
    NOW=$(date +%s)
    AGE=$((NOW - LAST_TS))
    [ "$AGE" -lt 86400 ] && SHOULD_CHECK=false
  fi
  if $SHOULD_CHECK; then
    INSTALLED_SHA=$(jq -r '.plugins["composure@composure-suite"][0].gitCommitSha // empty' "$INSTALLED_PLUGINS" 2>/dev/null)
    if [ -n "$INSTALLED_SHA" ]; then
      HEAD_SHA=$(git -C "$MARKETPLACE_SRC" rev-parse HEAD 2>/dev/null)
      if [ -n "$HEAD_SHA" ] && [ "$INSTALLED_SHA" != "$HEAD_SHA" ]; then
        BEHIND=$(git -C "$MARKETPLACE_SRC" rev-list --count "$INSTALLED_SHA".."$HEAD_SHA" 2>/dev/null || echo "?")
        USER_ACTIONS+=("plugin $BEHIND commits behind — in Claude Code: /plugin install composure@composure-suite")
      fi
    fi
    touch "$LAST_CHECK" 2>/dev/null
  fi
fi

# ── Emit single-line summary OR nothing ──────────────────────
TOTAL=$((${#AUTO_FIXES[@]} + ${#USER_ACTIONS[@]}))
if [ "$TOTAL" -eq 0 ]; then
  exit 0
fi

# Build the output line(s)
OUTPUT=""
if [ ${#AUTO_FIXES[@]} -gt 0 ]; then
  OUTPUT+="[composure:auto-fix] ${#AUTO_FIXES[@]} auto-action(s):"
  for item in "${AUTO_FIXES[@]}"; do
    OUTPUT+="\n  • $item"
  done
fi
if [ ${#USER_ACTIONS[@]} -gt 0 ]; then
  [ -n "$OUTPUT" ] && OUTPUT+="\n"
  OUTPUT+="[composure:auto-fix] ${#USER_ACTIONS[@]} action(s) need you:"
  for item in "${USER_ACTIONS[@]}"; do
    OUTPUT+="\n  • $item"
  done
fi

# Emit as system message so the AI surfaces + acts on it
printf '{"systemMessage": %s}' "$(printf '%b' "$OUTPUT" | jq -Rsa .)"
exit 0
