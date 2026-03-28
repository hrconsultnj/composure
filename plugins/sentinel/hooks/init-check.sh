#!/bin/bash
# ============================================================
# Sentinel Init Check — SessionStart Hook
# ============================================================
# Non-blocking (exit 0 always). Runs on startup only.

# If Composure is installed, it handles the unified init message — skip ours
[ -f ".claude/no-bandaids.json" ] && exit 0

# Standalone mode (Sentinel without Composure)
if [ ! -f ".claude/sentinel.json" ]; then
  printf '[sentinel] Not initialized in this project. Run /sentinel:initialize to detect your stack and set up security scanning.\n'
fi

exit 0
