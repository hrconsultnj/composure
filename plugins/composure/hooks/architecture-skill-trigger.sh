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
CONFIG="${CLAUDE_PROJECT_DIR:-.}/.claude/no-bandaids.json"
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

# ── Check if this is a NEW file creation (Write to non-existent path) ──
IS_NEW_FILE=0
if [ "$TOOL_NAME" = "Write" ] && [ ! -f "$FILE_PATH" ]; then
  IS_NEW_FILE=1
fi

# ── Return system message ──
if [ "$IS_NEW_FILE" -eq 1 ]; then
  printf '{"systemMessage": "ARCHITECTURE: Creating new source file. %s For non-trivial features (multi-file, new routes, new data models), run /composure:blueprint first. Otherwise invoke /composure:app-architecture to load the relevant reference docs."}' "$ARCH_HINT"
else
  printf '{"systemMessage": "ARCHITECTURE: Modifying source file. %s Invoke /composure:app-architecture if you have not loaded reference docs this session. It will load ONLY the docs matching your detected stack."}' "$ARCH_HINT"
fi

exit 0
