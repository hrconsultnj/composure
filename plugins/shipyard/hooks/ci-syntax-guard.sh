#!/usr/bin/env bash
set -euo pipefail

# ci-syntax-guard.sh — PreToolUse hook that validates CI config syntax on Edit|Write.
# Only triggers on CI/CD config files. Skips everything else immediately.
# Uses actionlint for GitHub Actions when available, falls back to YAML syntax check.
#
# Exit codes:
#   0 = pass (no issues, non-CI file, or infrastructure error)
#   2 = BLOCK (CI config has syntax errors)

TAG="[shipyard:ci-syntax]"

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
DIRPATH=$(dirname "$FILE_PATH")
DIRNAME=$(basename "$DIRPATH")
GRANDPARENT=$(basename "$(dirname "$DIRPATH")")

# ─── Determine CI platform from file path ────────────────────────
CI_PLATFORM=""

# GitHub Actions: .github/workflows/*.yml or .github/workflows/*.yaml
if [[ "$GRANDPARENT" == ".github" && "$DIRNAME" == "workflows" ]]; then
  case "$BASENAME" in
    *.yml|*.yaml) CI_PLATFORM="github-actions" ;;
  esac
fi

# GitLab CI
[[ "$BASENAME" == ".gitlab-ci.yml" ]] && CI_PLATFORM="gitlab-ci"

# Bitbucket Pipelines
[[ "$BASENAME" == "bitbucket-pipelines.yml" ]] && CI_PLATFORM="bitbucket"

# Jenkins
[[ "$BASENAME" == "Jenkinsfile" ]] && CI_PLATFORM="jenkins"

# CircleCI
if [[ "$DIRNAME" == ".circleci" && "$BASENAME" == "config.yml" ]]; then
  CI_PLATFORM="circleci"
fi

# Not a CI config file — skip immediately
[[ -z "$CI_PLATFORM" ]] && exit 0

# ─── Write content to temp file for validation ───────────────────
TMPFILE=$(mktemp "/tmp/shipyard-ci-XXXXXX")
trap 'rm -f "$TMPFILE"' EXIT

# For Edit operations we validate the new_string fragment; for Write we have the full file.
# Either way, write to temp for tooling.
printf '%s' "$CONTENT" > "$TMPFILE"

# ─── GitHub Actions: actionlint or YAML fallback ─────────────────
if [[ "$CI_PLATFORM" == "github-actions" ]]; then
  if command -v actionlint >/dev/null 2>&1; then
    # actionlint only works on full workflow files; for Edit (partial), fall back to YAML check
    if [[ "$TOOL_NAME" == "Write" ]]; then
      ERRORS=$(actionlint "$TMPFILE" 2>&1) || true
      if [[ -n "$ERRORS" ]]; then
        printf '%s BLOCKED: GitHub Actions workflow has syntax errors:\n%s\n' "$TAG" "$ERRORS" >&2
        exit 2
      fi
    else
      # Edit — partial content, just do YAML syntax check on the fragment
      if command -v python3 >/dev/null 2>&1; then
        YAML_ERR=$(python3 -c "import yaml, sys; yaml.safe_load(open(sys.argv[1]))" "$TMPFILE" 2>&1) || {
          printf '%s BLOCKED: YAML syntax error in GitHub Actions workflow fragment:\n%s\n' "$TAG" "$YAML_ERR" >&2
          exit 2
        }
      fi
    fi
  else
    # No actionlint — fall back to basic YAML syntax check
    if command -v python3 >/dev/null 2>&1; then
      YAML_ERR=$(python3 -c "import yaml, sys; yaml.safe_load(open(sys.argv[1]))" "$TMPFILE" 2>&1) || {
        printf '%s BLOCKED: YAML syntax error in GitHub Actions workflow:\n%s\n' "$TAG" "$YAML_ERR" >&2
        exit 2
      }
    fi
  fi
  exit 0
fi

# ─── Jenkins: not YAML, skip syntax validation ───────────────────
if [[ "$CI_PLATFORM" == "jenkins" ]]; then
  # Jenkinsfile is Groovy — no simple syntax check available
  exit 0
fi

# ─── Other CI platforms: basic YAML syntax validation ─────────────
if command -v python3 >/dev/null 2>&1; then
  YAML_ERR=$(python3 -c "import yaml, sys; yaml.safe_load(open(sys.argv[1]))" "$TMPFILE" 2>&1) || {
    printf '%s BLOCKED: YAML syntax error in %s config:\n%s\n' "$TAG" "$CI_PLATFORM" "$YAML_ERR" >&2
    exit 2
  }
fi

exit 0
