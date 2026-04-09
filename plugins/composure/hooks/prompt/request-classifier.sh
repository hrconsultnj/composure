#!/bin/bash
# ============================================================
# Request Classifier — UserPromptSubmit Hook
# ============================================================
# Classifies user intent from prompt keywords. Injects guidance
# that shapes Claude's initial approach before any tool runs.
#
# Categories defined in: skills/_shared/classifications.md
# (single source of truth for hooks, skills, website, CLI)
#
# Constraint: <200ms. Pure bash — no external processes for
# classification. Long-prompt detection as secondary signal.
# ============================================================

set -e

INPUT=$(cat)
PROMPT=$(echo "$INPUT" | jq -r '.prompt // empty')
[ -z "$PROMPT" ] && exit 0

# ── Normalize first 500 chars for matching ────────────────────
PROMPT_HEAD=$(echo "$PROMPT" | head -c 500 | tr '[:upper:]' '[:lower:]')

# ── Request type classification ───────────────────────────────
# Order matters: more specific patterns first, default last.
# Source of truth: skills/_shared/classifications.md

TYPE="implement"
GUIDANCE=""

case "$PROMPT_HEAD" in
  # ── plan (highest intent — explicit planning request) ──
  *blueprint*|*"let's plan"*|*"think through"*|*"map out"*|*"scope out"*|*"architect"*|*"design the"*)
    TYPE="plan"
    GUIDANCE="Planning request. Consider /composure:blueprint for structured pre-work."
    ;;

  # ── review (code review intent, not casual "review this") ──
  *"review the code"*|*"review the changes"*|*"review the pr"*|*"review pr"*|*"code review"*|*"audit the"*|*"audit this project"*|*"check quality"*|*"check the code"*|*"run an audit"*)
    TYPE="review"
    GUIDANCE="Code review request. Consider /composure:review for delta analysis."
    ;;

  # ── research ──
  *"look up"*|*"find out"*|*"investigate"*|*"compare "*|*"research "*|*"what options"*|*"evaluate "*|*"what's the best"*|*"should we use"*)
    TYPE="research"
    GUIDANCE="Research request. Check cache (.composure/research/), then spawn sub-agent if needed. Sub-agent writes file, you Read it directly."
    ;;

  # ── explain ──
  *"what is"*|*"how does"*|*"explain "*|*"why does"*|*"describe "*|*"show me"*|*"walk me through"*|*"what does"*|*"how do"*)
    TYPE="explain"
    GUIDANCE="Explanation request. Read the relevant files before answering."
    ;;

  # ── configure ──
  *"install "*|*"set up"*|*"setup "*|*"initialize"*|*"configure "*|*"enable "*|*"disable "*|*"uninstall"*)
    TYPE="configure"
    GUIDANCE="Configuration request. Check for a matching /composure: skill."
    ;;

  # ── operate (after review/explain — avoid false positives from "commit" in context) ──
  *commit*|*"push to"*|*"merge to"*|*"push and"*|*deploy*|*release*|*publish*|*"tag "*|*"version bump"*)
    TYPE="operate"
    GUIDANCE="Git/deploy operation. Execute directly."
    ;;
esac

# ── Long-prompt detection (secondary signal) ──────────────────
# Only matters for implement — long research/plan prompts are normal.

if [ "$TYPE" = "implement" ]; then
  # Load thresholds from shipped ruleset
  SHIPPED="${CLAUDE_PLUGIN_ROOT}/guardrails-rulesets/long-prompt.json"
  if [ -f "$SHIPPED" ]; then
    # Strip code blocks before counting
    PROMPT_FOR_COUNT=$(echo "$PROMPT" | sed '/^```/,/^```/d')
    WORD_COUNT=$(echo "$PROMPT_FOR_COUNT" | wc -w | tr -d ' ')
    ARROW_COUNT=$(echo "$PROMPT_FOR_COUNT" | grep -o '\->' | wc -l | tr -d ' ')
    NUMBERED_COUNT=$(echo "$PROMPT_FOR_COUNT" | grep -cE '^\s*[0-9]+\.' || echo 0)

    WORD_T=$(jq -r '.triggers.word_count_threshold' "$SHIPPED" 2>/dev/null || echo 200)
    ARROW_T=$(jq -r '.triggers.arrow_markers_threshold' "$SHIPPED" 2>/dev/null || echo 3)
    NUM_T=$(jq -r '.triggers.numbered_items_threshold' "$SHIPPED" 2>/dev/null || echo 4)
    GATE=$(jq -r '.triggers.signal_gate // 2' "$SHIPPED" 2>/dev/null || echo 2)

    TRIGGERED=0
    [ "$WORD_COUNT" -ge "$WORD_T" ] 2>/dev/null && TRIGGERED=$((TRIGGERED + 1))
    [ "$ARROW_COUNT" -ge "$ARROW_T" ] 2>/dev/null && TRIGGERED=$((TRIGGERED + 1))
    [ "$NUMBERED_COUNT" -ge "$NUM_T" ] 2>/dev/null && TRIGGERED=$((TRIGGERED + 1))

    if [ "$TRIGGERED" -ge "$GATE" ]; then
      CONCERN_COUNT=$((ARROW_COUNT > NUMBERED_COUNT ? ARROW_COUNT : NUMBERED_COUNT))
      [ "$CONCERN_COUNT" -lt 2 ] && CONCERN_COUNT=2
      GUIDANCE="Multi-step implementation request (~${CONCERN_COUNT} tasks). Use TaskCreate to track each step."
    fi
  fi
fi

# ── Reasoning guidance by type ────────────────────────────────
# Complex types benefit from sequential thinking (structured reasoning)
case "$TYPE" in
  implement|plan)
    REASONING="Use sequential thinking (sequential_think MCP tool) for multi-step analysis before writing code."
    ;;
  research)
    REASONING="Use Context7 for library docs. Use sequential thinking to compare options systematically."
    ;;
  review)
    REASONING="Use sequential thinking for systematic code review. Check graph for blast radius."
    ;;
esac

# ── Determine if TaskCreate should be forced ──────────────────
# Complex requests MUST use tasks. Not a suggestion — a requirement.
FORCE_TASKS=false
CONCERN_DETAIL=""

case "$TYPE" in
  plan)
    FORCE_TASKS=true
    CONCERN_DETAIL="Planning request detected. Break this into tracked tasks."
    ;;
  implement)
    # Already set by long-prompt detection above
    if [ "$TRIGGERED" -ge "${GATE:-2}" ] 2>/dev/null; then
      FORCE_TASKS=true
      CONCERN_DETAIL="This prompt contains ${CONCERN_COUNT:-multiple} distinct concerns."
    fi
    ;;
  research)
    # Research with multiple topics = needs tasks
    TOPIC_COUNT=$(echo "$PROMPT_HEAD" | grep -oE '(also|and also|plus|additionally|as well as)' | wc -l | tr -d ' ')
    if [ "$TOPIC_COUNT" -ge 2 ] || [ "${WORD_COUNT:-0}" -ge 150 ]; then
      FORCE_TASKS=true
      CONCERN_DETAIL="Multi-topic research request. Track each research area as a task."
    fi
    ;;
  review)
    FORCE_TASKS=true
    CONCERN_DETAIL="Code review request. Create tasks for each review area."
    ;;
esac

# ── Output ────────────────────────────────────────────────────
# Use <system-reminder> for forced instructions (model treats as authoritative)
# Use plain text for suggestions

if [ "$FORCE_TASKS" = true ]; then
  echo "<system-reminder>"
  echo "UserPromptSubmit hook success: <system-reminder>"
  echo "${CONCERN_DETAIL} Start with /composure:blueprint to plan and break this down — it will classify the work, check for research, and create tracked tasks. If this is a simple list of independent items, use TaskCreate to track them directly."
  echo "</system-reminder>"
  echo "</system-reminder>"
else
  echo "[composure:request-type] ${TYPE}"
  [ -n "$GUIDANCE" ] && echo "[composure:guidance] ${GUIDANCE}"
fi

[ -n "$REASONING" ] && echo "[composure:reasoning] ${REASONING}"

exit 0
