#!/usr/bin/env node
/**
 * CLI entry point for hook-triggered incremental graph updates.
 *
 * Usage: node dist/update.js --file <path>
 *
 * Designed to be called by the PostToolUse hook on Edit/Write events.
 * Exits 0 always (non-blocking for hooks).
 */
export {};
