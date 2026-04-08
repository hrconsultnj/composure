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

  # ── review (before operate — "review changes since commit" ≠ operate) ──
  *"review "*|*"audit "*|*"check quality"*|*"check the code"*|*"verify "*|*"validate "*|*"look over"*)
    TYPE="review"
    GUIDANCE="Review request. Consider /composure:review for delta analysis."
    ;;

  # ── research ──
  *"look up"*|*"find out"*|*"investigate"*|*"compare "*|*"research "*|*"what options"*|*"evaluate "*|*"what's the best"*|*"should we use"*)
    TYPE="research"
    GUIDANCE="Research request. Use Context7 + sub-agent. Write findings to tasks-plans/research/."
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

# ── Output ────────────────────────────────────────────────────
echo "[composure:request-type] ${TYPE}"
[ -n "$GUIDANCE" ] && echo "[composure:guidance] ${GUIDANCE}"

exit 0
