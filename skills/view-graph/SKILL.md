---
name: view-graph
description: Open the code review graph visualization in the browser. Regenerates the HTML if the graph has been updated since last generation.
---

# View Graph

Open the standalone graph visualization in the browser. No dev server needed — the visualization is a self-contained HTML file.

## Steps

1. **Check if the visualization exists** at `.code-review-graph/graph.html`.

2. **Check if it's stale** by calling the `list_graph_stats` MCP tool.
   - If `total_nodes` is 0 or `last_updated` is null → tell the user to run `/build-graph` first.
   - If the HTML file doesn't exist or is older than `last_updated` → regenerate it by calling the `generate_graph_html` MCP tool.
   - If the HTML file exists and is current → skip regeneration.

3. **Open in browser:**
   ```bash
   open .code-review-graph/graph.html  # macOS
   ```

4. **Report:**
   ```
   Graph visualization opened: .code-review-graph/graph.html

   Data: {N} files, {M} nodes, {K} edges
   Last updated: {timestamp}
   ```

## What It Shows

- **Files** grouped by auto-detected category (Pages, API Routes, Components, Hooks, Queries, Actions, etc.)
- **Entities** (functions, types, classes) nested under each file
- **Import relationships** as bezier curves
- **Blast radius** — BFS from selected node shows impact
- **Category legend** — toggle visibility per category
- **Search** — filter by filename or path
- **Zoom** — Ctrl+scroll or buttons

## Notes

- The HTML file is fully self-contained — all CSS/JS/data inlined, works offline
- To rebuild the graph AND regenerate the visualization in one step, use `/build-graph`
- Categories are auto-discovered from file paths — not hardcoded
- Entity data comes from tree-sitter AST parsing in the graph DB
