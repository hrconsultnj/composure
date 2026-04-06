#!/bin/bash
# ============================================================
# Memory Fusion — PostToolUse hook for Graph↔Memory sync
# ============================================================
# Fires after Edit/Write tool completions. Detects what changed
# and outputs a recommendation for the LLM to persist notable
# findings to Cortex Memory.
#
# This hook does NOT call the Edge Function directly (no network
# calls in hooks — keeps them fast). Instead, it outputs structured
# guidance that the LLM acts on.
#
# The hook reads the tool result to understand what file was
# modified, then checks if the graph knows about it.
# ============================================================

# Only run if Cortex is configured
COMPOSURE_CONFIG=""
if [ -f ".composure/composure-pro.json" ]; then
  COMPOSURE_CONFIG=".composure/composure-pro.json"
elif [ -f ".claude/composure-pro.json" ]; then
  COMPOSURE_CONFIG=".claude/composure-pro.json"
fi

# Skip if not a Pro project (no config = no Cortex)
if [ -z "$COMPOSURE_CONFIG" ]; then
  exit 0
fi

# Read tool input to find the file path
TOOL_INPUT="${CLAUDE_TOOL_INPUT:-}"
if [ -z "$TOOL_INPUT" ]; then
  exit 0
fi

# Extract file_path from the tool input JSON
FILE_PATH=$(echo "$TOOL_INPUT" | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    print(data.get('file_path', data.get('path', '')))
except:
    print('')
" 2>/dev/null)

if [ -z "$FILE_PATH" ]; then
  exit 0
fi

# Get the filename for pattern matching
FILENAME=$(basename "$FILE_PATH")
EXTENSION="${FILENAME##*.}"

# Detect if this is a high-value change worth remembering
IS_NOTABLE=false
CATEGORY=""
REASON=""

case "$FILE_PATH" in
  *migration*.sql|*supabase/migrations/*)
    IS_NOTABLE=true
    CATEGORY="architecture"
    REASON="Database migration modified — schema changes affect all consumers"
    ;;
  *auth*|*login*|*session*|*jwt*|*oauth*)
    IS_NOTABLE=true
    CATEGORY="security"
    REASON="Auth-related file modified — security-sensitive area"
    ;;
  *payment*|*billing*|*stripe*|*checkout*)
    IS_NOTABLE=true
    CATEGORY="security"
    REASON="Payment-related file modified — PCI-sensitive area"
    ;;
  *webhook*|*api/*)
    IS_NOTABLE=true
    CATEGORY="architecture"
    REASON="API endpoint or webhook modified — may affect external consumers"
    ;;
  *config*|*.env*|*secrets*)
    IS_NOTABLE=true
    CATEGORY="architecture"
    REASON="Configuration file modified — may affect deployment"
    ;;
  *test*|*spec*|*__tests__*)
    # Tests are important but not notable enough for memory
    IS_NOTABLE=false
    ;;
esac

# Also flag large files (>200 lines of changes)
if [ "$IS_NOTABLE" = false ] && [ -f "$FILE_PATH" ]; then
  LINE_COUNT=$(wc -l < "$FILE_PATH" 2>/dev/null | tr -d ' ')
  if [ "${LINE_COUNT:-0}" -gt 400 ]; then
    IS_NOTABLE=true
    CATEGORY="pattern"
    REASON="Large file (${LINE_COUNT} lines) modified — may need decomposition"
  fi
fi

if [ "$IS_NOTABLE" = true ]; then
  echo "[cortex-memory] Notable change: ${FILE_PATH} — ${REASON}"

  # Auto-save to Cortex via CLI (fire-and-forget, backgrounded)
  SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
  CLI_PATH="${SCRIPT_DIR}/../../cortex/dist/cli.bundle.js"

  if [ -f "$CLI_PATH" ] && [ -f "${HOME}/.composure/cortex/cortex.db" ]; then
    # Derive agent_id (same convention as resolve-config.sh)
    AGENT_ID="$(basename "${CLAUDE_PROJECT_DIR:-.}")"
    TIMESTAMP="$(date -u +%Y-%m-%dT%H:%M:%SZ)"

    PAYLOAD=$(jq -n \
      --arg agent_id "$AGENT_ID" \
      --arg content "File modified: ${FILE_PATH} — ${REASON}" \
      --arg category "$CATEGORY" \
      --arg filename "$FILENAME" \
      --arg filepath "$FILE_PATH" \
      --arg ts "$TIMESTAMP" \
      '{
        agent_id: $agent_id,
        content: $content,
        content_type: "observation",
        metadata: {
          category: $category,
          tags: [$filename, "auto-captured"],
          source_file: $filepath,
          captured_at: $ts
        }
      }')
    node --experimental-sqlite "$CLI_PATH" create_memory_node "$PAYLOAD" 2>/dev/null &
  fi
fi

exit 0
