---
name: view-graph
description: Launch the interactive code review graph visualization. Extracts live data from the graph DB and opens the Vite React app in a browser.
argument-hint: "[--build-only]"
---

# View Graph

Launch the interactive graph visualization app with live data from the code review graph.

## How It Works

The graph app (`app/`) is a Vite React application that reads data extracted from the SQLite graph database. Running `/view-graph` does three things:

1. **Extract data** from `.code-review-graph/graph.db` → `app/public/graph-data.json`
2. **Start the Vite dev server** on port 5173
3. **Open the browser** to http://localhost:5173

## Steps

1. **Ensure the graph exists** by calling the `list_graph_stats` MCP tool.
   - If `total_nodes` is 0 or `last_updated` is null, tell the user to run `/build-graph` first.

2. **Extract graph data** by running:
   ```bash
   cd app && node scripts/extract-graph.js
   ```
   This reads the SQLite DB and writes `public/graph-data.json` with all files, entities (functions, types, classes), edges, and auto-discovered categories.

3. **Start the dev server** (if not already running):
   ```bash
   cd app && pnpm dev
   ```
   The `predev` script auto-extracts data and kills stale processes on port 5173.

4. **Open in browser:**
   ```bash
   open http://localhost:5173  # macOS
   ```

5. **Report:**
   ```
   Graph visualization running at http://localhost:5173

   Data: {N} files, {M} entities, {K} edges, {C} categories
   Last updated: {timestamp}

   Features:
   - Explorer: file tree with search
   - Graph: category columns with import edges
   - Legend: toggle categories on/off
   - Click any file for details (imports, imported-by, blast radius, entities)
   ```

## Arguments

- `--build-only` — extract data and build `app/dist/` without starting the dev server. Useful for deploying the visualization as a static site.

## What It Shows

- **Files** grouped by auto-detected category (Pages, API Routes, Components, Hooks, Queries, Actions, etc.)
- **Entities** (functions, types, classes) nested under each file
- **Import relationships** as bezier curves
- **Blast radius** — BFS from selected node shows impact
- **Category legend** — toggle visibility per category
- **Search** — filter by filename or path
- **Zoom** — Ctrl+scroll or buttons

## Notes

- Categories are auto-discovered from file paths — not hardcoded
- Entity data comes from tree-sitter AST parsing in the graph DB
- The app persists your active view (explorer/graph/legend) across refreshes
- Port 5173 is used by default. If occupied, the predev script kills stale processes.
- For production/static hosting: `cd app && pnpm build` outputs to `app/dist/`
