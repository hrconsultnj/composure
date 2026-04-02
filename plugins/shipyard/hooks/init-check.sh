#!/bin/bash
# ============================================================
# Shipyard Init Check — SessionStart Hook
# ============================================================
# Non-blocking (exit 0 always). Runs on startup only.

# If Composure is installed, it handles the unified init message — skip ours
[ -f ".claude/no-bandaids.json" ] && exit 0

# Standalone mode (Shipyard without Composure)
if [ ! -f ".claude/shipyard.json" ]; then
  printf '[shipyard] Not configured in this project. Run /shipyard:configure to detect your CI/CD setup and deployment target.\n'
fi

exit 0
