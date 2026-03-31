#!/bin/bash
# ============================================================
# Code Quality Guard v4 — Global PostToolUse Hook
# ============================================================
# Fires after Edit/Write on source files.
#
# v4 CHANGES (from v3):
#   - Graph-aware: queries .code-review-graph/graph.db for exact
#     AST-based function sizes when available (tree-sitter precision)
#   - Falls back to regex heuristics when graph doesn't exist
#   - Matcher changed from Read|Edit|Write to Edit|Write
#     (scanning on Read adds latency without benefit)
#
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
# Count source file edits per session. After threshold, suggest
# /simplify once via systemMessage. Dedup prevents nagging.
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
[ -z "$LINE_COUNT" ] || [ "$LINE_COUNT" -lt 200 ] && {
  # File is small — no decomposition needed, but still check simplify suggestion
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

# Ensure the directory exists (for new projects)
mkdir -p "$(dirname "$TASK_FILE")" 2>/dev/null

# ── Dedup check: skip if this file already has an open task ──
# NOTE: Use single-quote concatenation for backticks — double-quoted backticks
# trigger command substitution in bash, breaking the grep pattern.
DEDUP_PATTERN='`'"${RELATIVE_PATH}"'`'
if [ -f "$TASK_FILE" ] && grep -qF -- "- [ ]" "$TASK_FILE" 2>/dev/null; then
  if grep -qF "$DEDUP_PATTERN" "$TASK_FILE" 2>/dev/null; then
    # Check it's an OPEN task (not resolved)
    if grep -F "$DEDUP_PATTERN" "$TASK_FILE" | grep -qF -- "- [ ]"; then
      exit 0  # Already tracked, skip
    fi
  fi
fi

# ── Route file check ──
IS_ROUTE=0
case "$BASENAME" in
  page.tsx|page.ts|layout.tsx|layout.ts) IS_ROUTE=1 ;;
esac

# ── 1. Find large functions/components ──
# Strategy: Use graph DB (exact AST sizes) if available, fall back to regex heuristics.
LARGE_FUNCS=""
LARGE_FUNC_COUNT=0

GRAPH_DB="${CLAUDE_PROJECT_DIR}/.code-review-graph/graph.db"
ABS_FILE_PATH=$(cd "$(dirname "$FILE_PATH")" 2>/dev/null && echo "$(pwd)/$(basename "$FILE_PATH")")
[ -z "$ABS_FILE_PATH" ] && ABS_FILE_PATH="$FILE_PATH"

if [ -f "$GRAPH_DB" ] && command -v sqlite3 >/dev/null 2>&1; then
  # ── Graph-aware path: exact function sizes from tree-sitter AST ──
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
  # ── Regex fallback: heuristic function size estimation ──
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

# ── 3. Shared-type duplication check (NEW in v3) ──
# Auto-detect shared package in monorepos (packages/shared, packages/common, etc.)
SHARED_TASK=""
SHARED_DIR=""
SHARED_PKG_NAME=""
for candidate in "packages/shared/src" "packages/common/src" "packages/core/src"; do
  if [ -d "${CLAUDE_PROJECT_DIR}/${candidate}" ]; then
    SHARED_DIR="${CLAUDE_PROJECT_DIR}/${candidate}"
    # Derive package name from package.json if available
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

# ── 4. Other checks (StyleSheet, modals, route thickness) ──
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

# ── 5. TODO/FIXME/HACK comments (AI debt markers) ──
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

# ── Determine severity ──
SEVERITY=""
EMOJI=""
if [ "$LINE_COUNT" -ge "$CRITICAL_LINES" ]; then
  SEVERITY="CRITICAL"
  EMOJI="🔴"
elif [ "$LINE_COUNT" -ge "$ALERT_LINES" ] || [ "$LARGE_FUNC_COUNT" -gt 0 ]; then
  SEVERITY="HIGH"
  EMOJI="🟡"
elif [ "$LINE_COUNT" -ge "$WARN_LINES" ] && { [ -n "$INLINE_TYPES" ] || [ -n "$OTHER_ITEMS" ] || [ "$LARGE_FUNC_COUNT" -gt 0 ]; }; then
  SEVERITY="MODERATE"
  EMOJI="🟢"
fi

# ── Nothing to report? Check if we have a shared-type task at least ──
if [ -z "$SEVERITY" ] && [ -z "$SHARED_TASK" ]; then
  exit 0
fi

# ── Write to task queue file (grouped by severity) ──

# Section headers — tasks are inserted into the matching section
SECTION_CRITICAL="## 🔴 Critical"
SECTION_HIGH="## 🟡 High"
SECTION_MODERATE="## 🟢 Moderate"

# Initialize file with section headers if needed
if [ ! -f "$TASK_FILE" ]; then
  cat > "$TASK_FILE" << HEADER
# Code Quality Tasks
<!-- Auto-detected by code quality hooks. Process with /review-tasks or delegate to a sub-agent. -->
<!-- Mark [x] when resolved. Delete resolved entries periodically. -->

${SECTION_CRITICAL}

${SECTION_HIGH}

${SECTION_MODERATE}

HEADER
fi

# Ensure all 3 sections exist (in case file was created by older hook version)
for SECT in "$SECTION_CRITICAL" "$SECTION_HIGH" "$SECTION_MODERATE"; do
  if ! grep -qF "$SECT" "$TASK_FILE" 2>/dev/null; then
    echo -e "\n${SECT}\n" >> "$TASK_FILE"
  fi
done

# ── Helper: insert a block into the correct section ──
# Strategy: find the NEXT section header after target, insert before it.
# CRITICAL inserts before 🟡, HIGH inserts before 🟢, MODERATE appends to EOF.
insert_into_section() {
  local target_section="$1"
  shift
  local block="$*"

  local insert_before=""
  case "$target_section" in
    *Critical*) insert_before="$SECTION_HIGH" ;;
    *High*)     insert_before="$SECTION_MODERATE" ;;
    *)          insert_before="" ;;  # Moderate → append to end
  esac

  if [ -n "$insert_before" ]; then
    local line_num
    line_num=$(grep -nF "$insert_before" "$TASK_FILE" | head -1 | cut -d: -f1)
    if [ -n "$line_num" ]; then
      # Split file, insert block, rejoin
      head -n "$((line_num - 1))" "$TASK_FILE" > "${TASK_FILE}.tmp"
      echo -e "$block" >> "${TASK_FILE}.tmp"
      tail -n "+${line_num}" "$TASK_FILE" >> "${TASK_FILE}.tmp"
      mv "${TASK_FILE}.tmp" "$TASK_FILE"
      return
    fi
  fi
  # Fallback: append to end
  echo -e "$block" >> "$TASK_FILE"
}

TASKS_ADDED=0

# Write decomposition task into the correct severity section
if [ -n "$SEVERITY" ]; then
  TASK_BLOCK="- [ ] ${EMOJI} **DECOMPOSE** \`${RELATIVE_PATH}\` (${LINE_COUNT} lines) [${TODAY}]"
  [ -n "$LARGE_FUNCS" ] && TASK_BLOCK="${TASK_BLOCK}\n${LARGE_FUNCS}"
  [ -n "$INLINE_TYPES" ] && TASK_BLOCK="${TASK_BLOCK}\n${INLINE_TYPES}"
  [ -n "$OTHER_ITEMS" ] && TASK_BLOCK="${TASK_BLOCK}\n${OTHER_ITEMS}"

  case "$SEVERITY" in
    CRITICAL) insert_into_section "$SECTION_CRITICAL" "$TASK_BLOCK" ;;
    HIGH)     insert_into_section "$SECTION_HIGH" "$TASK_BLOCK" ;;
    MODERATE) insert_into_section "$SECTION_MODERATE" "$TASK_BLOCK" ;;
  esac
  TASKS_ADDED=$((TASKS_ADDED + 1))
fi

# Write shared-type task (always Moderate section)
if [ -n "$SHARED_TASK" ]; then
  insert_into_section "$SECTION_MODERATE" "$SHARED_TASK"
  TASKS_ADDED=$((TASKS_ADDED + 1))
fi

# Write TODO/FIXME task (Moderate section — AI debt markers)
if [ "$TODO_COUNT" -gt 0 ]; then
  # Dedup: skip if we already have a TODO task for this file
  TODO_DEDUP='`'"${RELATIVE_PATH}"'`.*TODO'
  if ! grep -qF "TODO" "$TASK_FILE" 2>/dev/null || ! grep -q "$TODO_DEDUP" "$TASK_FILE" 2>/dev/null; then
    TODO_BLOCK="- [ ] \xF0\x9F\x94\xB5 **TODO** \`${RELATIVE_PATH}\` (${TODO_COUNT} comment(s)) [${TODAY}]\n${TODO_ITEMS}"
    insert_into_section "$SECTION_MODERATE" "$TODO_BLOCK"
    TASKS_ADDED=$((TASKS_ADDED + 1))
  fi
fi

# ── Count total open tasks ──
TOTAL_OPEN=$(grep -c '^\- \[ \]' "$TASK_FILE" 2>/dev/null || echo "0")

# ── Return brief, non-distracting systemMessage ──
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
