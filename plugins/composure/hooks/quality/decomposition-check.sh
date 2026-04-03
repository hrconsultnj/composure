#!/bin/bash
# ============================================================
# Code Quality Guard — PostToolUse Hook
# ============================================================
# Fires after Edit/Write on source files. Detects oversized files,
# large functions, inline types, and responsibility violations.
# Logs findings to tasks-plans/tasks.md.
#
# Task file management is in task-writer.sh (sourced helper).
# Non-blocking (exit 0 always). Timeout: 10 seconds.
# ============================================================

INPUT=$(cat)
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty')

[ -z "$FILE_PATH" ] && exit 0

# Only check source files
case "$FILE_PATH" in
  *.tsx|*.ts|*.jsx|*.js) ;;
  *) exit 0 ;;
esac

# Skip non-source files
case "$FILE_PATH" in
  */node_modules/*|*/.next/*|*/dist/*|*/.expo/*) exit 0 ;;
  */database.types.ts|*/database.ts|*/generated/*) exit 0 ;;
  *_test.*|*.test.*|*.spec.*) exit 0 ;;
  */.claude/*|*/memory/*) exit 0 ;;
  */babel.config.*|*/metro.config.*|*/tailwind.config.*) exit 0 ;;
  */tsconfig.*|*/.eslintrc.*|*/next.config.*) exit 0 ;;
esac

[ ! -f "$FILE_PATH" ] && exit 0

# ── /simplify suggestion tracker ──────────────────────────────
SIMPLIFY_THRESHOLD=5
SESSION_KEY="${CLAUDE_SESSION_ID:-unknown}"
SIMPLIFY_COUNTER="/tmp/composure-edits-${SESSION_KEY}"
SIMPLIFY_SUGGESTED="/tmp/composure-simplify-done-${SESSION_KEY}"
EDIT_COUNT=$(cat "$SIMPLIFY_COUNTER" 2>/dev/null || echo 0)
EDIT_COUNT=$((EDIT_COUNT + 1))
printf '%d' "$EDIT_COUNT" > "$SIMPLIFY_COUNTER"
SUGGEST_SIMPLIFY=""
if [ "$EDIT_COUNT" -ge "$SIMPLIFY_THRESHOLD" ] && [ ! -f "$SIMPLIFY_SUGGESTED" ]; then
  touch "$SIMPLIFY_SUGGESTED"
  SUGGEST_SIMPLIFY="You have edited ${EDIT_COUNT}+ files this session. Ask the user: 'Want me to run /simplify to refine what I just wrote before continuing?' — use AskUserQuestion, do not auto-run."
fi

LINE_COUNT=$(wc -l < "$FILE_PATH" 2>/dev/null | tr -d ' ')
[ -z "$LINE_COUNT" ] || [ "$LINE_COUNT" -lt 100 ] && {
  if [ -n "$SUGGEST_SIMPLIFY" ]; then
    printf '{"systemMessage": "%s"}' "$SUGGEST_SIMPLIFY"
  fi
  exit 0
}

# ── Config ──
WARN_LINES=400
ALERT_LINES=600
CRITICAL_LINES=800
FUNC_MAX_LINES=150
TODAY=$(date +%Y-%m-%d)

# ── Paths ──
BASENAME=$(basename "$FILE_PATH")
RELATIVE_PATH="${FILE_PATH#$CLAUDE_PROJECT_DIR/}"
[ "$RELATIVE_PATH" = "$FILE_PATH" ] && RELATIVE_PATH="$BASENAME"
TASK_FILE="${CLAUDE_PROJECT_DIR}/tasks-plans/tasks.md"

# ── Dedup check: skip if this file already has an open task ──
DEDUP_PATTERN='`'"${RELATIVE_PATH}"'`'
if [ -f "$TASK_FILE" ] && grep -qF -- "- [ ]" "$TASK_FILE" 2>/dev/null; then
  if grep -qF "$DEDUP_PATTERN" "$TASK_FILE" 2>/dev/null; then
    if grep -F "$DEDUP_PATTERN" "$TASK_FILE" | grep -qF -- "- [ ]"; then
      exit 0
    fi
  fi
fi

IS_ROUTE=0
case "$BASENAME" in
  page.tsx|page.ts|layout.tsx|layout.ts) IS_ROUTE=1 ;;
esac

# ── 1. Find large functions/components ──
LARGE_FUNCS=""
LARGE_FUNC_COUNT=0

GRAPH_DB="${CLAUDE_PROJECT_DIR}/.code-review-graph/graph.db"
ABS_FILE_PATH=$(cd "$(dirname "$FILE_PATH")" 2>/dev/null && echo "$(pwd)/$(basename "$FILE_PATH")")
[ -z "$ABS_FILE_PATH" ] && ABS_FILE_PATH="$FILE_PATH"

if [ -f "$GRAPH_DB" ] && command -v sqlite3 >/dev/null 2>&1; then
  GRAPH_RESULTS=$(sqlite3 "$GRAPH_DB" \
    "SELECT name, line_start, line_end, (line_end - line_start + 1) as lines
     FROM nodes
     WHERE file_path = '${ABS_FILE_PATH}'
       AND kind IN ('Function', 'Test', 'Class')
       AND (line_end - line_start + 1) >= ${FUNC_MAX_LINES}
     ORDER BY lines DESC
     LIMIT 10" 2>/dev/null)

  if [ -n "$GRAPH_RESULTS" ]; then
    while IFS='|' read -r fname lstart lend flines; do
      [ -z "$fname" ] && continue
      LARGE_FUNCS="${LARGE_FUNCS}  - EXTRACT: \`${fname}\` (lines ${lstart}-${lend}, ~${flines} lines)\n"
      LARGE_FUNC_COUNT=$((LARGE_FUNC_COUNT + 1))
    done <<< "$GRAPH_RESULTS"
  fi
else
  # Regex fallback: heuristic function size estimation
  FUNC_DECLS=$(grep -nE '^(export[[:space:]]+)?(default[[:space:]]+)?(async[[:space:]]+)?function[[:space:]]+[A-Za-z_]\w*' "$FILE_PATH" 2>/dev/null | head -20)
  ARROW_DECLS=$(grep -nE '^(export[[:space:]]+)?(const|let)[[:space:]]+[A-Za-z_]\w*[[:space:]]*:[[:space:]]*React\.(FC|memo|forwardRef)' "$FILE_PATH" 2>/dev/null | head -10)
  ARROW_ASSIGN=$(grep -nE '^(export[[:space:]]+)?(const|let)[[:space:]]+[A-Za-z_]\w*[[:space:]]*=[[:space:]]*(memo\(|forwardRef\(|\([[:space:]]*[\{)]|\([[:space:]]*props|\([[:space:]]*\)|\([[:space:]]*[a-z]\w*[[:space:],):]|function[[:space:]]*\(|\<\w)' "$FILE_PATH" 2>/dev/null | head -10)
  ARROW_DECLS=$(printf '%s\n%s' "$ARROW_DECLS" "$ARROW_ASSIGN" | grep -v '^$')
  FUNC_LINES=$(printf '%s\n%s' "$FUNC_DECLS" "$ARROW_DECLS" | grep -v '^$' | sort -t: -k1,1n | head -30)

  if [ -n "$FUNC_LINES" ]; then
    PREV_LINE=0
    PREV_NAME=""
    while IFS= read -r line; do
      LNUM=$(echo "$line" | cut -d: -f1 | tr -d ' ')
      CODE=$(echo "$line" | cut -d: -f2-)
      FNAME=""
      if echo "$CODE" | grep -qE 'function[[:space:]]+[A-Za-z_]'; then
        FNAME=$(echo "$CODE" | sed -E 's/.*function[[:space:]]+([A-Za-z_][A-Za-z0-9_]*).*/\1/')
      fi
      if [ -z "$FNAME" ] || [ "$FNAME" = "$CODE" ]; then
        FNAME=$(echo "$CODE" | sed -E 's/.*(const|let)[[:space:]]+([A-Za-z_][A-Za-z0-9_]*).*/\2/')
      fi
      [ -z "$FNAME" ] || [ "$FNAME" = "$CODE" ] && FNAME="unknown"

      if [ "$PREV_LINE" -gt 0 ] && [ "$LNUM" -gt "$PREV_LINE" ]; then
        FUNC_SIZE=$((LNUM - PREV_LINE))
        if [ "$FUNC_SIZE" -ge "$FUNC_MAX_LINES" ]; then
          PREV_END=$((LNUM - 1))
          LARGE_FUNCS="${LARGE_FUNCS}  - EXTRACT: \`${PREV_NAME}\` (lines ${PREV_LINE}-${PREV_END}, ~${FUNC_SIZE} lines)\n"
          LARGE_FUNC_COUNT=$((LARGE_FUNC_COUNT + 1))
        fi
      fi
      PREV_LINE=$LNUM
      PREV_NAME=$FNAME
    done <<< "$FUNC_LINES"

    if [ "$PREV_LINE" -gt 0 ]; then
      FUNC_SIZE=$((LINE_COUNT - PREV_LINE + 1))
      if [ "$FUNC_SIZE" -ge "$FUNC_MAX_LINES" ]; then
        LARGE_FUNCS="${LARGE_FUNCS}  - EXTRACT: \`${PREV_NAME}\` (lines ${PREV_LINE}-${LINE_COUNT}, ~${FUNC_SIZE} lines)\n"
        LARGE_FUNC_COUNT=$((LARGE_FUNC_COUNT + 1))
      fi
    fi
  fi
fi

# ── 2. Find inline types ──
INLINE_TYPES=""
TYPE_COUNT=0
TYPE_NAMES=$(grep -oE '^[[:space:]]*(export[[:space:]]+)?(interface|type)[[:space:]]+([A-Za-z_]\w*)' "$FILE_PATH" 2>/dev/null | sed -E 's/.*(interface|type)[[:space:]]+//' | head -20)
if [ -n "$TYPE_NAMES" ]; then
  TYPE_COUNT=$(echo "$TYPE_NAMES" | wc -l | tr -d ' ')
  if [ "$TYPE_COUNT" -gt 3 ]; then
    case "$BASENAME" in
      types.ts|types.tsx) ;;
      *)
        TYPE_LIST=$(echo "$TYPE_NAMES" | tr '\n' ', ' | sed 's/,$//' | sed 's/,/, /g')
        INLINE_TYPES="  - MOVE: ${TYPE_COUNT} inline types (\`${TYPE_LIST}\`) to \`types.ts\`"
        ;;
    esac
  fi
fi

# ── 2b. Find inline data constants ──
INLINE_DATA=""
INLINE_DATA_COUNT=0
case "$BASENAME" in
  *.tsx)
    DATA_CONSTS=$(grep -nE '^\s*(export\s+)?const\s+[A-Za-z_]\w*\s*(:\s*\w+(\[\]|<).*)?=\s*\[' "$FILE_PATH" 2>/dev/null | head -20)
    if [ -n "$DATA_CONSTS" ]; then
      INLINE_DATA_COUNT=$(echo "$DATA_CONSTS" | wc -l | tr -d ' ')
      if [ "$INLINE_DATA_COUNT" -gt 2 ]; then
        DATA_NAMES=$(echo "$DATA_CONSTS" | sed -E 's/.*const[[:space:]]+([A-Za-z_][A-Za-z0-9_]*).*/\1/' | tr '\n' ', ' | sed 's/,$//' | sed 's/,/, /g')
        INLINE_DATA="  - MOVE: ${INLINE_DATA_COUNT} inline data constants (\`${DATA_NAMES}\`) to \`lib/constants.ts\`"
      fi
    fi
    ;;
esac

# ── 3. Shared-type duplication check ──
SHARED_TASK=""
SHARED_DIR=""
SHARED_PKG_NAME=""
for candidate in "packages/shared/src" "packages/common/src" "packages/core/src"; do
  if [ -d "${CLAUDE_PROJECT_DIR}/${candidate}" ]; then
    SHARED_DIR="${CLAUDE_PROJECT_DIR}/${candidate}"
    PKG_JSON="${CLAUDE_PROJECT_DIR}/$(dirname "$candidate")/package.json"
    if [ -f "$PKG_JSON" ]; then
      SHARED_PKG_NAME=$(grep -o '"name"[[:space:]]*:[[:space:]]*"[^"]*"' "$PKG_JSON" 2>/dev/null | sed 's/.*"name"[[:space:]]*:[[:space:]]*"//' | sed 's/"//')
    fi
    [ -z "$SHARED_PKG_NAME" ] && SHARED_PKG_NAME="shared package"
    break
  fi
done

if [ -n "$SHARED_DIR" ] && [ -n "$TYPE_NAMES" ]; then
  SHARED_DUPES=""
  TYPES_TO_CHECK=$(echo "$TYPE_NAMES" | head -5)
  while IFS= read -r tname; do
    [ -z "$tname" ] && continue
    if grep -rlE "(export[[:space:]]+)?(interface|type)[[:space:]]+${tname}[[:space:]<{=]" "$SHARED_DIR" --include="*.ts" --include="*.tsx" 2>/dev/null | head -1 | grep -q .; then
      SHARED_DUPES="${SHARED_DUPES}\`${tname}\`, "
    fi
  done <<< "$TYPES_TO_CHECK"
  if [ -n "$SHARED_DUPES" ]; then
    SHARED_DUPES=$(echo "$SHARED_DUPES" | sed 's/, $//')
    SHARED_TASK="- [ ] 🟢 **SHARED** \`${RELATIVE_PATH}\` [${TODAY}]\n  - Types ${SHARED_DUPES} already exist in \`${SHARED_PKG_NAME}\` — import instead of inline definition"
  fi
fi

# ── 3b. Multiple exported components ──
MULTI_COMPONENT=""
COMPONENT_COUNT=0
case "$BASENAME" in
  *.tsx)
    COMPONENT_NAMES=$(grep -oE '^\s*export\s+(default\s+)?(function|const)\s+[A-Z][A-Za-z0-9_]*' "$FILE_PATH" 2>/dev/null | sed -E 's/.*(function|const)[[:space:]]+//' | head -10)
    if [ -n "$COMPONENT_NAMES" ]; then
      COMPONENT_COUNT=$(echo "$COMPONENT_NAMES" | wc -l | tr -d ' ')
      if [ "$COMPONENT_COUNT" -gt 2 ]; then
        COMP_LIST=$(echo "$COMPONENT_NAMES" | tr '\n' ', ' | sed 's/,$//' | sed 's/,/, /g')
        MULTI_COMPONENT="  - SPLIT: ${COMPONENT_COUNT} exported components (\`${COMP_LIST}\`) — each should be its own file"
      fi
    fi
    ;;
esac

# ── 4. Other checks ──
OTHER_ITEMS=""

STYLE_START=$(grep -n 'StyleSheet\.create' "$FILE_PATH" 2>/dev/null | head -1 | cut -d: -f1)
if [ -n "$STYLE_START" ]; then
  REMAINING=$((LINE_COUNT - STYLE_START))
  [ "$REMAINING" -gt 30 ] && OTHER_ITEMS="${OTHER_ITEMS}  - MOVE: StyleSheet.create block (line ${STYLE_START}, ~${REMAINING} lines) to \`styles.ts\`\n"
fi

if [ "$IS_ROUTE" -eq 1 ] || echo "$BASENAME" | grep -qE '(screen|page)'; then
  MODAL_LINE=$(grep -nE '(BottomSheet|BottomSheetModal|Dialog|AlertDialog)\b' "$FILE_PATH" 2>/dev/null | head -1 | cut -d: -f1)
  [ -n "$MODAL_LINE" ] && OTHER_ITEMS="${OTHER_ITEMS}  - EXTRACT: Modal/Sheet component (near line ${MODAL_LINE}) into its own file\n"
fi

if [ "$IS_ROUTE" -eq 1 ] && [ "$LINE_COUNT" -gt 80 ]; then
  OTHER_ITEMS="${OTHER_ITEMS}  - REFACTOR: Route file (${LINE_COUNT} lines, should be <50) — move logic to container component\n"
fi

# ── 5. TODO/FIXME/HACK comments ──
TODO_ITEMS=""
TODO_COUNT=0
TODO_MATCHES=$(grep -nE '//\s*(TODO|FIXME|HACK|XXX|TEMP|WORKAROUND)\b' "$FILE_PATH" 2>/dev/null | head -10)
if [ -n "$TODO_MATCHES" ]; then
  TODO_COUNT=$(echo "$TODO_MATCHES" | wc -l | tr -d ' ')
  while IFS= read -r line; do
    LNUM=$(echo "$line" | cut -d: -f1 | tr -d ' ')
    COMMENT=$(echo "$line" | cut -d: -f2- | sed 's/^[[:space:]]*//' | cut -c1-80)
    TODO_ITEMS="${TODO_ITEMS}  - Line ${LNUM}: \`${COMMENT}\`\n"
  done <<< "$TODO_MATCHES"
fi

# ── 6. Lint/type suppression comments ──
SUPPRESS_ITEMS=""
SUPPRESS_COUNT=0
SUPPRESS_MATCHES=$(grep -nE '(//\s*@ts-nocheck|//\s*@ts-ignore|/\*\s*eslint-disable\s*\*/|//\s*eslint-disable-next-line\s*$|//\s*biome-ignore\s*$|//\s*@ts-expect-error)' "$FILE_PATH" 2>/dev/null | head -10)
if [ -n "$SUPPRESS_MATCHES" ]; then
  SUPPRESS_COUNT=$(echo "$SUPPRESS_MATCHES" | wc -l | tr -d ' ')
  while IFS= read -r line; do
    LNUM=$(echo "$line" | cut -d: -f1 | tr -d ' ')
    COMMENT=$(echo "$line" | cut -d: -f2- | sed 's/^[[:space:]]*//' | cut -c1-80)
    SUPPRESS_ITEMS="${SUPPRESS_ITEMS}  - Line ${LNUM}: \`${COMMENT}\`\n"
  done <<< "$SUPPRESS_MATCHES"
fi

# ── Determine severity ──
SEVERITY=""
EMOJI=""
HAS_RESPONSIBILITY_VIOLATION=0
[ -n "$INLINE_TYPES" ] || [ -n "$INLINE_DATA" ] || [ -n "$MULTI_COMPONENT" ] || [ -n "$OTHER_ITEMS" ] || [ "$LARGE_FUNC_COUNT" -gt 0 ] && HAS_RESPONSIBILITY_VIOLATION=1

if [ "$LINE_COUNT" -ge "$CRITICAL_LINES" ]; then
  SEVERITY="CRITICAL"; EMOJI="🔴"
elif [ "$LINE_COUNT" -ge "$ALERT_LINES" ] && [ "$HAS_RESPONSIBILITY_VIOLATION" -eq 1 ]; then
  SEVERITY="CRITICAL"; EMOJI="🔴"
elif [ "$LINE_COUNT" -ge "$ALERT_LINES" ] || { [ "$LARGE_FUNC_COUNT" -gt 0 ] && [ "$LINE_COUNT" -ge "$WARN_LINES" ]; }; then
  SEVERITY="HIGH"; EMOJI="🟡"
elif [ "$LARGE_FUNC_COUNT" -gt 0 ]; then
  SEVERITY="HIGH"; EMOJI="🟡"
elif [ "$HAS_RESPONSIBILITY_VIOLATION" -eq 1 ]; then
  SEVERITY="MODERATE"; EMOJI="🟢"
fi

[ -z "$SEVERITY" ] && [ -z "$SHARED_TASK" ] && {
  if [ -n "$SUGGEST_SIMPLIFY" ]; then
    printf '{"systemMessage": "%s"}' "$SUGGEST_SIMPLIFY"
  fi
  exit 0
}

# ── Source task writer helper ──
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/task-writer.sh"
init_task_file "$TASK_FILE"

TASKS_ADDED=0

if [ -n "$SEVERITY" ]; then
  TASK_BLOCK="- [ ] ${EMOJI} **DECOMPOSE** \`${RELATIVE_PATH}\` (${LINE_COUNT} lines) [${TODAY}]"
  [ -n "$LARGE_FUNCS" ] && TASK_BLOCK="${TASK_BLOCK}\n${LARGE_FUNCS}"
  [ -n "$INLINE_TYPES" ] && TASK_BLOCK="${TASK_BLOCK}\n${INLINE_TYPES}"
  [ -n "$INLINE_DATA" ] && TASK_BLOCK="${TASK_BLOCK}\n${INLINE_DATA}"
  [ -n "$MULTI_COMPONENT" ] && TASK_BLOCK="${TASK_BLOCK}\n${MULTI_COMPONENT}"
  [ -n "$OTHER_ITEMS" ] && TASK_BLOCK="${TASK_BLOCK}\n${OTHER_ITEMS}"

  case "$SEVERITY" in
    CRITICAL) insert_into_section "$TASK_FILE" "$SECTION_CRITICAL" "$TASK_BLOCK" ;;
    HIGH)     insert_into_section "$TASK_FILE" "$SECTION_HIGH" "$TASK_BLOCK" ;;
    MODERATE) insert_into_section "$TASK_FILE" "$SECTION_MODERATE" "$TASK_BLOCK" ;;
  esac
  TASKS_ADDED=$((TASKS_ADDED + 1))
fi

if [ -n "$SHARED_TASK" ]; then
  insert_into_section "$TASK_FILE" "$SECTION_MODERATE" "$SHARED_TASK"
  TASKS_ADDED=$((TASKS_ADDED + 1))
fi

if [ "$SUPPRESS_COUNT" -gt 0 ]; then
  SUPPRESS_DEDUP='`'"${RELATIVE_PATH}"'`.*SUPPRESS'
  if ! grep -q "$SUPPRESS_DEDUP" "$TASK_FILE" 2>/dev/null; then
    SUPPRESS_BLOCK="- [ ] \xF0\x9F\x9F\xA1 **SUPPRESS** \`${RELATIVE_PATH}\` (${SUPPRESS_COUNT} suppression(s)) [${TODAY}]\n${SUPPRESS_ITEMS}"
    insert_into_section "$TASK_FILE" "$SECTION_HIGH" "$SUPPRESS_BLOCK"
    TASKS_ADDED=$((TASKS_ADDED + 1))
  fi
fi

if [ "$TODO_COUNT" -gt 0 ]; then
  TODO_DEDUP='`'"${RELATIVE_PATH}"'`.*TODO'
  if ! grep -q "$TODO_DEDUP" "$TASK_FILE" 2>/dev/null; then
    TODO_BLOCK="- [ ] \xF0\x9F\x94\xB5 **TODO** \`${RELATIVE_PATH}\` (${TODO_COUNT} comment(s)) [${TODAY}]\n${TODO_ITEMS}"
    insert_into_section "$TASK_FILE" "$SECTION_MODERATE" "$TODO_BLOCK"
    TASKS_ADDED=$((TASKS_ADDED + 1))
  fi
fi

TOTAL_OPEN=$(grep -c '^\- \[ \]' "$TASK_FILE" 2>/dev/null || echo "0")

MSG=""
if [ "$TASKS_ADDED" -gt 0 ]; then
  MSG="Code quality: ${TASKS_ADDED} task(s) logged for \`${RELATIVE_PATH}\` (${TOTAL_OPEN} open total). Continue current work."
fi
if [ -n "$SUGGEST_SIMPLIFY" ]; then
  MSG="${MSG:+${MSG} }${SUGGEST_SIMPLIFY}"
fi
if [ -n "$MSG" ]; then
  printf '{"systemMessage": "%s"}' "$MSG"
fi

exit 0
