#!/bin/bash
# ============================================================
# Decomposition Guide — PreToolUse Hook
# ============================================================
# Fires BEFORE Write/Edit on source files. Injects decomposition
# rules directly into the conversation so sub-agents get them
# without needing to invoke /app-architecture.
#
# Stack-aware: reads .claude/no-bandaids.json to determine if
# architecture patterns exist for the file's language. If no
# patterns exist (e.g., Python backend without fastapi patterns),
# stays quiet — build first, decompose later.
#
# Non-blocking (exit 0 always). Timeout: 5 seconds.
# ============================================================

INPUT=$(cat)
TOOL_NAME=$(echo "$INPUT" | jq -r '.tool_name // empty')
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty')

[ -z "$FILE_PATH" ] && exit 0

# Determine file extension
EXT="${FILE_PATH##*.}"

# Only trigger on source files we have patterns for
case "$EXT" in
  tsx|ts|jsx|js) LANG="typescript" ;;
  *) exit 0 ;;  # No patterns for this language — stay quiet
esac

# Skip non-source files
case "$FILE_PATH" in
  */node_modules/*|*/.next/*|*/dist/*|*/.expo/*) exit 0 ;;
  */.claude/*|*/memory/*|*/tasks-plans/*) exit 0 ;;
  *.test.*|*.spec.*|*_test.*|*__tests__*) exit 0 ;;
  *.config.*|*/tsconfig.*|*/.eslintrc.*) exit 0 ;;
  */database.types.ts|*/generated/*|*.d.ts) exit 0 ;;
esac

# ── Check if architecture patterns exist for this stack ──
# Dual-read: .composure/ first, .claude/ fallback
CONFIG_FILE="${CLAUDE_PROJECT_DIR}/.composure/no-bandaids.json"
if [ ! -f "$CONFIG_FILE" ]; then
  CONFIG_FILE="${CLAUDE_PROJECT_DIR}/.claude/no-bandaids.json"
fi
if [ ! -f "$CONFIG_FILE" ]; then
  # No config — can't determine stack, stay quiet
  exit 0
fi

# Check if the detected stack includes this language at all
HAS_TS=$(jq -r '.frameworks.typescript // empty' "$CONFIG_FILE" 2>/dev/null)
if [ -z "$HAS_TS" ] || [ "$HAS_TS" = "null" ]; then
  exit 0  # TypeScript not in this project's stack
fi

# Detect if we have frontend patterns (for role-specific UI guidance)
HAS_FRONTEND=$(jq -r '.frameworks.typescript.frontend // empty' "$CONFIG_FILE" 2>/dev/null)
[ "$HAS_FRONTEND" = "null" ] && HAS_FRONTEND=""

# ── Session dedup per-file: don't re-inject for the same file ──
SESSION_ID="${CLAUDE_SESSION_ID:-unknown}"
DEDUP_DIR="/tmp/composure-decomp-guide"
mkdir -p "$DEDUP_DIR" 2>/dev/null
FILE_HASH=$(echo "$FILE_PATH" | md5sum 2>/dev/null | cut -d' ' -f1 || echo "$FILE_PATH" | shasum | cut -d' ' -f1)
DEDUP_FILE="${DEDUP_DIR}/${SESSION_ID}-${FILE_HASH}"

if [ -f "$DEDUP_FILE" ]; then
  exit 0  # Already injected for this file this session
fi
touch "$DEDUP_FILE"

# ── Determine context: new file vs existing file ──
IS_NEW=0
FILE_SIZE=0
if [ "$TOOL_NAME" = "Write" ] && [ ! -f "$FILE_PATH" ]; then
  IS_NEW=1
elif [ -f "$FILE_PATH" ]; then
  FILE_SIZE=$(wc -l < "$FILE_PATH" 2>/dev/null | tr -d ' ')
fi

# For existing small files (<100 lines), skip — they're fine
if [ "$IS_NEW" -eq 0 ] && [ "$FILE_SIZE" -lt 100 ]; then
  exit 0
fi

# ── Detect file role for targeted guidance ──
BASENAME=$(basename "$FILE_PATH")
ROLE=""
case "$FILE_PATH" in
  */page.tsx|*/page.ts) ROLE="route" ;;
  */layout.tsx|*/layout.ts) ROLE="layout" ;;
  */route.ts|*/route.tsx) ROLE="api" ;;
  */components/*) ROLE="component" ;;
  */hooks/*) ROLE="hook" ;;
  */actions/*) ROLE="action" ;;
  */providers/*) ROLE="provider" ;;
  */services/*) ROLE="lib" ;;
  */lib/*) ROLE="lib" ;;
esac

# ── Build the guidance message ──
RULES="DECOMPOSITION RULES (enforced by post-hook — build it right the first time):"
RULES="${RULES}\n- File limits: container/component 150, dialog/modal 200, form 300, types 300, hook 120-150"
RULES="${RULES}\n- File-level: 400 (warn), 600 (alert), 800 (critical — stop and split)"
RULES="${RULES}\n- Types: >3 inline types → move to types.ts"
RULES="${RULES}\n- One concern per file — don't mix data fetching, UI, and business logic"

# Add role-specific guidance
case "$ROLE" in
  route)
    if [ -n "$HAS_FRONTEND" ]; then
      RULES="${RULES}\n- Route files: <50 lines. Import a container component, don't inline logic."
      RULES="${RULES}\n- Pattern: page.tsx imports PageContainer → PageContainer has hooks → children are presentational"
    fi
    ;;
  api)
    RULES="${RULES}\n- API route handlers: thin. Parse request → call service function → return response."
    RULES="${RULES}\n- Extract business logic into lib/ or services/ — route handler is just the HTTP boundary."
    RULES="${RULES}\n- Validate input at the boundary (zod), not deep in the service."
    ;;
  component)
    RULES="${RULES}\n- Props down: parent owns hooks/state, children receive props only"
    RULES="${RULES}\n- Single modal: one modal for create/edit with mode prop, not separate components"
    RULES="${RULES}\n- Extend, don't rewrite: modify existing components instead of rebuilding"
    ;;
  hook)
    RULES="${RULES}\n- One query/mutation per hook. Compose hooks in the container, not in each other."
    RULES="${RULES}\n- Account-scoped: include accountId in every queryKey"
    ;;
  action)
    RULES="${RULES}\n- One action per function. Validate input with zod schema at the boundary."
    RULES="${RULES}\n- Extract shared logic into lib/ helpers — actions are thin orchestrators."
    ;;
  layout)
    RULES="${RULES}\n- Layouts are thin: auth check + providers + Suspense boundary. No business logic."
    ;;
  lib)
    RULES="${RULES}\n- One module per concern. Don't mix auth helpers with data formatting with API clients."
    RULES="${RULES}\n- Export from barrel (index.ts). Consumers import from the folder, not individual files."
    RULES="${RULES}\n- If a function exceeds 50 lines, it likely has extractable sub-steps."
    ;;
esac

if [ "$IS_NEW" -eq 1 ]; then
  RULES="${RULES}\nThis is a NEW file — plan the structure before writing. If it will exceed its type limit (150 for components, 300 for forms/types), split upfront."
fi

printf '{"systemMessage": "%s"}' "$(echo -e "$RULES" | sed 's/"/\\"/g' | tr '\n' ' ')"
exit 0
