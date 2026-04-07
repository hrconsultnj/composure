#!/bin/sh
# ============================================================
# Memory Migrate — Batch memory file → Cortex node migration
# ============================================================
# Reads a memory .md file, parses YAML frontmatter, creates
# a Cortex memory node with structured metadata.
#
# Usage:
#   ./memory-migrate.sh <memory-file> [agent_id]
#
# Arguments:
#   memory-file  — path to a .md file with YAML frontmatter
#   agent_id     — Cortex agent ID (default: basename of cwd)
#
# Requires: node, jq, Cortex CLI bundle
# POSIX-compliant (no bash-isms, no GNU grep)
# ============================================================

set -e

MEMORY_FILE="$1"
AGENT_ID="${2:-$(basename "$(pwd)")}"

if [ -z "$MEMORY_FILE" ] || [ ! -f "$MEMORY_FILE" ]; then
  echo "Usage: memory-migrate.sh <memory-file> [agent_id]" >&2
  exit 1
fi

# ── Resolve Cortex CLI path ─────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
CLI_PATH=""

# Try plugin root first
if [ -n "$CLAUDE_PLUGIN_ROOT" ] && [ -f "$CLAUDE_PLUGIN_ROOT/cortex/dist/cli.bundle.js" ]; then
  CLI_PATH="$CLAUDE_PLUGIN_ROOT/cortex/dist/cli.bundle.js"
else
  # Walk up from script dir to find cortex
  PLUGIN_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
  if [ -f "$PLUGIN_DIR/cortex/dist/cli.bundle.js" ]; then
    CLI_PATH="$PLUGIN_DIR/cortex/dist/cli.bundle.js"
  fi
fi

if [ -z "$CLI_PATH" ]; then
  echo "ERROR: Cortex CLI not found" >&2
  exit 1
fi

# ── Parse YAML frontmatter ──────────────────────────────────
# Extract fields between --- markers
FRONTMATTER=$(sed -n '/^---$/,/^---$/p' "$MEMORY_FILE" | sed '1d;$d')

FM_NAME=$(echo "$FRONTMATTER" | sed -n 's/^name: *//p')
FM_DESC=$(echo "$FRONTMATTER" | sed -n 's/^description: *//p')
FM_TYPE=$(echo "$FRONTMATTER" | sed -n 's/^type: *//p')

# Full file content (including frontmatter)
CONTENT=$(cat "$MEMORY_FILE")
FILENAME=$(basename "$MEMORY_FILE")
TIMESTAMP=$(date -u +%Y-%m-%dT%H:%M:%SZ)

# ── Build Cortex payload ────────────────────────────────────
PAYLOAD=$(jq -n \
  --arg agent_id "$AGENT_ID" \
  --arg content "$CONTENT" \
  --arg name "$FM_NAME" \
  --arg desc "$FM_DESC" \
  --arg category "$FM_TYPE" \
  --arg source "$FILENAME" \
  --arg ts "$TIMESTAMP" \
  '{
    agent_id: $agent_id,
    content: $content,
    content_type: "markdown",
    metadata: {
      category: $category,
      name: $name,
      description: $desc,
      source: $source,
      migrated_from: "auto-memory",
      migrated_at: $ts,
      tags: [$category, "migrated"]
    }
  }')

# ── Create Cortex node ──────────────────────────────────────
RESULT=$(node --experimental-sqlite "$CLI_PATH" create_memory_node "$PAYLOAD" 2>/dev/null)
STATUS=$(echo "$RESULT" | jq -r '.status // "error"')
NODE_ID=$(echo "$RESULT" | jq -r '.node_id // "unknown"')

if [ "$STATUS" = "ok" ]; then
  echo "{\"status\":\"ok\",\"node_id\":\"$NODE_ID\",\"source\":\"$FILENAME\",\"agent_id\":\"$AGENT_ID\"}"
  exit 0
else
  echo "ERROR: Failed to create node for $FILENAME" >&2
  echo "$RESULT" >&2
  exit 1
fi
