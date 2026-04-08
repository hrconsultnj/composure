#!/bin/bash
# ============================================================
# Memory Prune — Sync non-critical memories to Cortex, remove files
# ============================================================
# Two-tier memory system:
#   1. Critical (files) — always loaded by Claude Code harness (~1,500 tokens)
#   2. Detail (Cortex) — queried on demand by session-boot (~0 tokens until needed)
#
# This script:
#   - Reads MEMORY.md to find non-critical memory files
#   - Verifies each is synced to Cortex
#   - Removes synced non-critical files + their MEMORY.md entries
#
# Critical = listed under "## Critical Guardrails" in MEMORY.md
# Everything else = non-critical, eligible for Cortex-only
#
# Usage:
#   bash memory-prune.sh <memory-dir> [agent_id]
#
# Called from: session-boot.sh (startup), composure:commit
# ============================================================

set -e

MEMORY_DIR="${1:-}"
AGENT_ID="${2:-$(basename "${CLAUDE_PROJECT_DIR:-.}")}"

if [ -z "$MEMORY_DIR" ] || [ ! -d "$MEMORY_DIR" ]; then
  exit 0
fi

MEMORY_INDEX="$MEMORY_DIR/MEMORY.md"
[ ! -f "$MEMORY_INDEX" ] && exit 0

# ── Resolve Cortex CLI ──────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CLI_PATH="${SCRIPT_DIR}/../../cortex/dist/cli.bundle.js"
[ ! -f "$CLI_PATH" ] && exit 0
[ ! -f "${HOME}/.composure/cortex/cortex.db" ] && exit 0

# ── Find critical section boundaries ────────────────────────
# Files listed under "## Critical Guardrails" stay as files
CRITICAL_FILES=""
IN_CRITICAL=0
while IFS= read -r line; do
  case "$line" in
    "## Critical"*|"## critical"*)
      IN_CRITICAL=1
      continue
      ;;
    "## "*)
      IN_CRITICAL=0
      continue
      ;;
  esac
  if [ "$IN_CRITICAL" -eq 1 ]; then
    # Extract filename from markdown link: [name](filename.md)
    FILE=$(echo "$line" | sed -n 's/.*(\([^)]*\.md\)).*/\1/p')
    [ -n "$FILE" ] && CRITICAL_FILES="$CRITICAL_FILES $FILE"
  fi
done < "$MEMORY_INDEX"

# ── Process non-critical memory files ───────────────────────
PRUNED=0
SYNCED=0
SKIPPED=0

for md_file in "$MEMORY_DIR"/*.md; do
  [ ! -f "$md_file" ] && continue
  FILENAME=$(basename "$md_file")

  # Skip index file
  [ "$FILENAME" = "MEMORY.md" ] && continue

  # Skip critical files
  case "$CRITICAL_FILES" in
    *"$FILENAME"*) SKIPPED=$((SKIPPED + 1)); continue ;;
  esac

  # Check if already in Cortex (search by filename in metadata)
  EXISTING=$(node --experimental-sqlite "$CLI_PATH" search_memory_text \
    "{\"agent_id\":\"${AGENT_ID}\",\"query\":\"${FILENAME}\",\"limit\":1}" 2>/dev/null \
    | jq -r '.results[]? | select(.metadata.source_file // "" | endswith("'"$FILENAME"'")) | .node_id // empty' 2>/dev/null \
    | head -1)

  # If not in Cortex, sync first
  if [ -z "$EXISTING" ]; then
    MIGRATE_SCRIPT="${SCRIPT_DIR}/../lib/memory-migrate.sh"
    if [ -f "$MIGRATE_SCRIPT" ]; then
      bash "$MIGRATE_SCRIPT" "$md_file" "$AGENT_ID" >/dev/null 2>&1 && SYNCED=$((SYNCED + 1))
    else
      continue  # Can't sync — keep the file
    fi
  fi

  # Remove from MEMORY.md index
  # Use grep -v to remove lines containing the filename
  grep -v "$FILENAME" "$MEMORY_INDEX" > "${MEMORY_INDEX}.tmp" 2>/dev/null && \
    mv "${MEMORY_INDEX}.tmp" "$MEMORY_INDEX"

  # Remove the file
  rm "$md_file"
  PRUNED=$((PRUNED + 1))
done

# Clean up empty sections in MEMORY.md (consecutive ## headers with nothing between)
# Leave this for now — cosmetic, not functional

if [ "$PRUNED" -gt 0 ] || [ "$SYNCED" -gt 0 ]; then
  echo "[cortex:memory-prune] ${PRUNED} archived to Cortex, ${SYNCED} synced first, ${SKIPPED} critical kept"
fi

exit 0
