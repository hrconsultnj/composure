#!/bin/bash
# ============================================================
# Auth Status Check — SessionStart Hook
# ============================================================
# Lightweight check on session start:
#   1. Does ~/.composure/credentials.json exist?
#   2. Is the token expired?
#   3. Attempt silent refresh if expired.
#
# NEVER blocks — informational only. Exits 0 always.

CREDS="$HOME/.composure/credentials.json"

# ── Not authenticated ─────────────────────────────────────────
if [ ! -f "$CREDS" ]; then
  printf '[composure] Not authenticated. Run /composure:auth login to enable Pro features.\n'
  exit 0
fi

# ── Validate token (quick, no network call) ───────────────────
# composure-token is on PATH via plugin bin/
VALIDATE_RESULT=$(composure-token validate 2>/dev/null)
VALIDATE_EXIT=$?

if [ $VALIDATE_EXIT -eq 0 ]; then
  # valid:{plan}:{email}
  PLAN=$(echo "$VALIDATE_RESULT" | cut -d: -f2)
  EMAIL=$(echo "$VALIDATE_RESULT" | cut -d: -f3)
  printf '[composure] Authenticated (%s plan).\n' "$PLAN"
  exit 0
fi

if [ $VALIDATE_EXIT -eq 2 ]; then
  # Token expired — attempt silent refresh (background, non-blocking)
  composure-token refresh >/dev/null 2>&1 &
  PLAN=$(node -e "try{const c=JSON.parse(require('fs').readFileSync('$CREDS','utf8'));console.log(c.plan||'free')}catch{console.log('free')}" 2>/dev/null)
  printf '[composure] Session refreshing (%s plan). If this persists, run /composure:auth login.\n' "$PLAN"
  exit 0
fi

# Fallback — something unexpected
printf '[composure] Auth check inconclusive. Run /composure:auth status to diagnose.\n'
exit 0
