#!/usr/bin/env bash
set -euo pipefail

# dockerfile-guard.sh — PreToolUse hook that warns about Docker anti-patterns on Edit|Write.
# Only triggers on Dockerfile and docker-compose files. Skips everything else immediately.
# NON-BLOCKING: outputs warnings via stdout (systemMessage), never exits 2.
#
# Exit codes:
#   0 = always (warnings only, never blocks)

TAG="[shipyard:dockerfile]"

# ─── Read tool input from stdin ──────────────────────────────────
INPUT=$(cat) || { printf '%s infrastructure error: failed to read stdin\n' "$TAG" >&2; exit 0; }
TOOL_NAME=$(printf '%s' "$INPUT" | jq -r '.tool_name' 2>/dev/null) || { printf '%s infrastructure error: jq unavailable\n' "$TAG" >&2; exit 0; }

# ─── Extract content being written ───────────────────────────────
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
PROJECT_DIR=$(dirname "$FILE_PATH")

# ─── Determine file type ─────────────────────────────────────────
FILE_TYPE=""

case "$BASENAME" in
  Dockerfile|Dockerfile.*) FILE_TYPE="dockerfile" ;;
  docker-compose.yml|docker-compose.yaml|compose.yml|compose.yaml) FILE_TYPE="compose" ;;
esac

# Not a Docker file — skip immediately
[[ -z "$FILE_TYPE" ]] && exit 0

WARNINGS=""

warn() {
  WARNINGS="${WARNINGS}\n  - $1"
}

# ─── Dockerfile checks ───────────────────────────────────────────
if [[ "$FILE_TYPE" == "dockerfile" ]]; then

  # No USER directive — container runs as root
  if ! printf '%s\n' "$CONTENT" | grep -qiE '^\s*USER\s+'; then
    warn "No USER directive -- container runs as root. Add USER to run as non-root."
  fi

  # Using :latest tag on base images
  if printf '%s\n' "$CONTENT" | grep -qiE '^\s*FROM\s+\S+:latest\b'; then
    warn "Base image uses :latest tag. Pin your base image version for reproducible builds."
  fi

  # FROM without any tag (implicitly latest)
  if printf '%s\n' "$CONTENT" | grep -qiE '^\s*FROM\s+[a-z][a-z0-9._/-]+\s*(AS\s|$)' | head -1 && \
     ! printf '%s\n' "$CONTENT" | grep -qiE '^\s*FROM\s+[a-z][a-z0-9._/-]+:[^\s]+'; then
    # More precise check: FROM lines without a colon (no tag specified)
    while IFS= read -r line; do
      # Skip empty lines and comments
      [[ -z "$line" || "$line" =~ ^[[:space:]]*# ]] && continue
      # Match FROM without a tag
      if printf '%s' "$line" | grep -qiE '^\s*FROM\s+[a-z][a-z0-9._/-]+\s*(AS\s|$)' && \
         ! printf '%s' "$line" | grep -qE ':'; then
        warn "FROM without version tag implies :latest. Pin your base image version."
        break
      fi
    done <<< "$(printf '%s\n' "$CONTENT" | grep -iE '^\s*FROM\s+')"
  fi

  # COPY . . before dependency install (poor layer caching)
  # Check if COPY . . appears before RUN npm/yarn/pnpm install or pip install
  COPY_ALL_LINE=0
  DEP_INSTALL_LINE=0
  LINE_NUM=0
  while IFS= read -r line; do
    LINE_NUM=$((LINE_NUM + 1))
    if [[ $COPY_ALL_LINE -eq 0 ]] && printf '%s' "$line" | grep -qE '^\s*COPY\s+\.\s+\.'; then
      COPY_ALL_LINE=$LINE_NUM
    fi
    if [[ $DEP_INSTALL_LINE -eq 0 ]] && printf '%s' "$line" | grep -qE '^\s*RUN\s+.*(npm install|yarn install|pnpm install|pip install)'; then
      DEP_INSTALL_LINE=$LINE_NUM
    fi
  done <<< "$CONTENT"

  if [[ $COPY_ALL_LINE -gt 0 && $DEP_INSTALL_LINE -gt 0 && $COPY_ALL_LINE -lt $DEP_INSTALL_LINE ]]; then
    warn "COPY . . before dependency install breaks layer caching. Copy package.json/lockfile first, install deps, then COPY the rest."
  fi

  # Too many EXPOSE statements (more than 2)
  EXPOSE_COUNT=$(printf '%s\n' "$CONTENT" | grep -ciE '^\s*EXPOSE\s+' || true)
  if [[ "$EXPOSE_COUNT" -gt 2 ]]; then
    warn "Multiple EXPOSE statements ($EXPOSE_COUNT found). Consider whether all ports are necessary."
  fi

  # No .dockerignore when writing a Dockerfile
  if [[ "$TOOL_NAME" == "Write" ]]; then
    # Walk up from the Dockerfile location to find .dockerignore
    DOCKERIGNORE_FOUND=false
    CHECK_DIR="$PROJECT_DIR"
    for _ in 1 2 3; do
      if [[ -f "$CHECK_DIR/.dockerignore" ]]; then
        DOCKERIGNORE_FOUND=true
        break
      fi
      CHECK_DIR=$(dirname "$CHECK_DIR")
    done
    if [[ "$DOCKERIGNORE_FOUND" == "false" ]]; then
      warn "No .dockerignore found. Create one to exclude node_modules, .git, .env, and other unnecessary files."
    fi
  fi

  # Run hadolint if available (full file writes only)
  if [[ "$TOOL_NAME" == "Write" ]] && command -v hadolint >/dev/null 2>&1; then
    TMPFILE=$(mktemp "/tmp/shipyard-docker-XXXXXX")
    trap 'rm -f "$TMPFILE"' EXIT
    printf '%s' "$CONTENT" > "$TMPFILE"
    HADOLINT_OUT=$(hadolint "$TMPFILE" 2>&1) || true
    if [[ -n "$HADOLINT_OUT" ]]; then
      warn "hadolint findings:\n$HADOLINT_OUT"
    fi
  fi
fi

# ─── Docker Compose checks ───────────────────────────────────────
if [[ "$FILE_TYPE" == "compose" ]]; then

  # privileged: true is a security risk
  if printf '%s\n' "$CONTENT" | grep -qE '^\s*privileged:\s*true'; then
    warn "privileged: true is a security risk. Remove unless absolutely required."
  fi

  # No restart policy (informational, not a warning)
  if ! printf '%s\n' "$CONTENT" | grep -qE '^\s*restart:\s*'; then
    WARNINGS="${WARNINGS}\n  - (info) No restart policy defined. Consider adding restart: unless-stopped for production services."
  fi
fi

# ─── Report ──────────────────────────────────────────────────────
if [[ -n "$WARNINGS" ]]; then
  printf '%s Warnings for %s:\n' "$TAG" "$BASENAME"
  printf '%b\n' "$WARNINGS"
fi

exit 0
