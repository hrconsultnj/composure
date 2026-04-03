#!/usr/bin/env bash
# ============================================================
# Framework Validation — PreToolUse Hook
# ============================================================
# Runs frameworkValidation rules from:
#   Layer 1: Plugin defaults ($CLAUDE_PLUGIN_ROOT/defaults/*.json)
#   Layer 2: Project config (.claude/no-bandaids.json frameworkValidation)
#
# Split from no-bandaids.sh so that:
#   - A crash in plugin defaults doesn't kill project rules (and vice versa)
#   - Each hook runs in parallel; most-restrictive answer wins
#
# Severity "error" → blocks (exit 2). Severity "warn" → warns only.
# ============================================================

INPUT=$(cat)
TOOL_NAME=$(printf '%s' "$INPUT" | jq -r '.tool_name')

if [[ "$TOOL_NAME" == "Write" ]]; then
  CONTENT=$(printf '%s' "$INPUT" | jq -r '.tool_input.content // ""')
elif [[ "$TOOL_NAME" == "Edit" ]]; then
  CONTENT=$(printf '%s' "$INPUT" | jq -r '.tool_input.new_string // ""')
else
  exit 0
fi

[[ -z "$CONTENT" ]] && exit 0

FILE_PATH=$(printf '%s' "$INPUT" | jq -r '.tool_input.file_path // "unknown"')
BASENAME=$(basename "$FILE_PATH")
PROJECT_DIR=$(printf '%s' "$INPUT" | jq -r '.cwd // ""')

# Derive project root if .cwd is empty
if [[ -z "$PROJECT_DIR" || ! -d "$PROJECT_DIR" ]]; then
  PROJECT_DIR=$(git -C "$(dirname "$FILE_PATH")" rev-parse --show-toplevel 2>/dev/null || true)
fi
if [[ -z "$PROJECT_DIR" || ! -d "$PROJECT_DIR" ]]; then
  _dir=$(dirname "$FILE_PATH")
  while [[ "$_dir" != "/" && "$_dir" != "." ]]; do
    if [[ -d "${_dir}/.git" || -f "${_dir}/.claude/no-bandaids.json" ]]; then
      PROJECT_DIR="$_dir"
      break
    fi
    _dir=$(dirname "$_dir")
  done
fi

[[ -z "$PROJECT_DIR" ]] && exit 0

# ── Load config ──────────────────────────────────────────────
CONFIG_FILE="${PROJECT_DIR}/.claude/no-bandaids.json"
if [[ -f "$CONFIG_FILE" ]]; then
  CONFIG=$(cat "$CONFIG_FILE")
else
  exit 0  # No config = no framework rules to check
fi

# ── Relative path for glob matching ──────────────────────────
REL_PATH="${FILE_PATH#"$PROJECT_DIR"/}"

VIOLATIONS=""
WARNINGS=""

# ── Glob-to-regex converter ──────────────────────────────────
glob_to_regex() {
  printf '%s' "$1" | sed 's/\*\*/__DBLSTAR__/g; s/\./\\./g; s/\*/__STAR__/g; s/__DBLSTAR__/.*/g; s/__STAR__/[^\/]*/g'
}

# ── Process a set of framework validation groups ─────────────
process_fv_groups() {
  local FV_JSON="$1"

  local GROUP
  for GROUP in $(printf '%s' "$FV_JSON" | jq -r 'keys[]' 2>/dev/null); do
    local MATCH=false
    local GLOB_PATTERN
    for GLOB_PATTERN in $(printf '%s' "$FV_JSON" | jq -r ".\"$GROUP\".appliesTo[]" 2>/dev/null); do
      local REGEX_PATTERN
      REGEX_PATTERN=$(glob_to_regex "$GLOB_PATTERN")
      if printf '%s' "$REL_PATH" | grep -qE "^${REGEX_PATTERN}$"; then
        MATCH=true
        break
      fi
    done
    [[ "$MATCH" == "false" ]] && continue

    local RULE_COUNT
    RULE_COUNT=$(printf '%s' "$FV_JSON" | jq ".\"$GROUP\".rules | length" 2>/dev/null || echo 0)
    [[ "$RULE_COUNT" == "0" || "$RULE_COUNT" == "null" ]] && continue

    local i
    for ((i=0; i<RULE_COUNT; i++)); do
      local RULE_PATTERN RULE_SEVERITY RULE_MESSAGE RULE_SKIPIF RULE_INVERT
      RULE_PATTERN=$(printf '%s' "$FV_JSON" | jq -r ".\"$GROUP\".rules[$i].pattern" 2>/dev/null || continue)
      RULE_SEVERITY=$(printf '%s' "$FV_JSON" | jq -r ".\"$GROUP\".rules[$i].severity" 2>/dev/null || echo "warn")
      RULE_MESSAGE=$(printf '%s' "$FV_JSON" | jq -r ".\"$GROUP\".rules[$i].message" 2>/dev/null || continue)
      RULE_SKIPIF=$(printf '%s' "$FV_JSON" | jq -r ".\"$GROUP\".rules[$i].skipIf // empty" 2>/dev/null)
      RULE_INVERT=$(printf '%s' "$FV_JSON" | jq -r ".\"$GROUP\".rules[$i].invertMatch // false" 2>/dev/null)

      # Skip if content matches skipIf pattern
      if [[ -n "$RULE_SKIPIF" ]] && printf '%s\n' "$CONTENT" | grep -qE "$RULE_SKIPIF" 2>/dev/null; then
        continue
      fi

      local MATCHED=false
      if printf '%s\n' "$CONTENT" | grep -qE "$RULE_PATTERN" 2>/dev/null; then
        MATCHED=true
      fi

      # invertMatch: violation is when pattern is NOT found
      if [[ "$RULE_INVERT" == "true" ]]; then
        [[ "$MATCHED" == "true" ]] && MATCHED=false || MATCHED=true
      fi

      if [[ "$MATCHED" == "true" ]]; then
        if [[ "$RULE_SEVERITY" == "error" ]]; then
          VIOLATIONS="${VIOLATIONS}\n- [${GROUP}] ${RULE_MESSAGE}"
        else
          WARNINGS="${WARNINGS}\n- [${GROUP}] ${RULE_MESSAGE}"
        fi
      fi
    done
  done
}

# ── Next.js: block content components in app/ ────────────────
if printf '%s' "$CONFIG" | jq -e '[.frameworks[].frontend // empty] | index("nextjs")' >/dev/null 2>&1; then
  case "$REL_PATH" in
    app/*.tsx|src/app/*.tsx)
      case "$BASENAME" in
        page.tsx|layout.tsx|loading.tsx|error.tsx|not-found.tsx|global-error.tsx|template.tsx|default.tsx) ;;
        opengraph-image.tsx|twitter-image.tsx|icon.tsx|apple-icon.tsx|sitemap.tsx|robots.tsx|manifest.tsx) ;;
        *)
          VIOLATIONS="${VIOLATIONS}\n- [nextjs-app-content] Content component '${BASENAME}' belongs in components/, not app/."
          ;;
      esac
      ;;
  esac
fi

# ── Layer 1: Plugin defaults ─────────────────────────────────
PLUGIN_DEFAULTS="${CLAUDE_PLUGIN_ROOT:-/dev/null}/defaults"
PLUGIN_GROUP_NAMES=""

load_plugin_rules() {
  local RULES_FILE="$1"
  [[ ! -f "$RULES_FILE" ]] && return
  local FV
  FV=$(jq -r '.rules' "$RULES_FILE" 2>/dev/null)
  [[ -z "$FV" || "$FV" == "null" ]] && return
  # Collect group names (one per line) for dedup against project rules
  PLUGIN_GROUP_NAMES="${PLUGIN_GROUP_NAMES}$(printf '%s' "$FV" | jq -r 'keys[]' 2>/dev/null)
"
  process_fv_groups "$FV"
}

# Always load shared rules
load_plugin_rules "${PLUGIN_DEFAULTS}/shared.json"

# Load category rules based on detected stack
if [[ -f "$CONFIG_FILE" ]]; then
  FE=$(printf '%s' "$CONFIG" | jq -r '[.frameworks[].frontend // empty] | map(select(. != "null")) | unique[]' 2>/dev/null || true)
  for fe in $FE; do
    for f in "${PLUGIN_DEFAULTS}"/frontend/*.json; do
      load_plugin_rules "$f"
    done
    case "$fe" in
      nextjs)  load_plugin_rules "${PLUGIN_DEFAULTS}/fullstack/nextjs.json" ;;
      expo)    load_plugin_rules "${PLUGIN_DEFAULTS}/mobile/expo.json" ;;
    esac
  done

  BE=$(printf '%s' "$CONFIG" | jq -r '[.frameworks[].backend // empty] | map(select(. != "null")) | unique[]' 2>/dev/null || true)
  for be in $BE; do
    case "$be" in
      supabase) load_plugin_rules "${PLUGIN_DEFAULTS}/backend/supabase.json" ;;
    esac
  done

  if printf '%s' "$CONFIG" | jq -e '.frameworks.html' >/dev/null 2>&1; then
    load_plugin_rules "${PLUGIN_DEFAULTS}/vanilla.json"
  fi

  if printf '%s' "$CONFIG" | jq -r '.frameworks[].versions' 2>/dev/null | grep -q 'tanstack-query\|@tanstack/react-query'; then
    load_plugin_rules "${PLUGIN_DEFAULTS}/sdks/tanstack-query.json"
  fi
  if printf '%s' "$CONFIG" | jq -r '.frameworks[].versions' 2>/dev/null | grep -q 'zod'; then
    load_plugin_rules "${PLUGIN_DEFAULTS}/sdks/zod.json"
  fi
fi

# ── Layer 2: Project-level rules ─────────────────────────────
if printf '%s' "$CONFIG" | jq -e '.frameworkValidation' >/dev/null 2>&1; then
  PROJECT_FV=$(printf '%s' "$CONFIG" | jq -r '.frameworkValidation')
  if [[ -n "$PLUGIN_GROUP_NAMES" ]]; then
    # Filter out project groups that share names with plugin groups
    PLUGIN_KEYS_JSON=$(printf '%s' "$PLUGIN_GROUP_NAMES" | grep -v '^$' | sort -u | jq -R . | jq -s . 2>/dev/null || echo '[]')
    FILTERED_FV=$(printf '%s' "$PROJECT_FV" | jq --argjson plugin "$PLUGIN_KEYS_JSON" 'with_entries(select(.key as $k | $plugin | index($k) | not))' 2>/dev/null)
    [[ -n "$FILTERED_FV" && "$FILTERED_FV" != "null" && "$FILTERED_FV" != "{}" ]] && process_fv_groups "$FILTERED_FV"
  else
    process_fv_groups "$PROJECT_FV"
  fi
fi

# ── Report ───────────────────────────────────────────────────
if [[ -n "$VIOLATIONS" ]]; then
  printf 'BLOCKED: Framework validation failed (%s):\n' "$BASENAME" >&2
  printf '%b\n' "$VIOLATIONS" >&2
  if [[ -n "$WARNINGS" ]]; then
    printf '\nWarnings (non-blocking):\n' >&2
    printf '%b\n' "$WARNINGS" >&2
  fi
  exit 2
fi

if [[ -n "$WARNINGS" ]]; then
  printf 'Framework warnings in %s (non-blocking):\n' "$BASENAME" >&2
  printf '%b\n' "$WARNINGS" >&2
fi

exit 0
