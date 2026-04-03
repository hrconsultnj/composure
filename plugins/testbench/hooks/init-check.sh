#!/bin/bash
# ============================================================
# Testbench Init Check — SessionStart Hook
# ============================================================
# Non-blocking (exit 0 always). Runs on startup only.

# If Composure is installed, it handles the unified init message — skip ours
([ -f ".composure/no-bandaids.json" ] || [ -f ".claude/no-bandaids.json" ]) && exit 0

# Standalone mode (Testbench without Composure)
if [ ! -f ".composure/testbench.json" ] && [ ! -f ".claude/testbench.json" ]; then
  printf '[testbench] Not calibrated in this project. Run /testbench:calibrate to detect your test framework and conventions.\n'
fi

exit 0
