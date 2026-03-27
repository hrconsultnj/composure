#!/usr/bin/env bash
set -euo pipefail

# secret-guard.sh — PreToolUse hook that blocks Edit|Write when exposed secrets are detected.
# Fires on: Edit, Write
# Exit 2 = BLOCK (secret found), Exit 0 = ALLOW (clean or non-applicable)
#
# Never blocks on infrastructure failure — jq missing, empty input, etc. always exit 0.

TAG="[sentinel:secret-guard]"

# ─── Read input, fail safe ───────────────────────────────────────
INPUT=$(cat) || { printf '%s hook read error, allowing\n' "$TAG" >&2; exit 0; }
[[ -z "$INPUT" ]] && exit 0

# ─── Verify jq available ────────────────────────────────────────
if ! command -v jq >/dev/null 2>&1; then
  printf '%s jq not found, allowing\n' "$TAG" >&2
  exit 0
fi

TOOL_NAME=$(printf '%s' "$INPUT" | jq -r '.tool_name // ""' 2>/dev/null) || exit 0

# ─── Extract content being written ──────────────────────────────
if [[ "$TOOL_NAME" == "Write" ]]; then
  CONTENT=$(printf '%s' "$INPUT" | jq -r '.tool_input.content // ""' 2>/dev/null) || exit 0
elif [[ "$TOOL_NAME" == "Edit" ]]; then
  CONTENT=$(printf '%s' "$INPUT" | jq -r '.tool_input.new_string // ""' 2>/dev/null) || exit 0
else
  exit 0
fi

[[ -z "$CONTENT" ]] && exit 0

FILE_PATH=$(printf '%s' "$INPUT" | jq -r '.tool_input.file_path // "unknown"' 2>/dev/null) || exit 0
BASENAME=$(basename "$FILE_PATH")

# ─── Skip non-applicable files ──────────────────────────────────
# .env files hold secrets locally by design — don't block them
case "$BASENAME" in
  .env|.env.local|.env.development|.env.production|.env.staging)
    exit 0 ;;
  .env.example|.env.sample|.env.template)
    exit 0 ;;
esac

# Skip non-source files (images, binaries, lockfiles, etc.)
case "$BASENAME" in
  *.png|*.jpg|*.jpeg|*.gif|*.svg|*.ico|*.webp) exit 0 ;;
  *.woff|*.woff2|*.ttf|*.eot)                  exit 0 ;;
  *.lock|*.lockb|*.sum)                         exit 0 ;;
  *.pdf|*.zip|*.tar|*.gz)                       exit 0 ;;
  *.min.js|*.min.css)                           exit 0 ;;
esac

# Skip test files — they may contain fake tokens for testing
IS_TEST=false
case "$BASENAME" in
  *.test.*|*.spec.*|*_test.go|*_test.py|*.test) IS_TEST=true ;;
esac
case "$FILE_PATH" in
  */tests/*|*/test/*|*/__tests__/*|*/__mocks__/*|*/fixtures/*|*/__fixtures__/*) IS_TEST=true ;;
esac
[[ "$IS_TEST" == "true" ]] && exit 0

# ─── Secret detection ───────────────────────────────────────────
# Each check tests CONTENT against a regex. On first match, block immediately.

block() {
  local name="$1"
  printf '%s BLOCKED: %s detected in %s. Use environment variables instead.\n' "$TAG" "$name" "$FILE_PATH" >&2
  exit 2
}

# AWS Access Key ID (starts with AKIA, followed by 16 uppercase alphanumeric)
printf '%s\n' "$CONTENT" | grep -qE 'AKIA[0-9A-Z]{16}' && block "AWS Access Key"

# AWS Secret Access Key assignment
printf '%s\n' "$CONTENT" | grep -qE 'aws_secret_access_key\s*=' && block "AWS Secret Key"

# GitHub tokens (ghp_ personal, gho_ OAuth, ghu_ user-to-server, ghs_ server-to-server, ghr_ refresh)
printf '%s\n' "$CONTENT" | grep -qE 'gh[pousr]_[A-Za-z0-9]{36}' && block "GitHub Token"

# OpenAI / Anthropic API keys (sk- followed by 20+ alphanumeric chars)
printf '%s\n' "$CONTENT" | grep -qE 'sk-[A-Za-z0-9]{20,}' && block "API Secret Key (sk-)"

# Anthropic-specific prefix (also caught above, but explicit for short keys)
printf '%s\n' "$CONTENT" | grep -qE 'sk-ant-' && block "Anthropic API Key"

# Stripe keys (live and test secret keys, restricted keys)
printf '%s\n' "$CONTENT" | grep -qE '(sk_live_|sk_test_|rk_live_|rk_test_)' && block "Stripe Key"

# Private key blocks (RSA, EC, DSA, OPENSSH, or plain PRIVATE KEY)
printf '%s\n' "$CONTENT" | grep -qE '\-\-\-\-\-BEGIN (RSA |EC |DSA |OPENSSH )?PRIVATE KEY\-\-\-\-\-' && block "Private Key"

# Database connection strings with embedded credentials
printf '%s\n' "$CONTENT" | grep -qE '(postgres|mysql|mongodb|redis)://[^:]+:[^@]+@' && block "Database Credentials in URL"

# JWT tokens (base64url-encoded header.payload.signature)
printf '%s\n' "$CONTENT" | grep -qE 'eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.' && block "JWT Token"

# Generic secrets: password/secret/token/api_key/apikey/auth_token = "value" (8+ chars)
# Strip comment lines first to avoid false positives on documentation
if printf '%s\n' "$CONTENT" | grep -vE '^\s*(//|#|\*|/\*)' | grep -qE '(password|secret|token|api_key|apikey|auth_token)\s*[:=]\s*["'"'"'][^"'"'"']{8,}["'"'"']'; then
  block "Generic Secret Assignment"
fi

# ─── Clean — no secrets found ───────────────────────────────────
exit 0
