#!/bin/bash
# ============================================================
# Architecture Skill Auto-Trigger — Global PreToolUse Hook
# ============================================================
# Fires BEFORE Write/Edit on source files. If the target is an
# architecture-relevant file (component, hook, route, migration,
# provider, registry), reminds Claude to invoke /app-architecture.
#
# Uses session-based dedup so it only fires ONCE per session
# (not on every single edit).
#
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
# Use a temp file keyed by session ID to avoid repeated firing
SESSION_ID="${CLAUDE_SESSION_ID:-unknown}"
DEDUP_DIR="/tmp/claude-arch-trigger"
mkdir -p "$DEDUP_DIR" 2>/dev/null
DEDUP_FILE="${DEDUP_DIR}/${SESSION_ID}"

if [ -f "$DEDUP_FILE" ]; then
  exit 0  # Already triggered this session
fi

# Mark as triggered
touch "$DEDUP_FILE"

# ── Check if this is a NEW file creation (Write to non-existent path) ──
IS_NEW_FILE=0
if [ "$TOOL_NAME" = "Write" ] && [ ! -f "$FILE_PATH" ]; then
  IS_NEW_FILE=1
fi

# ── Return system message ──
if [ "$IS_NEW_FILE" -eq 1 ]; then
  printf '{"systemMessage": "ARCHITECTURE REMINDER: You are about to CREATE a new source file. If you have not already loaded the /app-architecture skill this session, invoke it now. For non-trivial features (multi-file, new routes, new data models), consider running /blueprint first to plan the approach and identify impact before writing code."}'
  exit 0
fi

printf '{"systemMessage": "ARCHITECTURE REMINDER: You are about to create/modify a source file. If you have not already loaded the /app-architecture skill this session, invoke it now. It contains the decomposition rules, size limits, query patterns, and folder conventions for this codebase."}'
exit 0
