---
name: view-graph
description: Launch the interactive code review graph visualization. Extracts live data from the graph DB and opens the Vite React app in a browser.
argument-hint: "[--build-only]"
---

# View Graph

Launch the interactive graph visualization app with live data from the code review graph.

## How It Works

The graph app lives at `${CLAUDE_PLUGIN_ROOT}/app/` — a Vite React application bundled with the Composure plugin. It reads data extracted from the user's project graph database. Running `/view-graph` does three things:

1. **Extract data** from `{project}/.code-review-graph/graph.db` → `${CLAUDE_PLUGIN_ROOT}/app/public/graph-data.json`
2. **Start the Vite dev server** on port 5173
3. **Open the browser** to http://localhost:5173

> **Important**: The app directory is inside the plugin, NOT the user's project.
> In Next.js projects, `app/` is the App Router — never `cd app` from the project root.
> Always use the full plugin path: `${CLAUDE_PLUGIN_ROOT}/app/`

## Steps

1. **Resolve the plugin app path.** The `CLAUDE_PLUGIN_ROOT` environment variable points to the Composure plugin root. The visualization app is at `${CLAUDE_PLUGIN_ROOT}/app/`. If `CLAUDE_PLUGIN_ROOT` is not set, find it by checking where this skill file lives and going up two levels.

2. **Ensure the graph exists** by calling the `list_graph_stats` MCP tool.
   - If `total_nodes` is 0 or `last_updated` is null, tell the user to run `/build-graph` first.

3. **Extract graph data** by running:
   ```bash
   PROJECT_ROOT="$(pwd)" node "${CLAUDE_PLUGIN_ROOT}/app/scripts/extract-graph.js"
   ```
   The script reads the graph DB from `PROJECT_ROOT/.code-review-graph/graph.db` and writes `${CLAUDE_PLUGIN_ROOT}/app/public/graph-data.json`.

4. **Start the dev server** (if not already running):
   ```bash
   cd "${CLAUDE_PLUGIN_ROOT}/app" && pnpm dev
   ```
   The `predev` script auto-extracts data and kills stale processes on port 5173.

5. **Open in browser:**
   ```bash
   open http://localhost:5173  # macOS
   ```

6. **Report:**
   ```
   Graph visualization running at http://localhost:5173

   Data: {N} files, {M} entities, {K} edges, {C} categories
   Last updated: {timestamp}
   Source: {project_root}/.code-review-graph/graph.db

   Features:
   - Explorer: file tree with search
   - Graph: category columns with import edges
   - Legend: toggle categories on/off
   - Click any file for details (imports, imported-by, blast radius, entities)
   ```

## Arguments

- `--build-only` — extract data and build the static site without starting the dev server. Useful for deploying the visualization.

## What It Shows

- **Files** grouped by auto-detected category (Pages, API Routes, Components, Hooks, Queries, Actions, etc.)
- **Entities** (functions, types, classes) nested under each file
- **Import relationships** as bezier curves
- **Blast radius** — BFS from selected node shows impact
- **Category legend** — toggle visibility per category
- **Search** — filter by filename or path
- **Zoom** — Ctrl+scroll or buttons

## Notes

- The app is part of the plugin (`${CLAUDE_PLUGIN_ROOT}/app/`), not the user's project
- Categories are auto-discovered from file paths — not hardcoded
- Entity data comes from tree-sitter AST parsing in the graph DB
- The app persists your active view (explorer/graph/legend) across refreshes
- Port 5173 is used by default. If occupied, the predev script kills stale processes
- For static hosting: `cd "${CLAUDE_PLUGIN_ROOT}/app" && pnpm build` outputs to `dist/`
