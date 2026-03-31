#!/usr/bin/env bash
set -euo pipefail

# dep-guard.sh — PreToolUse hook that intercepts package installation commands.
# Checks packages against a banned list and queries npm advisory API for unknown JS packages.
# Supports: JS (pnpm/npm/yarn/bun/npx/bunx), Python (pip/uv/poetry/conda/pipx), Rust (cargo), Go (go get/install).
#
# Exit codes:
#   0 = pass (no issues, infrastructure error, or not a package install command)
#   2 = BLOCK (banned package or critical CVE detected)

TAG="[sentinel:dep-guard]"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PLUGIN_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
BANNED_FILE="$PLUGIN_ROOT/data/banned-packages.json"
PROJECT_ROOT="${CLAUDE_PROJECT_ROOT:-$(pwd)}"

# ─── Read tool input from stdin ──────────────────────────────────
INPUT=$(cat) || { printf '%s infrastructure error: failed to read stdin\n' "$TAG" >&2; exit 0; }
TOOL_NAME=$(printf '%s' "$INPUT" | jq -r '.tool_name' 2>/dev/null) || { printf '%s infrastructure error: jq unavailable\n' "$TAG" >&2; exit 0; }

# Only intercept Bash commands
[[ "$TOOL_NAME" != "Bash" ]] && exit 0

COMMAND=$(printf '%s' "$INPUT" | jq -r '.tool_input.command // ""' 2>/dev/null)
[[ -z "$COMMAND" ]] && exit 0

# ─── Detect active ecosystems from project files ─────────────────
detect_ecosystems() {
  local eco="js"
  [ -f "$PROJECT_ROOT/pyproject.toml" ] || [ -f "$PROJECT_ROOT/requirements.txt" ] || [ -f "$PROJECT_ROOT/setup.py" ] && eco="$eco python"
  [ -f "$PROJECT_ROOT/Cargo.toml" ] && eco="$eco rust"
  [ -f "$PROJECT_ROOT/go.mod" ] && eco="$eco go"
  echo "$eco"
}

ECOSYSTEMS=$(detect_ecosystems)

# ─── Extract package install attempts from command ───────────────
# Returns: "ecosystem:package_name" or empty if not an install command.
# Handles chained commands (&&, ;) by checking each segment.

extract_install() {
  local cmd="$1"
  local results=""

  # Split on && and ; to check each segment
  while IFS= read -r segment; do
    # Trim leading whitespace
    segment=$(printf '%s' "$segment" | sed 's/^[[:space:]]*//')
    [[ -z "$segment" ]] && continue

    # ── JS ecosystem (always active) ──
    # pnpm add <pkg>, pnpm i <pkg> (NOT bare pnpm install)
    if printf '%s' "$segment" | grep -qE '^\s*pnpm\s+(add|i)\s+'; then
      local pkgs
      pkgs=$(printf '%s' "$segment" | sed -E 's/^[[:space:]]*pnpm[[:space:]]+(add|i)[[:space:]]+//' | tr ' ' '\n' | grep -vE '^-' | head -5)
      for p in $pkgs; do
        # Strip version specifier (@version)
        p=$(printf '%s' "$p" | sed -E 's/@[^/].*$//')
        [[ -n "$p" ]] && results="${results}js:${p}\n"
      done
    # npm install <pkg>, npm i <pkg>, npm add <pkg>
    elif printf '%s' "$segment" | grep -qE '^\s*npm\s+(install|i|add)\s+'; then
      # Skip bare "npm install" (no package = lockfile install)
      if printf '%s' "$segment" | grep -qE '^\s*npm\s+(install|i)\s*$'; then
        continue
      fi
      local pkgs
      pkgs=$(printf '%s' "$segment" | sed -E 's/^[[:space:]]*npm[[:space:]]+(install|i|add)[[:space:]]+//' | tr ' ' '\n' | grep -vE '^-' | head -5)
      for p in $pkgs; do
        p=$(printf '%s' "$p" | sed -E 's/@[^/].*$//')
        [[ -n "$p" ]] && results="${results}js:${p}\n"
      done
    # yarn add <pkg>
    elif printf '%s' "$segment" | grep -qE '^\s*yarn\s+add\s+'; then
      local pkgs
      pkgs=$(printf '%s' "$segment" | sed -E 's/^[[:space:]]*yarn[[:space:]]+add[[:space:]]+//' | tr ' ' '\n' | grep -vE '^-' | head -5)
      for p in $pkgs; do
        p=$(printf '%s' "$p" | sed -E 's/@[^/].*$//')
        [[ -n "$p" ]] && results="${results}js:${p}\n"
      done
    # bun add <pkg>, bun i <pkg>
    elif printf '%s' "$segment" | grep -qE '^\s*bun\s+(add|i)\s+'; then
      local pkgs
      pkgs=$(printf '%s' "$segment" | sed -E 's/^[[:space:]]*bun[[:space:]]+(add|i)[[:space:]]+//' | tr ' ' '\n' | grep -vE '^-' | head -5)
      for p in $pkgs; do
        p=$(printf '%s' "$p" | sed -E 's/@[^/].*$//')
        [[ -n "$p" ]] && results="${results}js:${p}\n"
      done
    # npx <pkg> — high risk: installs and executes
    elif printf '%s' "$segment" | grep -qE '^\s*npx\s+'; then
      local pkg
      pkg=$(printf '%s' "$segment" | sed -E 's/^[[:space:]]*npx[[:space:]]+(-p[[:space:]]+)?//' | awk '{print $1}' | sed -E 's/@[^/].*$//')
      [[ -n "$pkg" ]] && results="${results}js:${pkg}\n"
    # bunx <pkg> / bun x <pkg> — high risk
    elif printf '%s' "$segment" | grep -qE '^\s*(bunx|bun\s+x)\s+'; then
      local pkg
      pkg=$(printf '%s' "$segment" | sed -E 's/^[[:space:]]*(bunx|bun[[:space:]]+x)[[:space:]]+//' | awk '{print $1}' | sed -E 's/@[^/].*$//')
      [[ -n "$pkg" ]] && results="${results}js:${pkg}\n"

    # ── Python ecosystem ──
    elif echo "$ECOSYSTEMS" | grep -q "python"; then
      # pip install <pkg>, pip3 install <pkg>
      if printf '%s' "$segment" | grep -qE '^\s*pip3?\s+install\s+'; then
        # Skip -r requirements.txt installs
        if printf '%s' "$segment" | grep -qE '\s+-r\s+'; then
          continue
        fi
        local pkgs
        pkgs=$(printf '%s' "$segment" | sed -E 's/^[[:space:]]*pip3?[[:space:]]+install[[:space:]]+//' | tr ' ' '\n' | grep -vE '^-' | head -5)
        for p in $pkgs; do
          p=$(printf '%s' "$p" | sed -E 's/[>=<!\[].*$//')
          [[ -n "$p" ]] && results="${results}python:${p}\n"
        done
      # uv add <pkg>, uv pip install <pkg>
      elif printf '%s' "$segment" | grep -qE '^\s*uv\s+(add|pip\s+install)\s+'; then
        local pkgs
        pkgs=$(printf '%s' "$segment" | sed -E 's/^[[:space:]]*uv[[:space:]]+(add|pip[[:space:]]+install)[[:space:]]+//' | tr ' ' '\n' | grep -vE '^-' | head -5)
        for p in $pkgs; do
          p=$(printf '%s' "$p" | sed -E 's/[>=<!\[].*$//')
          [[ -n "$p" ]] && results="${results}python:${p}\n"
        done
      # poetry add <pkg>
      elif printf '%s' "$segment" | grep -qE '^\s*poetry\s+add\s+'; then
        local pkgs
        pkgs=$(printf '%s' "$segment" | sed -E 's/^[[:space:]]*poetry[[:space:]]+add[[:space:]]+//' | tr ' ' '\n' | grep -vE '^-' | head -5)
        for p in $pkgs; do
          p=$(printf '%s' "$p" | sed -E 's/[>=<!\[].*$//')
          [[ -n "$p" ]] && results="${results}python:${p}\n"
        done
      # conda install <pkg>
      elif printf '%s' "$segment" | grep -qE '^\s*conda\s+install\s+'; then
        local pkgs
        pkgs=$(printf '%s' "$segment" | sed -E 's/^[[:space:]]*conda[[:space:]]+install[[:space:]]+//' | tr ' ' '\n' | grep -vE '^-' | head -5)
        for p in $pkgs; do
          p=$(printf '%s' "$p" | sed -E 's/[>=<!\[].*$//')
          [[ -n "$p" ]] && results="${results}python:${p}\n"
        done
      # pipx install <pkg> / pipx run <pkg> — high risk
      elif printf '%s' "$segment" | grep -qE '^\s*pipx\s+(install|run)\s+'; then
        local pkg
        pkg=$(printf '%s' "$segment" | sed -E 's/^[[:space:]]*pipx[[:space:]]+(install|run)[[:space:]]+//' | awk '{print $1}' | sed -E 's/[>=<!\[].*$//')
        [[ -n "$pkg" ]] && results="${results}python:${pkg}\n"
      fi

    # ── Rust ecosystem ──
    elif echo "$ECOSYSTEMS" | grep -q "rust"; then
      if printf '%s' "$segment" | grep -qE '^\s*cargo\s+(add|install)\s+'; then
        local pkgs
        pkgs=$(printf '%s' "$segment" | sed -E 's/^[[:space:]]*cargo[[:space:]]+(add|install)[[:space:]]+//' | tr ' ' '\n' | grep -vE '^-' | head -5)
        for p in $pkgs; do
          p=$(printf '%s' "$p" | sed -E 's/@.*$//')
          [[ -n "$p" ]] && results="${results}rust:${p}\n"
        done
      fi

    # ── Go ecosystem ──
    elif echo "$ECOSYSTEMS" | grep -q "go"; then
      if printf '%s' "$segment" | grep -qE '^\s*go\s+(get|install)\s+'; then
        local pkgs
        pkgs=$(printf '%s' "$segment" | sed -E 's/^[[:space:]]*go[[:space:]]+(get|install)[[:space:]]+//' | tr ' ' '\n' | grep -vE '^-' | head -5)
        for p in $pkgs; do
          p=$(printf '%s' "$p" | sed -E 's/@.*$//')
          [[ -n "$p" ]] && results="${results}go:${p}\n"
        done
      fi
    fi
  done <<< "$(printf '%s' "$cmd" | sed 's/&&/\n/g; s/;/\n/g')"

  printf '%b' "$results"
}

INSTALLS=$(extract_install "$COMMAND")
[[ -z "$INSTALLS" ]] && exit 0

# ─── Check banned list ───────────────────────────────────────────
if [[ ! -f "$BANNED_FILE" ]]; then
  printf '%s warning: banned-packages.json not found at %s\n' "$TAG" "$BANNED_FILE" >&2
  exit 0
fi

VIOLATIONS=""

while IFS= read -r entry; do
  [[ -z "$entry" ]] && continue

  ECO=$(printf '%s' "$entry" | cut -d: -f1)
  PKG=$(printf '%s' "$entry" | cut -d: -f2-)

  # Check banned list
  BANNED_ENTRY=$(jq -r --arg eco "$ECO" --arg pkg "$PKG" '.[$eco][$pkg] // empty' "$BANNED_FILE" 2>/dev/null)

  if [[ -n "$BANNED_ENTRY" ]]; then
    SEVERITY=$(printf '%s' "$BANNED_ENTRY" | jq -r '.severity // "unknown"')
    REASON=$(printf '%s' "$BANNED_ENTRY" | jq -r '.reason // "No reason provided"')
    ALTS=$(printf '%s' "$BANNED_ENTRY" | jq -r '.alternatives // [] | join(", ")')

    VIOLATIONS="${VIOLATIONS}\n- [$SEVERITY] $PKG ($ECO): $REASON"
    if [[ -n "$ALTS" ]]; then
      VIOLATIONS="${VIOLATIONS}\n  Alternatives: $ALTS"
    fi
    continue
  fi

  # ─── Live advisory lookup (JS packages only, v1) ────────────────
  if [[ "$ECO" == "js" ]]; then
    # Check cache first (24h TTL)
    PKG_HASH=$(printf '%s' "$PKG" | shasum -a 256 | cut -c1-16)
    CACHE_FILE="/tmp/sentinel-advisory-${PKG_HASH}"

    if [[ -f "$CACHE_FILE" ]]; then
      NOW=$(date +%s)
      if [[ "$OSTYPE" == darwin* ]]; then
        CACHE_MTIME=$(stat -f "%m" "$CACHE_FILE" 2>/dev/null || echo 0)
      else
        CACHE_MTIME=$(stat -c "%Y" "$CACHE_FILE" 2>/dev/null || echo 0)
      fi
      CACHE_AGE=$(( NOW - CACHE_MTIME ))

      if [[ "$CACHE_AGE" -lt 86400 ]]; then
        CACHED=$(cat "$CACHE_FILE")
        if [[ "$CACHED" == "CRITICAL:"* ]]; then
          VIOLATIONS="${VIOLATIONS}\n- $CACHED"
        fi
        continue
      fi
    fi

    # Query npm bulk advisory API
    ADVISORY_RESPONSE=$(curl -s -X POST "https://registry.npmjs.org/-/npm/v1/security/advisories/bulk" \
      -H "Content-Type: application/json" \
      -d "{\"$PKG\": [\"*\"]}" \
      --connect-timeout 2 --max-time 5 2>/dev/null) || {
      printf '%s warning: npm advisory API unreachable for %s (offline?)\n' "$TAG" "$PKG" >&2
      echo "PASS" > "$CACHE_FILE"
      continue
    }

    # Check if response contains advisories (non-empty object)
    ADVISORY_COUNT=$(printf '%s' "$ADVISORY_RESPONSE" | jq 'length' 2>/dev/null || echo 0)

    if [[ "$ADVISORY_COUNT" -gt 0 ]]; then
      # Extract highest severity
      HIGHEST=$(printf '%s' "$ADVISORY_RESPONSE" | jq -r '
        [.[] | .[].severity] |
        if any(. == "critical") then "critical"
        elif any(. == "high") then "high"
        elif any(. == "moderate") then "moderate"
        else "low" end
      ' 2>/dev/null || echo "unknown")

      TITLE=$(printf '%s' "$ADVISORY_RESPONSE" | jq -r '[.[] | .[].title] | first // "security advisory"' 2>/dev/null || echo "security advisory")

      if [[ "$HIGHEST" == "critical" ]] || [[ "$HIGHEST" == "high" ]]; then
        RESULT="CRITICAL: [$HIGHEST] $PKG (js): $ADVISORY_COUNT active advisory(ies) -- $TITLE. Run \`pnpm audit\` for details."
        echo "$RESULT" > "$CACHE_FILE"
        VIOLATIONS="${VIOLATIONS}\n- $RESULT"
      else
        # Low/moderate — warn but don't block
        printf '%s info: %s has %s %s-severity advisory(ies). Not blocking, but review with /sentinel:audit-deps.\n' \
          "$TAG" "$PKG" "$ADVISORY_COUNT" "$HIGHEST" >&2
        echo "PASS" > "$CACHE_FILE"
      fi
    else
      echo "PASS" > "$CACHE_FILE"
    fi
  fi
done <<< "$INSTALLS"

# ─── Report ──────────────────────────────────────────────────────
if [[ -n "$VIOLATIONS" ]]; then
  printf '%s BLOCKED package installation:\n' "$TAG" >&2
  printf '%b\n' "$VIOLATIONS" >&2
  printf '\nTo install a safe alternative, use the recommended packages listed above.\n' >&2
  printf 'If you believe this is a false positive, check sentinel/data/banned-packages.json.\n' >&2
  exit 2
fi

exit 0
