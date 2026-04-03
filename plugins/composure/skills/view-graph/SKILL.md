---
name: view-graph
description: Open the code review graph visualization in the browser. Regenerates the HTML if the graph has been updated since last generation.
---

Open the standalone graph visualization in the browser. No dev server needed — the visualization is a self-contained HTML file.

## Content Loading

This skill's content is served from the Composure API. Before reading a step, fetch it:

```bash
composure-fetch skill composure view-graph {step-filename}
```

Cached content is at `~/.composure/cache/composure/skills/view-graph/`. If cached, read directly from there.

