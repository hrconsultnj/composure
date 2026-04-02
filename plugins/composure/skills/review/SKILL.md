---
name: review
description: Review only changes since last commit using impact analysis. Token-efficient delta review with automatic blast-radius detection.
argument-hint: "[file or function name]"
---

# Review Delta

Perform a focused, token-efficient code review of only the changed code and its blast radius.

## Prerequisites

The `composure-graph` MCP server must be running. It is **bundled with the Composure plugin** — do NOT try to `npm install` it. If MCP tools are unavailable when you call `build_or_update_graph`, run the auto-fix from `/composure:initialize` Step 0a:
1. **A.** `node --version` — must be >= 22.5.0
2. **B.** Find plugin path via `claude plugin list --json`, register server: `claude mcp add composure-graph -- node --experimental-sqlite "$COMPOSURE_PATH/graph/dist/server.js"`
3. **C.** If plugin not installed → tell user to install it
Tell user to restart Claude Code (Ctrl+C then `claude`) after registering. **STOP.** Do not proceed without the graph.

## Steps

1. **Ensure the graph is current** by calling `build_or_update_graph()` (incremental update).

2. **Get review context** by calling `get_review_context()`. This returns:
   - Changed files (auto-detected from git diff)
   - Impacted nodes and files (blast radius)
   - Source code snippets for changed areas
   - Review guidance (test coverage gaps, wide impact warnings)

3. **Analyze the blast radius** by reviewing the `impacted_nodes` and `impacted_files` in the context. Focus on:
   - Functions whose callers changed (may need signature/behavior verification)
   - Files with many dependents (high-risk changes)

4. **Perform the review** using the context. For each changed file:
   - Review the source snippet for correctness, style, and potential bugs
   - Check if impacted callers/dependents need updates
   - Verify test coverage using `query_graph({ pattern: "tests_for", target: <function_name> })`
   - Flag any untested changed functions
   - Use `find_large_functions()` to catch new size violations

5. **Report findings** in a structured format:
   - **Summary**: One-line overview of the changes
   - **Risk level**: Low / Medium / High (based on blast radius)
   - **Issues found**: Bugs, style issues, missing tests
   - **Blast radius**: List of impacted files/functions
   - **Recommendations**: Actionable suggestions

## Advantages Over Full-Repo Review

- Only sends changed + impacted code to the model (5-10x fewer tokens)
- Automatically identifies blast radius without manual file searching
- Provides structural context (who calls what)
- Flags untested functions automatically
