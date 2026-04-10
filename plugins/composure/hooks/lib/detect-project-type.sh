#!/bin/bash
# ============================================================
# Detect Project Type — Shared Library
# ============================================================
# Classifies the working directory as one of:
#   workspace — contains multiple projects (e.g., ~/Projects)
#   monorepo  — single git repo with workspaces
#   project   — single git repo with a stack file
#   folder    — plain directory, no git, no stack
#
# Also detects whether Claude has session history here
# (CLAUDE.md / project memory exists) so Cortex can inject
# global identity regardless of project type.
#
# Writes result to /tmp/ for cross-hook access (PreToolUse
# hooks read it without re-detecting).
#
# Usage:
#   PROJECT_DIR="${CLAUDE_PROJECT_DIR:-.}"
#   source "${SCRIPT_DIR}/../lib/detect-project-type.sh"
#
# Sets:
#   PROJECT_TYPE        — workspace|monorepo|project|folder
#   HAS_CLAUDE_HISTORY  — 1 if Claude has worked here before
#   PROJECT_TYPE_FILE   — path to the cached type file
#
# Constraints: <500ms. Pure bash, no node.
# ============================================================

PROJECT_TYPE="folder"
HAS_CLAUDE_HISTORY=0

_PT_DIR="${PROJECT_DIR:-.}"

# ── Compute cache key (macOS + Linux compatible) ────────────
if command -v md5 >/dev/null 2>&1; then
  _PT_HASH=$(echo -n "$_PT_DIR" | md5 -q)
elif command -v md5sum >/dev/null 2>&1; then
  _PT_HASH=$(echo -n "$_PT_DIR" | md5sum | cut -d' ' -f1)
else
  _PT_HASH=$(echo -n "$_PT_DIR" | cksum | cut -d' ' -f1)
fi
PROJECT_TYPE_FILE="/tmp/composure-project-type-${_PT_HASH}"

# ── Check cache (survives within session, cleared on reboot) ──
if [ -f "$PROJECT_TYPE_FILE" ]; then
  PROJECT_TYPE=$(cat "$PROJECT_TYPE_FILE")
else
  # ── Detection: git presence determines first branch ─────────
  if [ -d "${_PT_DIR}/.git" ]; then
    # Has git — check for workspace markers → monorepo or project
    if [ -f "${_PT_DIR}/pnpm-workspace.yaml" ] || \
       [ -f "${_PT_DIR}/turbo.json" ] || \
       [ -f "${_PT_DIR}/nx.json" ] || \
       [ -f "${_PT_DIR}/lerna.json" ]; then
      PROJECT_TYPE="monorepo"
    elif [ -f "${_PT_DIR}/package.json" ] && grep -q '"workspaces"' "${_PT_DIR}/package.json" 2>/dev/null; then
      PROJECT_TYPE="monorepo"
    else
      PROJECT_TYPE="project"
    fi
  else
    # No git — count subdirs that look like projects
    _PROJ_COUNT=0
    for _subdir in "${_PT_DIR}"/*/; do
      [ ! -d "$_subdir" ] && continue
      if [ -d "${_subdir}.git" ] || [ -f "${_subdir}package.json" ] || \
         [ -f "${_subdir}go.mod" ] || [ -f "${_subdir}Cargo.toml" ]; then
        _PROJ_COUNT=$((_PROJ_COUNT + 1))
        [ "$_PROJ_COUNT" -ge 3 ] && break
      fi
    done

    if [ "$_PROJ_COUNT" -ge 3 ]; then
      PROJECT_TYPE="workspace"
    else
      PROJECT_TYPE="folder"
    fi
  fi

  # Write cache
  echo "$PROJECT_TYPE" > "$PROJECT_TYPE_FILE" 2>/dev/null
fi

# ── Check Claude session history ────────────────────────────
# Claude Code stores project memory at:
#   ~/.claude/projects/-Users-name-Projects/memory/
# Path format: absolute path with / replaced by -
_ABS_DIR=$(cd "$_PT_DIR" 2>/dev/null && pwd)
if [ -n "$_ABS_DIR" ]; then
  _CLAUDE_PATH=$(echo "$_ABS_DIR" | tr '/' '-')
  if [ -d "${HOME}/.claude/projects/${_CLAUDE_PATH}" ]; then
    HAS_CLAUDE_HISTORY=1
  fi
fi
