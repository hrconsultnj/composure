#!/bin/bash
# ============================================================
# Shipyard Init Check — SessionStart Hook
# ============================================================
# Checks if Shipyard has been initialized in this project.
# If not, suggests running /shipyard:initialize.
# Also checks for sibling plugin opportunities.
# Non-blocking (exit 0 always). Runs on startup only.

# Check if .claude/shipyard.json exists in the project
if [ ! -f ".claude/shipyard.json" ]; then
  printf '[shipyard] Not initialized in this project. Run /shipyard:initialize to detect your CI/CD setup and deployment target.\n'
fi

# Sibling plugin suggestions: if Composure is initialized but Sentinel is not, suggest it
if [ -f ".claude/no-bandaids.json" ] && [ ! -f ".claude/sentinel.json" ]; then
  printf '[shipyard] Composure detected but Sentinel is not initialized. Run /sentinel:initialize for security scanning.\n'
fi

exit 0
