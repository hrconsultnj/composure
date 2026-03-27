#!/bin/bash
# ============================================================
# Sentinel Init Check — SessionStart Hook
# ============================================================
# Checks if Sentinel has been initialized in this project.
# If not, suggests running /sentinel:initialize.
# Non-blocking (exit 0 always). Runs on startup only.

# Check if .claude/sentinel.json exists in the project
if [ ! -f ".claude/sentinel.json" ]; then
  printf '[sentinel] Not initialized in this project. Run /sentinel:initialize to detect your stack and set up security scanning.\n'
fi

# Check if .claude/security/integrations.json exists
if [ -f ".claude/sentinel.json" ] && [ ! -f ".claude/security/integrations.json" ]; then
  printf '[sentinel] Integration detection not run. Run /sentinel:initialize --force to detect third-party services and generate security docs.\n'
fi

exit 0
