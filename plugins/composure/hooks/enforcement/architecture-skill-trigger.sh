#!/bin/bash
# ============================================================
# Architecture Skill Auto-Trigger — Global PreToolUse Hook
# ============================================================
# Fires BEFORE Write/Edit on source files. If the target is an
# architecture-relevant file, injects a framework-specific
# reminder with the exact architecture docs to load.
#
# Reads .claude/no-bandaids.json for stack detection so the
# message tells Claude WHICH category to load, not just
# "invoke /app-architecture" generically.
#
# Uses session-based dedup so it only fires ONCE per session.
# Non-blocking (exit 0 always). Timeout: 5 seconds.
# ============================================================

INPUT=$(cat)
TOOL_NAME=$(echo "$INPUT" | jq -r '.tool_name // empty')
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // .tool_input.command // empty')

[ -z "$FILE_PATH" ] && exit 0

# ── Project type gate: skip in non-project dirs ──
_PT_DIR="${CLAUDE_PROJECT_DIR:-.}"
if command -v md5 >/dev/null 2>&1; then
  _PT_HASH=$(echo -n "$_PT_DIR" | md5 -q)
else
  _PT_HASH=$(echo -n "$_PT_DIR" | md5sum | cut -d' ' -f1)
fi
_PT_FILE="/tmp/composure-project-type-${_PT_HASH}"
[ -f "$_PT_FILE" ] && case "$(cat "$_PT_FILE")" in workspace|folder) exit 0 ;; esac

# Only trigger on source files
case "$FILE_PATH" in
  *.tsx|*.ts|*.jsx|*.js|*.sql) ;;
  *) exit 0 ;;
esac

# Skip non-architecture files (configs, tests, generated, memory, etc.)
case "$FILE_PATH" in
  */node_modules/*|*/.next/*|*/dist/*|*/.expo/*) exit 0 ;;
  */.claude/*|*/memory/*) exit 0 ;;
  *.test.*|*.spec.*|*_test.*) exit 0 ;;
  */babel.config.*|*/metro.config.*|*/tailwind.config.*) exit 0 ;;
  */tsconfig.*|*/.eslintrc.*|*/next.config.*) exit 0 ;;
  */database.ts|*/database.types.ts) exit 0 ;;
esac

# ── Check if this is an architecture-relevant file ──
IS_ARCH=0

case "$FILE_PATH" in
  # Routes and pages
  */app/*/page.tsx|*/app/*/layout.tsx|*/app/*/route.ts) IS_ARCH=1 ;;
  # Components
  */components/*.tsx|*/components/*.ts) IS_ARCH=1 ;;
  # Hooks
  */hooks/*.ts|*/hooks/*.tsx) IS_ARCH=1 ;;
  # Providers
  */providers/*.tsx|*/providers/*.ts) IS_ARCH=1 ;;
  # Migrations
  */migrations/*.sql) IS_ARCH=1 ;;
  # Server actions
  */actions/*.ts) IS_ARCH=1 ;;
  # Lib modules (AI, auth, integrations)
  */lib/*.ts|*/lib/*.tsx) IS_ARCH=1 ;;
esac

[ "$IS_ARCH" -eq 0 ] && exit 0

# ── Session dedup: only trigger once per session ──
SESSION_ID="${CLAUDE_SESSION_ID:-unknown}"
DEDUP_DIR="/tmp/claude-arch-trigger"
mkdir -p "$DEDUP_DIR" 2>/dev/null
DEDUP_FILE="${DEDUP_DIR}/${SESSION_ID}"

if [ -f "$DEDUP_FILE" ]; then
  exit 0  # Already triggered this session
fi

# Mark as triggered
touch "$DEDUP_FILE"

# ── Detect framework from config ──
# Dual-read: .composure/ first, .claude/ fallback
CONFIG="${CLAUDE_PROJECT_DIR:-.}/.composure/no-bandaids.json"
[ ! -f "$CONFIG" ] && CONFIG="${CLAUDE_PROJECT_DIR:-.}/.claude/no-bandaids.json"
FRONTEND="unknown"
ARCH_HINT=""

if [ -f "$CONFIG" ]; then
  FRONTEND=$(jq -r '.frameworks | to_entries[0].value.frontend // "null"' "$CONFIG" 2>/dev/null)

  case "$FRONTEND" in
    nextjs)
      ARCH_HINT="This is a Next.js project. Load: fullstack/INDEX.md (includes frontend/core.md + nextjs patterns)."
      ;;
    vite)
      ARCH_HINT="This is a Vite project. Load: frontend/INDEX.md (includes core.md + vite patterns)."
      ;;
    angular)
      ARCH_HINT="This is an Angular project. Load: frontend/INDEX.md (includes core.md + angular patterns)."
      ;;
    expo)
      ARCH_HINT="This is an Expo project. Load: mobile/INDEX.md (includes frontend/core.md + expo patterns)."
      ;;
    *)
      ARCH_HINT="Load: frontend/INDEX.md → core.md for universal patterns."
      ;;
  esac

  # Add backend hint for SQL files
  case "$FILE_PATH" in
    *.sql)
      ARCH_HINT="Database migration detected. Load: backend/INDEX.md → core.md for schema, RLS, and auth model patterns."
      ;;
  esac
fi

# ── Pro data-patterns injection (Supabase / multi-tenant) ────
# Resolves the canonical pattern catalog and picks the relevant
# files for this edit. Free tier gets an MCP-fetch hint instead.
DP_HINT=""
case "$FILE_PATH" in
  *.sql|*/lib/supabase/*|*/supabase/migrations/*|*/supabase/functions/*|*/hooks/*supabase*|*/queries/*|*/repositories/*|*/rls/*|*/policies/*)
    SCRIPT_DIR_DP="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
    if [ -f "${SCRIPT_DIR_DP}/../lib/resolve-data-patterns.sh" ]; then
      # shellcheck disable=SC1091
      source "${SCRIPT_DIR_DP}/../lib/resolve-data-patterns.sh"
      DP_FILES=$(data_patterns_for "$FILE_PATH")
      case "$DATA_PATTERNS_SOURCE" in
        env|dev|cache)
          if [ -n "$DP_FILES" ]; then
            DP_HINT=" Pro data-patterns: ${DATA_PATTERNS_PATH} — read first: ${DP_FILES}."
          else
            DP_HINT=" Pro data-patterns: ${DATA_PATTERNS_PATH} — see INDEX for the relevant pattern."
          fi
          ;;
        mcp)
          DP_HINT=" Pro data-patterns: no local copy — call composure_fetch_ref({category:\"data-patterns\"}) for the catalog."
          ;;
      esac
    fi
    ;;
esac

# ── Check if this is a NEW file creation (Write to non-existent path) ──
IS_NEW_FILE=0
if [ "$TOOL_NAME" = "Write" ] && [ ! -f "$FILE_PATH" ]; then
  IS_NEW_FILE=1
fi

# ── Activity counter ──
printf 'check\n' >> "${CLAUDE_PROJECT_DIR:-.}/.composure/hook-activity.log" 2>/dev/null

# ── Phase 2 cue (per noise-reduction-moat criterion + Stage 5b conversion) ──
# This hook catches IGNORANCE (forgot to load framework docs), not mistakes,
# so it converts to a CUE: terse, advisory, never-blocking. With Stage 2 memory
# loaded at SessionStart, the model already has continuity; this hook now nudges
# rather than gates. Once-per-session via dedup is preserved.
if [ "$IS_NEW_FILE" -eq 1 ]; then
  printf '{"systemMessage": "[architecture] New source file. %s%s Use /composure:blueprint for routes/migrations/5+ files; /composure:app-architecture for reference docs if not yet loaded. Graph MCP tools beat Explore for structural questions."}' "$ARCH_HINT" "$DP_HINT"
else
  printf '{"systemMessage": "[architecture] %s%s Refresh /composure:app-architecture if framework docs not loaded this session. Graph MCP tools (query_graph, semantic_search_nodes, get_impact_radius) for structure."}' "$ARCH_HINT" "$DP_HINT"
fi

exit 0
