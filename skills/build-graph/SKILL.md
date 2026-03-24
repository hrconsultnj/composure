---
name: build-graph
description: Build or update the code review knowledge graph, generate the visualization, and open it. Run this first to initialize, or let hooks keep it updated automatically.
argument-hint: "[full] [--no-open]"
---

# Build Graph

Build or incrementally update the persistent code knowledge graph, generate a standalone HTML visualization, and open it in the browser.

## Steps

1. **Check graph status** by calling the `list_graph_stats` MCP tool.
   - If the graph has never been built (`last_updated` is null), proceed with a full build.
   - If the graph exists, proceed with an incremental update.

2. **Build the graph** by calling the `build_or_update_graph` MCP tool:
   - For first-time setup: `build_or_update_graph({ full_rebuild: true })`
   - For updates: `build_or_update_graph()` (incremental by default)
   - If the user passes argument `full`: `build_or_update_graph({ full_rebuild: true })`

3. **Verify** by calling `list_graph_stats` again and report:
   - Files parsed, nodes and edges created
   - Languages detected
   - Any errors encountered

4. **Generate visualization** by calling the `generate_graph_html` MCP tool:
   - Produces a self-contained `.html` file at `.code-review-graph/graph.html`
   - The file works offline — all CSS/JS/data inlined, zero external dependencies

5. **Open in browser** (unless `--no-open` is passed):
   ```bash
   open .code-review-graph/graph.html  # macOS
   ```

## Arguments

- `full` — Force a full rebuild (re-parse all files instead of incremental)
- `--no-open` — Build and generate visualization but don't open the browser

## When to Use

- First time setting up the graph for a repository
- After major refactoring or branch switches
- The graph auto-updates via PostToolUse hooks on Edit/Write, so manual builds are rarely needed

## Notes

- Graph stored at `.code-review-graph/graph.db` (auto-gitignored)
- Visualization at `.code-review-graph/graph.html` (auto-gitignored)
- Supports: TypeScript, TSX, JavaScript, JSX, Python, Go, Rust, C/C++
- Incremental builds only re-parse changed files + their dependents
- To just view the existing visualization without rebuilding, use `/view-graph`
