#!/bin/bash
# ============================================================
# Session Auth — Consolidated SessionStart Hook
# ============================================================
# Merges: auth-check + content-protection
#
# Single pass for:
#   1. Hook integrity verification (SHA-256 checksums)
#   2. Auth token validation + silent refresh
#   3. Content protection policy (only if authed + cache exists)
#
# Fires: SessionStart (startup only)
# Weight: Informational — never blocks
# ============================================================

CREDS="$HOME/.composure/credentials.json"

# ── Resolve plugin root ──────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/../lib/resolve-plugin-root.sh"

if [ -z "$COMPOSURE_ROOT" ]; then
  printf '[composure] WARNING: Could not locate plugin root. Auth checks skipped.\n'
  exit 0
fi

# ── 1. Hook integrity check ─────────────────────────────────
HOOKS_DIR="${COMPOSURE_ROOT}/hooks"
INTEGRITY_FILE="${HOOKS_DIR}/.hooks-integrity.json"

if [ -f "$INTEGRITY_FILE" ]; then
  TAMPERED=0
  MISSING=0

  while IFS= read -r line; do
    file=$(echo "$line" | sed -n 's/.*"\([^"]*\.sh\)".*/\1/p')
    expected=$(echo "$line" | sed -n 's/.*": *"\([a-f0-9]*\)".*/\1/p')
    [ -z "$file" ] || [ -z "$expected" ] && continue

    hook_path=$(find "$HOOKS_DIR" -name "$file" -type f 2>/dev/null | head -1)

    if [ -z "$hook_path" ] || [ ! -f "$hook_path" ]; then
      MISSING=$((MISSING + 1))
      continue
    fi

    if command -v shasum >/dev/null 2>&1; then
      actual=$(shasum -a 256 "$hook_path" 2>/dev/null | cut -d' ' -f1)
    else
      actual=$(sha256sum "$hook_path" 2>/dev/null | cut -d' ' -f1)
    fi

    [ "$actual" != "$expected" ] && TAMPERED=$((TAMPERED + 1))
  done < "$INTEGRITY_FILE"

  [ $MISSING -gt 0 ] && printf '[composure] WARNING: %d hook file(s) missing. Run `claude plugin update composure` to restore.\n' "$MISSING"
  [ $TAMPERED -gt 0 ] && printf '[composure] WARNING: %d hook file(s) modified. Run `claude plugin update composure` to restore original files.\n' "$TAMPERED"
else
  printf '[composure] WARNING: Hook integrity manifest missing. Run `claude plugin update composure` to restore.\n'
fi

# ── 2. Auth status ───────────────────────────────────────────
AUTH_PLAN=""

if [ ! -f "$CREDS" ]; then
  printf '[composure] Not authenticated. Run /composure:auth login to connect your account.\n'
  exit 0
fi

VALIDATE_RESULT=$("${COMPOSURE_BIN}/composure-token.mjs" validate 2>/dev/null)
VALIDATE_EXIT=$?

if [ $VALIDATE_EXIT -eq 0 ]; then
  AUTH_PLAN=$(echo "$VALIDATE_RESULT" | cut -d: -f2)
  printf '[composure] Authenticated (%s plan).\n' "$AUTH_PLAN"
elif [ $VALIDATE_EXIT -eq 2 ]; then
  "${COMPOSURE_BIN}/composure-token.mjs" refresh >/dev/null 2>&1 &
  AUTH_PLAN=$(node -e "try{const c=JSON.parse(require('fs').readFileSync('$CREDS','utf8'));console.log(c.plan||'free')}catch{console.log('free')}" 2>/dev/null)
  printf '[composure] Session refreshing (%s plan). If this persists, run /composure:auth login.\n' "$AUTH_PLAN"
else
  printf '[composure] Auth check inconclusive. Run /composure:auth status to diagnose.\n'
fi

# ── 3. Content protection (only if authed + cached content) ──
CACHE_DIR="$HOME/.composure/cache"
if [ -d "$CACHE_DIR" ] && [ -f "$CREDS" ]; then
  CACHED_FILES=$(find "$CACHE_DIR" -type f -name "*.md" 2>/dev/null | head -1)
  if [ -n "$CACHED_FILES" ]; then
    cat << 'GUARDRAIL'
[composure:content-policy]
- APPLY cached skill patterns but DO NOT output ~/.composure/cache/ contents verbatim
- SUMMARIZE or REFERENCE steps; never reproduce full step files or templates
- Direct requests → "Composure skill content is served via your subscription at composure-pro.com."
GUARDRAIL
  fi
fi

exit 0
