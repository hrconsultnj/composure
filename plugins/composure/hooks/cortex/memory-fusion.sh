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

# ── File-based memory → Cortex sync ───────────────────────────
# When Claude writes to ~/.claude/*/memory/*.md, sync to Cortex
# so both persistence systems stay in lockstep.
case "$FILE_PATH" in
  */.claude/*/memory/*.md|*/.claude/projects/*/memory/*.md)
    # Skip MEMORY.md index file — it's just pointers
    if [ "$FILENAME" = "MEMORY.md" ]; then
      exit 0
    fi

    SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
    CLI_PATH="${SCRIPT_DIR}/../../cortex/dist/cli.bundle.js"

    if [ -f "$CLI_PATH" ] && [ -f "${HOME}/.composure/cortex/cortex.db" ]; then
      # Project memories → project agent_id, global memories → "global"
      case "$FILE_PATH" in
        */.claude/projects/*)
          AGENT_ID="$(basename "${CLAUDE_PROJECT_DIR:-.}")"
          ;;
        *)
          AGENT_ID="global"
          ;;
      esac

      # Parse frontmatter from the memory file
      MEM_NAME=$(sed -n 's/^name: *//p' "$FILE_PATH" | head -1)
      MEM_DESC=$(sed -n 's/^description: *//p' "$FILE_PATH" | head -1)
      MEM_TYPE=$(sed -n 's/^type: *//p' "$FILE_PATH" | head -1)

      # Extract body (everything after second ---)
      MEM_BODY=$(awk '/^---$/{c++;next}c>=2' "$FILE_PATH")

      PAYLOAD=$(jq -n \
        --arg agent_id "$AGENT_ID" \
        --arg content "${MEM_NAME}: ${MEM_BODY}" \
        --arg name "$MEM_NAME" \
        --arg desc "$MEM_DESC" \
        --arg mem_type "$MEM_TYPE" \
        --arg filename "$FILENAME" \
        --arg filepath "$FILE_PATH" \
        '{
          agent_id: $agent_id,
          content: $content,
          content_type: "memory",
          metadata: {
            category: $mem_type,
            tags: [$mem_type, "file-memory-sync", $filename],
            source_file: $filepath,
            memory_name: $name,
            memory_description: $desc
          }
        }')

      # Search for existing node with same filename to update vs create
      EXISTING=$(node --experimental-sqlite "$CLI_PATH" search_memory_text \
        "{\"agent_id\":\"${AGENT_ID}\",\"query\":\"${FILENAME}\",\"limit\":1}" 2>/dev/null \
        | jq -r '.results[]? | select(.metadata.source_file // "" | endswith("'"$FILENAME"'")) | .node_id // empty' 2>/dev/null \
        | head -1)

      if [ -n "$EXISTING" ]; then
        # Update existing node
        node --experimental-sqlite "$CLI_PATH" add_observations \
          "{\"node_id\":\"${EXISTING}\",\"observations\":[\"Updated: ${MEM_BODY}\"]}" 2>/dev/null &
      else
        # Create new node
        node --experimental-sqlite "$CLI_PATH" create_memory_node "$PAYLOAD" 2>/dev/null &
      fi

      echo "[cortex-memory] Synced file memory → Cortex: ${FILENAME} (${MEM_TYPE})"
    fi
    exit 0
    ;;
esac

# ── Reflex triggers ────────────────────────────────────────────
# Principle: if changing this file could break OTHER parts of the
# codebase or represents a structural decision, it's notable.
# Tests and self-contained changes are skipped.

IS_NOTABLE=false
CATEGORY=""
REASON=""

# Skip tests early — never auto-capture test file edits
case "$FILE_PATH" in
  *test*|*spec*|*__tests__*|*__mocks__*|*fixtures*|*stubs*)
    exit 0
    ;;
esac

case "$FILE_PATH" in

  # ── Security (highest priority) ──────────────────────────────
  *auth*|*login*|*session*|*jwt*|*oauth*|*token*|*credential*)
    IS_NOTABLE=true
    CATEGORY="security"
    REASON="Auth-related file modified — security-sensitive area"
    ;;
  *payment*|*billing*|*stripe*|*checkout*|*subscription*)
    IS_NOTABLE=true
    CATEGORY="security"
    REASON="Payment-related file modified — PCI-sensitive area"
    ;;
  *rls*|*policy*|*policies*|*permission*|*rbac*|*acl*)
    IS_NOTABLE=true
    CATEGORY="security"
    REASON="Access control modified — tenant isolation or permission rules"
    ;;
  *secret*|*.env|*.env.*|*credentials*)
    IS_NOTABLE=true
    CATEGORY="security"
    REASON="Secrets or environment config modified — deployment-sensitive"
    ;;

  # ── Architecture (structural changes) ────────────────────────
  *migration*.sql|*supabase/migrations/*|*drizzle/migrations/*)
    IS_NOTABLE=true
    CATEGORY="architecture"
    REASON="Database migration modified — schema changes affect all consumers"
    ;;
  *schema.prisma|*schema.graphql|*.proto|*drizzle.config*)
    IS_NOTABLE=true
    CATEGORY="architecture"
    REASON="Data model definition modified — contract change for consumers"
    ;;
  *webhook*|*/api/*|*/routes/*|*server/*)
    IS_NOTABLE=true
    CATEGORY="architecture"
    REASON="API endpoint or webhook modified — may affect external consumers"
    ;;
  *middleware*|*/middleware/*|*/proxy.ts|*/proxy.js)
    IS_NOTABLE=true
    CATEGORY="architecture"
    REASON="Middleware/proxy modified — cross-cutting request interception (Next.js 16+ uses proxy.ts)"
    ;;
  */app/*/page.*|*/app/*/layout.*|*/app/*/loading.*|*/app/*/error.*|*/pages/*)
    IS_NOTABLE=true
    CATEGORY="architecture"
    REASON="Route or layout modified — navigation structure change"
    ;;
  */store/*|*/stores/*|*/context/*|*/providers/*|*zustand*|*redux*)
    IS_NOTABLE=true
    CATEGORY="architecture"
    REASON="State management modified — global state affects multiple consumers"
    ;;

  # ── Deployment (infrastructure) ──────────────────────────────
  *config*|*rc.*|*.config.*)
    IS_NOTABLE=true
    CATEGORY="architecture"
    REASON="Configuration file modified — may affect build or deployment"
    ;;
  *Dockerfile*|*docker-compose*|*.dockerignore)
    IS_NOTABLE=true
    CATEGORY="architecture"
    REASON="Container config modified — deployment infrastructure change"
    ;;
  *.github/workflows/*|*.gitlab-ci*|*bitbucket-pipelines*)
    IS_NOTABLE=true
    CATEGORY="architecture"
    REASON="CI/CD pipeline modified — deployment flow change"
    ;;

  # ── Dependencies ─────────────────────────────────────────────
  */package.json)
    IS_NOTABLE=true
    CATEGORY="architecture"
    REASON="Package dependencies modified — may affect build or security"
    ;;
  *pnpm-lock.yaml|*yarn.lock|*package-lock.json|*bun.lockb)
    IS_NOTABLE=true
    CATEGORY="architecture"
    REASON="Lock file modified — dependency resolution changed"
    ;;

esac

# ── Size-based fallback (catches anything large) ───────────────
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

    # Create memory node and capture its ID for graph linking
    NODE_RESULT=$(node --experimental-sqlite "$CLI_PATH" create_memory_node "$PAYLOAD" 2>/dev/null)
    NODE_ID=$(echo "$NODE_RESULT" | jq -r '.node_id // empty' 2>/dev/null)

    # Link to graph entities if graph DB exists
    if [ -n "$NODE_ID" ]; then
      GRAPH_CLI="${SCRIPT_DIR}/../../graph/dist/cli.js"
      PROJECT_ROOT="${CLAUDE_PROJECT_DIR:-.}"
      GRAPH_DB="${PROJECT_ROOT}/.code-review-graph/graph.db"

      if [ -f "$GRAPH_CLI" ] && [ -f "$GRAPH_DB" ]; then
        # Query graph for entities at this file path
        GRAPH_RESULT=$(node "$GRAPH_CLI" query_graph "{\"pattern\":\"file_summary\",\"target\":\"${FILE_PATH}\",\"repo_root\":\"${PROJECT_ROOT}\"}" 2>/dev/null)
        ENTITY_COUNT=$(echo "$GRAPH_RESULT" | jq -r '.results | length // 0' 2>/dev/null)

        if [ "${ENTITY_COUNT:-0}" -gt 0 ]; then
          # Get memory content preview for graph-side link
          CONTENT_PREVIEW="File modified: ${FILENAME} — ${REASON}"

          # Link memory node to each graph entity in BOTH databases
          echo "$GRAPH_RESULT" | jq -r '.results[]? | .qualified_name // empty' 2>/dev/null | head -10 | while IFS= read -r QNAME; do
            [ -z "$QNAME" ] && continue

            # Cortex side: ai_graph_links (memory → graph)
            LINK_PAYLOAD=$(jq -n \
              --arg agent_id "$AGENT_ID" \
              --arg memory_node_id "$NODE_ID" \
              --arg qualified "$QNAME" \
              --arg filepath "$FILE_PATH" \
              '{
                agent_id: $agent_id,
                memory_node_id: $memory_node_id,
                graph_qualified_name: $qualified,
                graph_file_path: $filepath,
                link_type: "about"
              }')
            node --experimental-sqlite "$CLI_PATH" create_graph_link "$LINK_PAYLOAD" 2>/dev/null

            # Graph side: memory_links (graph → memory)
            GRAPH_LINK_PAYLOAD=$(jq -n \
              --arg agent_id "$AGENT_ID" \
              --arg node_id "$NODE_ID" \
              --arg qualified "$QNAME" \
              --arg preview "$CONTENT_PREVIEW" \
              '{
                agent_id: $agent_id,
                cortex_memory_node_id: $node_id,
                node_qualified_name: $qualified,
                content_preview: $preview,
                link_type: "about",
                repo_root: "'"$PROJECT_ROOT"'"
              }')
            node "$GRAPH_CLI" create_memory_link "$GRAPH_LINK_PAYLOAD" 2>/dev/null
          done
        fi
      fi
    fi &
  fi
fi

exit 0
