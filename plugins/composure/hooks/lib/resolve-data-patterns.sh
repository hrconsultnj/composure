#!/bin/bash
# ============================================================
# Resolve Data Patterns — Shared Helper
# ============================================================
# Source this in hooks that need to point Claude at the canonical
# Pro multi-tenant data patterns (migrations, RLS, entity feed,
# id-prefix, denormalization, etc).
#
# Resolution priority:
#   1. $COMPOSURE_DATA_PATTERNS_PATH    — explicit override
#   2. Sibling dev repo                  — for plugin authors working
#      against composure-pro alongside claude-plugins
#   3. Plugin cache install              — installed pro-patterns plugin
#   4. None                              — emit MCP fetch hint instead
#
# Plan gating:
#   Pro / Enterprise → local path takes precedence.
#   Free            → no path; suggest composure_fetch_ref tool.
#
# Sets:
#   DATA_PATTERNS_PATH   — absolute dir (or empty if none)
#   DATA_PATTERNS_SOURCE — env|dev|cache|mcp|none
#   DATA_PATTERNS_PLAN   — plan tier (free|pro|enterprise|unknown)
#
# Usage:
#   SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
#   source "${SCRIPT_DIR}/../lib/resolve-data-patterns.sh"
# ============================================================

DATA_PATTERNS_PATH=""
DATA_PATTERNS_SOURCE="none"
DATA_PATTERNS_PLAN="unknown"

# ── 1. Plan detection (silent) ───────────────────────────────
CREDS_FILE="${HOME}/.composure/credentials.json"
if [ -f "$CREDS_FILE" ]; then
  DATA_PATTERNS_PLAN=$(jq -r '.plan // "free"' "$CREDS_FILE" 2>/dev/null)
  [ -z "$DATA_PATTERNS_PLAN" ] && DATA_PATTERNS_PLAN="free"
fi

# ── 2. Env override (works at any plan tier) ─────────────────
if [ -n "$COMPOSURE_DATA_PATTERNS_PATH" ] && [ -d "$COMPOSURE_DATA_PATTERNS_PATH" ]; then
  DATA_PATTERNS_PATH="$COMPOSURE_DATA_PATTERNS_PATH"
  DATA_PATTERNS_SOURCE="env"
  return 0 2>/dev/null || true
fi

# ── 3. Sibling dev repo (plugin authors) ─────────────────────
# Layout: <repo>/claude-plugins/plugins/composure ↔ <repo>/composure-pro/plugins/pro-patterns
if [ -z "$DATA_PATTERNS_PATH" ] && [ -n "$CLAUDE_PLUGIN_ROOT" ]; then
  CANDIDATE="${CLAUDE_PLUGIN_ROOT}/../../../composure-pro/plugins/pro-patterns/data-patterns"
  if [ -d "$CANDIDATE" ]; then
    DATA_PATTERNS_PATH=$(cd "$CANDIDATE" 2>/dev/null && pwd)
    DATA_PATTERNS_SOURCE="dev"
  fi
fi

# ── 4. Plugin cache install ──────────────────────────────────
if [ -z "$DATA_PATTERNS_PATH" ]; then
  CACHE_BASE="${HOME}/.claude/plugins/cache/composure-suite/pro-patterns"
  if [ -d "$CACHE_BASE" ]; then
    LATEST=$(ls -td "$CACHE_BASE"/*/ 2>/dev/null | head -1)
    if [ -n "$LATEST" ] && [ -d "${LATEST}data-patterns" ]; then
      DATA_PATTERNS_PATH="${LATEST}data-patterns"
      DATA_PATTERNS_SOURCE="cache"
    fi
  fi
fi

# ── 5. MCP fallback (for Pro/Enterprise users without local copy) ──
if [ -z "$DATA_PATTERNS_PATH" ]; then
  case "$DATA_PATTERNS_PLAN" in
    pro|enterprise) DATA_PATTERNS_SOURCE="mcp" ;;
    *)              DATA_PATTERNS_SOURCE="none" ;;
  esac
fi

# ── Emit a one-line system hint suitable for echo into hook output.
# Hooks call this AFTER sourcing if they want a ready-made banner.
data_patterns_banner() {
  case "$DATA_PATTERNS_SOURCE" in
    env|dev|cache)
      printf '[composure:data-patterns] %s (%s, %s plan)\n' \
        "$DATA_PATTERNS_PATH" "$DATA_PATTERNS_SOURCE" "$DATA_PATTERNS_PLAN"
      ;;
    mcp)
      printf '[composure:data-patterns] No local copy. Use MCP composure_fetch_ref({category:"data-patterns"}) — %s plan.\n' \
        "$DATA_PATTERNS_PLAN"
      ;;
    none) ;;
  esac
}

# ── Pick the most relevant pattern files for a given file path.
# Echoes a short comma-separated list of filenames (no path) that
# Claude should load before editing $1. Empty if no match.
data_patterns_for() {
  local target="$1"
  local base
  base=$(basename "$target" 2>/dev/null)
  # Reorganized 2026-05-03 into category folders. Always recommend reading the
  # category INDEX first (which forces "read all files in this category").
  case "$base" in
    *rls*|*policy*|*policies*)
      printf '20-auth/INDEX.md, 20-auth/rls/INDEX.md (read all 4 rls/* together), 20-auth/02-four-level-auth.md, 20-auth/01-privacy-role-system.md'
      return 0
      ;;
  esac
  case "$target" in
    */rls/*|*/policies/*)
      printf '20-auth/INDEX.md, 20-auth/rls/INDEX.md (read all 4 rls/* together), 20-auth/02-four-level-auth.md, 20-auth/01-privacy-role-system.md'
      ;;
    */migrations/*.sql|*/supabase/migrations/*)
      printf '00-foundation/INDEX.md (all 5), 10-schema/INDEX.md (all 9), 10-schema/01-foundation-migrations.md, 10-schema/02-entity-registry-feed.md, 10-schema/05-trigger-denormalization.md, 10-schema/06-fk-display-denormalization.md'
      ;;
    *.sql)
      printf '00-foundation/INDEX.md, 10-schema/01-foundation-migrations.md, 10-schema/02-entity-registry-feed.md, 10-schema/06-fk-display-denormalization.md, 20-auth/rls/INDEX.md'
      ;;
    */lib/supabase/*|*/supabase/functions/*)
      printf '00-foundation/INDEX.md, 20-auth/02-four-level-auth.md, 20-auth/03-contact-first-pattern.md, 00-foundation/04-type-generation-pipeline.md, 00-foundation/05-types-from-database.md'
      ;;
    */hooks/*supabase*|*/queries/*|*/repositories/*)
      printf '40-frontend/INDEX.md (all 5), 40-frontend/01-query-key-conventions.md, 40-frontend/05-profile-cache-staleness.md, 10-schema/06-fk-display-denormalization.md'
      ;;
    */app/*/page.tsx|*/app/*/layout.tsx|*/components/*|*/providers/*)
      printf '40-frontend/INDEX.md (all 5), 20-auth/INDEX.md (relevant for any auth-aware UI)'
      ;;
    *) printf '' ;;
  esac
}
