#!/usr/bin/env bash
# [sentinel:dep-check] SessionStart hook — check lockfile for known CVEs
# Non-blocking: always exits 0

set -euo pipefail

TAG="[sentinel:dep-check]"

# --- Locate project root ---
PROJECT_ROOT="${CLAUDE_PROJECT_ROOT:-$(pwd)}"

# --- Detect package manager ---
detect_pm() {
  if [ -f "$PROJECT_ROOT/bun.lockb" ] || [ -f "$PROJECT_ROOT/bun.lock" ]; then
    echo "bun"
  elif [ -f "$PROJECT_ROOT/pnpm-lock.yaml" ]; then
    echo "pnpm"
  elif [ -f "$PROJECT_ROOT/yarn.lock" ]; then
    echo "yarn"
  elif [ -f "$PROJECT_ROOT/package-lock.json" ]; then
    echo "npm"
  else
    echo ""
  fi
}

PM=$(detect_pm)

if [ -z "$PM" ]; then
  # No JS lockfile found — nothing to audit
  exit 0
fi

# --- Cache key: hash of lockfile path ---
LOCK_FILES=("bun.lockb" "bun.lock" "pnpm-lock.yaml" "yarn.lock" "package-lock.json")
LOCK_PATH=""
for lf in "${LOCK_FILES[@]}"; do
  if [ -f "$PROJECT_ROOT/$lf" ]; then
    LOCK_PATH="$PROJECT_ROOT/$lf"
    break
  fi
done

if [ -z "$LOCK_PATH" ]; then
  exit 0
fi

# Generate a stable project hash for cache key
PROJECT_HASH=$(echo -n "$PROJECT_ROOT" | shasum -a 256 | cut -c1-16)
CACHE_FILE="/tmp/sentinel-dep-check-${PROJECT_HASH}"

# --- Check cache freshness (24h = 86400s) ---
if [ -f "$CACHE_FILE" ]; then
  NOW=$(date +%s)
  if [[ "$OSTYPE" == darwin* ]]; then
    CACHE_MTIME=$(stat -f "%m" "$CACHE_FILE" 2>/dev/null || echo 0)
  else
    CACHE_MTIME=$(stat -c "%Y" "$CACHE_FILE" 2>/dev/null || echo 0)
  fi
  CACHE_AGE=$(( NOW - CACHE_MTIME ))

  if [ "$CACHE_AGE" -lt 86400 ]; then
    # Cache is fresh — replay cached result
    CACHED=$(cat "$CACHE_FILE")
    if [ -n "$CACHED" ] && [ "$CACHED" != "0" ]; then
      echo "$TAG Found $CACHED known CVE(s) in dependencies. Run /sentinel:audit-deps for details."
    fi
    exit 0
  fi
fi

# --- Run audit ---
CVE_COUNT=0

case "$PM" in
  bun)
    # Bun doesn't have a native audit yet — skip gracefully
    echo "0" > "$CACHE_FILE"
    exit 0
    ;;
  pnpm)
    AUDIT_OUTPUT=$(cd "$PROJECT_ROOT" && pnpm audit --json 2>/dev/null) || true
    if [ -n "$AUDIT_OUTPUT" ]; then
      # pnpm audit --json returns advisories object
      CVE_COUNT=$(echo "$AUDIT_OUTPUT" | grep -c '"severity"' 2>/dev/null || echo 0)
    fi
    ;;
  yarn)
    AUDIT_OUTPUT=$(cd "$PROJECT_ROOT" && yarn audit --json 2>/dev/null) || true
    if [ -n "$AUDIT_OUTPUT" ]; then
      CVE_COUNT=$(echo "$AUDIT_OUTPUT" | grep -c '"type":"auditAdvisory"' 2>/dev/null || echo 0)
    fi
    ;;
  npm)
    AUDIT_OUTPUT=$(cd "$PROJECT_ROOT" && npm audit --json 2>/dev/null) || true
    if [ -n "$AUDIT_OUTPUT" ]; then
      # npm audit --json has a "vulnerabilities" object
      CVE_COUNT=$(echo "$AUDIT_OUTPUT" | grep -o '"severity"' 2>/dev/null | wc -l | tr -d ' ' || echo 0)
    fi
    ;;
esac

# --- Cache result ---
echo "$CVE_COUNT" > "$CACHE_FILE"

# --- Report ---
if [ "$CVE_COUNT" -gt 0 ]; then
  echo "$TAG Found $CVE_COUNT known CVE(s) in dependencies. Run /sentinel:audit-deps for details."
fi

# --- Check banned-packages.json staleness (30 day threshold) ---
BANNED_FILE="$(cd "$(dirname "$0")" && pwd)/../data/banned-packages.json"
if [ -f "$BANNED_FILE" ]; then
  LAST_UPDATED=$(jq -r '._lastUpdated // ""' "$BANNED_FILE" 2>/dev/null)
  if [ -n "$LAST_UPDATED" ]; then
    # Convert date string to epoch
    if [[ "$OSTYPE" == darwin* ]]; then
      UPDATED_EPOCH=$(date -j -f "%Y-%m-%d" "$LAST_UPDATED" "+%s" 2>/dev/null || echo 0)
    else
      UPDATED_EPOCH=$(date -d "$LAST_UPDATED" "+%s" 2>/dev/null || echo 0)
    fi
    NOW=$(date +%s)
    AGE_DAYS=$(( (NOW - UPDATED_EPOCH) / 86400 ))
    if [ "$AGE_DAYS" -gt 30 ]; then
      echo "$TAG Banned packages list is ${AGE_DAYS} days old. Consider updating sentinel/data/banned-packages.json."
    fi
  fi
fi

exit 0
