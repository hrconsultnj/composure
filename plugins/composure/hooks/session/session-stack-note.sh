#!/bin/bash
# ============================================================
# Session Stack Note — Lightweight SessionStart Hook
# ============================================================
# Replaces the full SKILL.md cat. Reads no-bandaids.json and
# outputs detected stack + entry points.
#
# Lifecycle-aware via stdin JSON `source` field:
#   startup → full note (~8 lines)
#   resume/clear/compact → 1-line reminder
#
# Non-blocking (exit 0 always). Timeout: 5 seconds.
# ============================================================

# Read stdin JSON to get the session lifecycle event
# stdin has: { "session_id": "...", "source": "startup|resume|clear|compact", ... }
# Read with timeout to avoid hanging if stdin isn't provided or is empty
INPUT=""
if read -t 2 -r INPUT_LINE 2>/dev/null; then
  INPUT="$INPUT_LINE"
fi
EVENT=$(echo "$INPUT" | jq -r '.source // "startup"' 2>/dev/null)
# Default to startup if we couldn't parse the event
[ -z "$EVENT" ] && EVENT="startup"

CONFIG_CANDIDATES=(
  "${CLAUDE_PROJECT_DIR:-.}/.composure/no-bandaids.json"
  "${CLAUDE_PROJECT_DIR:-.}/.claude/no-bandaids.json"
)

CONFIG=""
for c in "${CONFIG_CANDIDATES[@]}"; do
  [ -f "$c" ] && CONFIG="$c" && break
done

# No config = not initialized yet
if [ -z "$CONFIG" ]; then
  echo "[composure] No stack config found. Run /composure:initialize to set up."
  exit 0
fi

# Extract framework info
FRONTEND=$(jq -r '.frameworks | to_entries[0].value.frontend // "null"' "$CONFIG" 2>/dev/null)
BACKEND=$(jq -r '.frameworks | to_entries[0].value.backend // "null"' "$CONFIG" 2>/dev/null)
LANGS=$(jq -r '.frameworks | keys | join(", ")' "$CONFIG" 2>/dev/null)

# Map frontend to architecture category + entry file
case "$FRONTEND" in
  nextjs)
    CATEGORY="fullstack"
    ENTRY="fullstack/INDEX.md → nextjs/nextjs.md"
    ;;
  vite)
    CATEGORY="frontend"
    ENTRY="frontend/INDEX.md → vite/vite.md"
    ;;
  angular)
    CATEGORY="frontend"
    ENTRY="frontend/INDEX.md → angular/angular.md"
    ;;
  expo)
    CATEGORY="mobile"
    ENTRY="mobile/INDEX.md → expo/expo.md"
    ;;
  *)
    CATEGORY="frontend"
    ENTRY="frontend/INDEX.md → core.md"
    ;;
esac

if [ "$EVENT" = "startup" ]; then
  cat <<EOF
[composure:stack] Detected: ${LANGS} | frontend=${FRONTEND} | backend=${BACKEND:-none}
Architecture category: ${CATEGORY} (entry: ${ENTRY})

When building features:
- Non-trivial work (multi-file, new routes, new data models): Run /composure:blueprint first
- Routine edits: /composure:app-architecture loads reference docs on demand
- The PreToolUse hook will remind you on first source file touch

Architecture docs load ONLY when invoked — not pre-loaded. This saves ~200 lines of context.
EOF
else
  # resume/clear/compact: single line — context already has the full note
  echo "[composure:stack] ${LANGS} | ${FRONTEND} | arch=${CATEGORY}"
fi

exit 0
