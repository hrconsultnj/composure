#!/bin/bash
# ============================================================
# Sentinel Init Check — SessionStart Hook
# ============================================================
# Non-blocking (exit 0 always). Runs on startup only.

# If Composure is installed, it handles the unified init message — skip init check
([ -f ".composure/no-bandaids.json" ] || [ -f ".claude/no-bandaids.json" ]) && COMPOSURE=1 || COMPOSURE=0

# Standalone mode (Sentinel without Composure)
if [ "$COMPOSURE" -eq 0 ] && [ ! -f ".composure/sentinel.json" ] && [ ! -f ".claude/sentinel.json" ]; then
  printf '[sentinel] Not assessed in this project. Run /sentinel:assess to detect your stack and set up security scanning.\n'
fi

# Semgrep availability check — runs regardless of Composure
if ! command -v semgrep &>/dev/null; then
  # Detect best install command from available system installers
  if command -v brew &>/dev/null; then
    INSTALL_CMD="brew install semgrep"
  elif command -v pipx &>/dev/null; then
    INSTALL_CMD="pipx install semgrep"
  elif command -v pip3 &>/dev/null; then
    INSTALL_CMD="pip3 install semgrep"
  elif command -v pip &>/dev/null; then
    INSTALL_CMD="pip install semgrep"
  else
    INSTALL_CMD="brew install semgrep"
  fi
  printf '[sentinel] Semgrep is not installed (optional — enables /sentinel:scan for OWASP static analysis). Use AskUserQuestion to ask if they would like to install it now (`%s`) or skip. If they agree, run the install command for them.\n' "$INSTALL_CMD"
fi

exit 0
