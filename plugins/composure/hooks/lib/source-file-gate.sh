#!/bin/bash
# ============================================================
# Source File Gate — Shared fast-path exit for PreToolUse hooks
# ============================================================
# Sourced by enforcement hooks to skip non-source files early.
# Exits the calling hook if the file doesn't need enforcement.
#
# Usage (at top of hook, after reading INPUT):
#   FILE_PATH=$(printf '%s' "$INPUT" | jq -r '.tool_input.file_path // empty')
#   source "${SCRIPT_DIR}/../lib/source-file-gate.sh"
#
# The source command exits the CALLING script if the file
# is not enforceable. If it returns, the file IS source code.
# ============================================================

# No file path = nothing to check
[ -z "$FILE_PATH" ] && exit 0

# ── Extension check: skip non-source files ───────────────────
BASENAME=$(basename "$FILE_PATH")
case "$BASENAME" in
  # Source code — continue to enforcement
  *.ts|*.tsx|*.js|*.jsx|*.py|*.go|*.rs|*.swift|*.kt|*.kts|*.cpp|*.cc|*.cxx|*.hpp|*.h|*.sql) ;;
  # Everything else — skip
  *) exit 0 ;;
esac

# ── Path check: skip tooling/generated directories ──────────
case "$FILE_PATH" in
  */node_modules/*|*/.next/*|*/dist/*|*/.expo/*) exit 0 ;;
  */.claude/*|*/.composure/*|*/memory/*) exit 0 ;;
  */tasks-plans/*|*/blueprints/*) exit 0 ;;
  *.generated.*|*.gen.*|*.d.ts) exit 0 ;;
esac
