#!/bin/bash
# ============================================================
# Auth & Integrity Check — SessionStart Hook
# ============================================================
# Single source of trust. Three responsibilities:
#   1. Check credentials exist → report auth status
#   2. Validate token not expired → attempt silent refresh
#   3. Verify hook integrity → checksums from .hooks-integrity.json
#
# If this file is deleted, the auth status message disappears
# entirely — which is itself a red flag to the user.
#
# Fires: SessionStart (startup only)
# Weight: Informational — never blocks
# ============================================================

CREDS="$HOME/.composure/credentials.json"
HOOKS_DIR="${CLAUDE_PLUGIN_ROOT}/hooks"
INTEGRITY_FILE="${HOOKS_DIR}/.hooks-integrity.json"

# Resolve bin path from plugin root (bare commands aren't on PATH)
COMPOSURE_BIN="${CLAUDE_PLUGIN_ROOT}/bin"

# ── Hook Integrity Check ──────────────────────────────────────
# Runs first — if hooks are tampered, everything else is suspect

if [ -f "$INTEGRITY_FILE" ]; then
  TAMPERED=0
  MISSING=0

  # Parse the integrity manifest and check each hook
  while IFS= read -r line; do
    # Extract filename and expected hash from JSON
    file=$(echo "$line" | sed -n 's/.*"\([^"]*\.sh\)".*/\1/p')
    expected=$(echo "$line" | sed -n 's/.*": *"\([a-f0-9]*\)".*/\1/p')
    [ -z "$file" ] || [ -z "$expected" ] && continue

    # Find the hook in any subdirectory (session/, enforcement/, quality/, graph/)
    hook_path=$(find "$HOOKS_DIR" -name "$file" -type f 2>/dev/null | head -1)

    if [ -z "$hook_path" ] || [ ! -f "$hook_path" ]; then
      MISSING=$((MISSING + 1))
      continue
    fi

    # Compute actual checksum (macOS shasum or Linux sha256sum)
    if command -v shasum >/dev/null 2>&1; then
      actual=$(shasum -a 256 "$hook_path" 2>/dev/null | cut -d' ' -f1)
    else
      actual=$(sha256sum "$hook_path" 2>/dev/null | cut -d' ' -f1)
    fi

    if [ "$actual" != "$expected" ]; then
      TAMPERED=$((TAMPERED + 1))
    fi
  done < "$INTEGRITY_FILE"

  if [ $MISSING -gt 0 ]; then
    printf '[composure] WARNING: %d hook file(s) missing. Run `claude plugin update composure` to restore.\n' "$MISSING"
  fi
  if [ $TAMPERED -gt 0 ]; then
    printf '[composure] WARNING: %d hook file(s) modified. Run `claude plugin update composure` to restore original files.\n' "$TAMPERED"
  fi
else
  printf '[composure] WARNING: Hook integrity manifest missing. Run `claude plugin update composure` to restore.\n'
fi

# ── Auth Status Check ─────────────────────────────────────────

if [ ! -f "$CREDS" ]; then
  printf '[composure] Not authenticated. Run /composure:auth login to connect your account.\n'
  exit 0
fi

# Validate token (quick, no network call)
VALIDATE_RESULT=$("${COMPOSURE_BIN}/composure-token.mjs" validate 2>/dev/null)
VALIDATE_EXIT=$?

if [ $VALIDATE_EXIT -eq 0 ]; then
  PLAN=$(echo "$VALIDATE_RESULT" | cut -d: -f2)
  EMAIL=$(echo "$VALIDATE_RESULT" | cut -d: -f3)
  printf '[composure] Authenticated (%s plan).\n' "$PLAN"
  exit 0
fi

if [ $VALIDATE_EXIT -eq 2 ]; then
  # Token expired — attempt silent refresh (background, non-blocking)
  "${COMPOSURE_BIN}/composure-token.mjs" refresh >/dev/null 2>&1 &
  PLAN=$(node -e "try{const c=JSON.parse(require('fs').readFileSync('$CREDS','utf8'));console.log(c.plan||'free')}catch{console.log('free')}" 2>/dev/null)
  printf '[composure] Session refreshing (%s plan). If this persists, run /composure:auth login.\n' "$PLAN"
  exit 0
fi

# Fallback
printf '[composure] Auth check inconclusive. Run /composure:auth status to diagnose.\n'
exit 0
