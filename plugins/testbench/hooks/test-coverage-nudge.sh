#!/usr/bin/env bash
# ============================================================
# Test Coverage Nudge — PostToolUse Hook (Edit|Write)
# ============================================================
# When a source file is written/edited, checks if a corresponding
# test file exists. If not, nudges (once per file per session)
# to run /testbench:generate.
#
# Non-blocking (exit 0 always). Informational only.
# ============================================================

INPUT=$(cat)
FILE_PATH=$(printf '%s' "$INPUT" | jq -r '.tool_input.file_path // empty')

[ -z "$FILE_PATH" ] && exit 0

BASENAME=$(basename "$FILE_PATH")
DIRNAME=$(dirname "$FILE_PATH")

# ─── Skip: test files themselves ────────────────────────────
case "$BASENAME" in
  *.test.*|*.spec.*|*_test.*) exit 0 ;;
esac
case "$FILE_PATH" in
  */__tests__/*|*/tests/*|*/test/*) exit 0 ;;
esac

# ─── Skip: non-source files ────────────────────────────────
case "$BASENAME" in
  *.ts|*.tsx|*.js|*.jsx|*.py|*.go|*.rs|*.swift|*.kt|*.kts) ;;
  *) exit 0 ;;
esac

# ─── Skip: generated, declaration, build artifacts ──────────
case "$BASENAME" in
  *.d.ts|*.generated.*|*.gen.*) exit 0 ;;
esac
case "$FILE_PATH" in
  */node_modules/*|*/.next/*|*/dist/*|*/.expo/*|*/build/*) exit 0 ;;
  */.claude/*|*/memory/*|*/tasks-plans/*) exit 0 ;;
esac

# ─── Session dedup: only nudge once per file per session ────
# Hash the file path for a stable flag filename
FILE_HASH=$(printf '%s' "$FILE_PATH" | md5 -q 2>/dev/null || printf '%s' "$FILE_PATH" | md5sum 2>/dev/null | cut -c1-8)
DEDUP_DIR="/tmp/testbench-nudge"
mkdir -p "$DEDUP_DIR" 2>/dev/null
DEDUP_FILE="${DEDUP_DIR}/${FILE_HASH}"

if [ -f "$DEDUP_FILE" ]; then
  exit 0  # Already nudged this session
fi

# ─── Check for corresponding test file ─────────────────────
# Strip extension to get the stem
STEM="${BASENAME%.*}"
# Handle double extensions (e.g., foo.module.ts → foo.module)
EXT="${BASENAME##*.}"

# Build list of candidate test file paths
CANDIDATES=()

# Same directory: foo.test.ext, foo.spec.ext
CANDIDATES+=("${DIRNAME}/${STEM}.test.${EXT}")
CANDIDATES+=("${DIRNAME}/${STEM}.spec.${EXT}")

# __tests__ subdirectory: __tests__/foo.test.ext, __tests__/foo.ext
CANDIDATES+=("${DIRNAME}/__tests__/${STEM}.test.${EXT}")
CANDIDATES+=("${DIRNAME}/__tests__/${STEM}.spec.${EXT}")
CANDIDATES+=("${DIRNAME}/__tests__/${STEM}.${EXT}")

# Parent __tests__ (for files in subdirs): ../tests/foo.test.ext
PARENT_DIR=$(dirname "$DIRNAME")
CANDIDATES+=("${PARENT_DIR}/__tests__/${STEM}.test.${EXT}")
CANDIDATES+=("${PARENT_DIR}/__tests__/${STEM}.spec.${EXT}")
CANDIDATES+=("${PARENT_DIR}/tests/${STEM}.test.${EXT}")

# Go convention: foo_test.go (same dir)
if [ "$EXT" = "go" ]; then
  CANDIDATES+=("${DIRNAME}/${STEM}_test.go")
fi

# Python convention: test_foo.py (same dir and tests/ dir)
if [ "$EXT" = "py" ]; then
  CANDIDATES+=("${DIRNAME}/test_${STEM}.py")
  CANDIDATES+=("${PARENT_DIR}/tests/test_${STEM}.py")
fi

# Check if any candidate exists
TEST_EXISTS=false
for CANDIDATE in "${CANDIDATES[@]}"; do
  if [ -f "$CANDIDATE" ]; then
    TEST_EXISTS=true
    break
  fi
done

if [ "$TEST_EXISTS" = "true" ]; then
  exit 0
fi

# ─── Nudge: no test file found ─────────────────────────────
# Mark as nudged so we don't repeat
touch "$DEDUP_FILE"

printf '[testbench] No tests for %s. Run /testbench:generate %s\n' "$BASENAME" "$FILE_PATH"
exit 0
