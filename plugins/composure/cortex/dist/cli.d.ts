#!/usr/bin/env node
/**
 * CLI transport for Composure Cortex — Door 4.
 *
 * Usage: node cli.js <command> [json-args]
 *
 * Examples:
 *   node cli.js sequential_think '{"thought":"Step 1","agent_id":"..."}'
 *   node cli.js get_thinking_session '{"session_id":"..."}'
 *   node cli.js search_memory '{"agent_id":"...","query":"auth"}'
 *   node cli.js create_memory_node '{"agent_id":"...","content":"..."}'
 *
 * Output: JSON to stdout. Errors to stderr. Exit 0 = ok, 1 = error.
 */
export {};
