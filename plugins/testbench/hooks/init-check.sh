#!/bin/bash
# ============================================================
# Testbench Init Check — SessionStart Hook
# ============================================================
# Non-blocking (exit 0 always). Runs on startup only.

# If Composure is installed, it handles the unified init message — skip ours
[ -f ".claude/no-bandaids.json" ] && exit 0

# Standalone mode (Testbench without Composure)
if [ ! -f ".claude/testbench.json" ]; then
  printf '[testbench] Not initialized in this project. Run /testbench:initialize to detect your test framework and conventions.\n'
fi

exit 0
