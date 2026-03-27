#!/bin/bash
# ============================================================
# Testbench Init Check — SessionStart Hook
# ============================================================
# Checks if Testbench has been initialized in this project.
# If not, suggests running /testbench:initialize.
# Non-blocking (exit 0 always). Runs on startup only.

# Check if .claude/testbench.json exists in the project
if [ ! -f ".claude/testbench.json" ]; then
  printf '[testbench] Not initialized in this project. Run /testbench:initialize to detect your test framework and conventions.\n'
fi

exit 0
