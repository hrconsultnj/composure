#!/bin/bash
# UserPromptSubmit hook: detect long/multi-thread prompts, inject TaskCreate nudge
set -e

INPUT=$(cat)
PROMPT=$(echo "$INPUT" | jq -r '.prompt // empty')
[ -z "$PROMPT" ] && exit 0

# Load shipped ruleset
SHIPPED="${CLAUDE_PLUGIN_ROOT}/guardrails-rulesets/long-prompt.json"
[ ! -f "$SHIPPED" ] && exit 0

# Read defaults from shipped ruleset
DEFAULTS=$(cat "$SHIPPED")

# Check for project-level override at .composure/nudges.json
PROJECT_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
OVERRIDE_FILE="${PROJECT_ROOT}/.composure/nudges.json"

# Shallow merge: override values win, missing keys fall back to shipped defaults
if [ -f "$OVERRIDE_FILE" ]; then
  OVERRIDE_SECTION=$(jq '.long_prompt // null' "$OVERRIDE_FILE" 2>/dev/null || echo "null")
  if [ "$OVERRIDE_SECTION" != "null" ]; then
    # Check for enabled override at top level of override file
    OVERRIDE_ENABLED=$(echo "$OVERRIDE_SECTION" | jq -r '.enabled // "unset"' 2>/dev/null)
    if [ "$OVERRIDE_ENABLED" = "false" ]; then
      exit 0
    fi
    CONFIG=$(echo "$DEFAULTS" | jq --argjson override "$OVERRIDE_SECTION" '.triggers = (.triggers * $override)')
  else
    CONFIG="$DEFAULTS"
  fi
else
  CONFIG="$DEFAULTS"
fi

# Check enabled flag
ENABLED=$(echo "$CONFIG" | jq -r '.enabled // true')
[ "$ENABLED" != "true" ] && exit 0

# Strip code blocks if configured
STRIP_CODE=$(echo "$CONFIG" | jq -r '.code_block_exclusion // true')
if [ "$STRIP_CODE" = "true" ]; then
  PROMPT_FOR_COUNT=$(echo "$PROMPT" | sed '/^```/,/^```/d')
else
  PROMPT_FOR_COUNT="$PROMPT"
fi

# Count signals
WORD_COUNT=$(echo "$PROMPT_FOR_COUNT" | wc -w | tr -d ' ')
ARROW_COUNT=$(echo "$PROMPT_FOR_COUNT" | grep -o '\->' | wc -l | tr -d ' ')
NUMBERED_COUNT=$(echo "$PROMPT_FOR_COUNT" | grep -cE '^\s*[0-9]+\.' || echo 0)

# Read thresholds from merged config
WORD_T=$(echo "$CONFIG" | jq -r '.triggers.word_count_threshold')
ARROW_T=$(echo "$CONFIG" | jq -r '.triggers.arrow_markers_threshold')
NUM_T=$(echo "$CONFIG" | jq -r '.triggers.numbered_items_threshold')
GATE=$(echo "$CONFIG" | jq -r '.triggers.signal_gate // 2')

TRIGGERED=0
[ "$WORD_COUNT" -ge "$WORD_T" ] 2>/dev/null && TRIGGERED=$((TRIGGERED + 1))
[ "$ARROW_COUNT" -ge "$ARROW_T" ] 2>/dev/null && TRIGGERED=$((TRIGGERED + 1))
[ "$NUMBERED_COUNT" -ge "$NUM_T" ] 2>/dev/null && TRIGGERED=$((TRIGGERED + 1))

if [ "$TRIGGERED" -ge "$GATE" ]; then
  CONCERN_COUNT=$((ARROW_COUNT > NUMBERED_COUNT ? ARROW_COUNT : NUMBERED_COUNT))
  [ "$CONCERN_COUNT" -lt 2 ] && CONCERN_COUNT=2
  NUDGE=$(echo "$CONFIG" | jq -r '.nudge_template' | sed "s/{concern_count}/${CONCERN_COUNT}/")
  echo "<system-reminder>"
  echo "$NUDGE"
  echo "</system-reminder>"
fi

exit 0
