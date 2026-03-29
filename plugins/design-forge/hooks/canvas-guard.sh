#!/usr/bin/env bash
set -euo pipefail

# canvas-guard.sh — PreToolUse hook that checks canvas animations
# for required performance/accessibility patterns.
#
# Only runs on .ts/.tsx/.js/.jsx files that contain canvas code.
# Replaces the prompt-type hook (which cost tokens on every write).

TAG="[design-forge:canvas-guard]"

INPUT=$(cat) || { printf '%s read error, allowing\n' "$TAG" >&2; exit 0; }
[[ -z "$INPUT" ]] && exit 0

if ! command -v jq >/dev/null 2>&1; then
  exit 0
fi

TOOL_NAME=$(printf '%s' "$INPUT" | jq -r '.tool_name // ""')

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

# ─── Gate: only JS/TS files ─────────────────────────────────
case "$BASENAME" in
  *.ts|*.tsx|*.js|*.jsx) ;;
  *) exit 0 ;;
esac

# ─── Gate: only if content has canvas/animation code ─────────
if ! printf '%s\n' "$CONTENT" | grep -qE 'requestAnimationFrame|canvas\.getContext|useCanvas|GenerativeCanvas|animationFrameId|createCanvas'; then
  exit 0
fi

# ─── Check required patterns ────────────────────────────────
MISSING=""

if ! printf '%s\n' "$CONTENT" | grep -qE 'IntersectionObserver|isVisible|intersect'; then
  MISSING="${MISSING}\n- Missing IntersectionObserver visibility gating — animations should pause when off-screen"
fi

if ! printf '%s\n' "$CONTENT" | grep -qE 'prefers-reduced-motion|prefersReducedMotion|reducedMotion'; then
  MISSING="${MISSING}\n- Missing prefers-reduced-motion check — respect user accessibility settings"
fi

if ! printf '%s\n' "$CONTENT" | grep -qE 'devicePixelRatio.*2|DPR.*cap|Math\.min.*devicePixelRatio|dpr.*Math\.min'; then
  MISSING="${MISSING}\n- Missing DPR cap — use Math.min(window.devicePixelRatio, 2) to prevent GPU strain on high-DPI displays"
fi

if [[ -n "$MISSING" ]]; then
  printf '%s Canvas animation missing required patterns:\n' "$TAG" >&2
  printf '%b\n' "$MISSING" >&2
  printf '\nSee design-forge accessibility guide for implementation details.\n' >&2
  exit 2
fi

exit 0
