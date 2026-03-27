#!/bin/bash
# ============================================================
# Composure Init Check — SessionStart Hook
# ============================================================
# Checks if Composure has been initialized in this project.
# If not, suggests running /composure:initialize.
# Non-blocking (exit 0 always). Runs on startup only.

# Check if .claude/no-bandaids.json exists in the project
if [ ! -f ".claude/no-bandaids.json" ]; then
  printf '[composure] Not initialized in this project. Run /composure:initialize to detect your stack, build the code graph, and generate framework reference docs.\n'
fi

# Check if sibling plugins need initialization
if [ -f ".claude/no-bandaids.json" ]; then
  # Sentinel installed but not initialized?
  if command -v claude >/dev/null 2>&1; then
    if claude plugin list 2>/dev/null | grep -q "sentinel" && [ ! -f ".claude/sentinel.json" ]; then
      printf '[composure] Sentinel plugin is installed but not initialized here. Run /sentinel:initialize for security scanning.\n'
    fi
  fi
fi

exit 0
