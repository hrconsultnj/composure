---
name: view-graph
description: Open the code review graph visualization in the browser. Regenerates the HTML if the graph has been updated since last generation.
---

Open the standalone graph visualization in the browser. No dev server needed — the visualization is a self-contained HTML file.

## Content Loading

This skill's content is cached locally. Read steps from cache first, fetch only if missing:

```bash
"~/.composure/bin/composure-fetch.mjs" skill composure view-graph {step-filename}
```

**Read from `~/.composure/cache/composure/skills/view-graph/` first.** Only run the fetch command above if the cached file is missing.
