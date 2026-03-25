---
name: review-pr
description: Review a PR or branch diff using the knowledge graph for full structural context. Outputs a structured review with blast-radius analysis.
argument-hint: "[PR number or branch name]"
---

# Review PR

Perform a comprehensive code review of a pull request using the knowledge graph.

## Prerequisites

The `composure-graph` MCP server must be running. It is **bundled with the Composure plugin** — do NOT try to `npm install` it. If MCP tools are unavailable when you call `build_or_update_graph`, diagnose:
1. Run `node --version` via Bash
2. If Node < 22.5.0: "composure-graph requires Node 22.5+ (for built-in SQLite). You have Node {version}. Update Node, then exit Claude Code (Ctrl+C) and reopen it with `claude`."
3. If Node >= 22.5.0: "Exit Claude Code (Ctrl+C) and reopen it with `claude` to restart the plugin's MCP server."
4. **STOP.** Do not proceed without the graph.

## Steps

1. **Identify the changes** for the PR:
   - If a PR number is provided, use `gh pr diff <number>` to get changed files
   - Otherwise auto-detect from the current branch vs main/master

2. **Update the graph** by calling `build_or_update_graph({ base: "main" })` to ensure the graph reflects the current state.

3. **Get the full review context** by calling `get_review_context({ base: "main" })`:
   - Returns changed files, impacted nodes, source snippets, review guidance

4. **Analyze impact** by calling `get_impact_radius({ base: "main" })`:
   - Review the blast radius across the entire PR
   - Identify high-risk areas (widely depended-upon code)

5. **Deep-dive each changed file**:
   - Read the full source of files with significant changes
   - Use `query_graph({ pattern: "callers_of", target: <func> })` for high-risk functions
   - Use `query_graph({ pattern: "tests_for", target: <func> })` to verify test coverage
   - Use `find_large_functions({ file_pattern: <changed_dir> })` to catch new violations

6. **Generate structured review output**:

   ```
   ## PR Review: <title>

   ### Summary
   <1-3 sentence overview>

   ### Risk Assessment
   - **Overall risk**: Low / Medium / High
   - **Blast radius**: X files, Y functions impacted
   - **Test coverage**: N changed functions covered / M total

   ### File-by-File Review
   #### <file_path>
   - Changes: <description>
   - Impact: <who depends on this>
   - Issues: <bugs, style, concerns>

   ### Missing Tests
   - <function_name> in <file> - no test coverage found

   ### Recommendations
   1. <actionable suggestion>
   ```

## Tips

- For large PRs, focus on the highest-impact files first (most dependents)
- Use `semantic_search_nodes` to find related code the PR might have missed
- Check if renamed/moved functions have updated all callers
