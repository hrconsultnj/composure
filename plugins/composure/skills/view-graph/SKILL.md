---
name: view-graph
description: Open the code review graph visualization in the browser. Regenerates the HTML if the graph has been updated since last generation.
---

Open the standalone graph visualization in the browser. No dev server needed — the visualization is a self-contained HTML file.

## Content Loading

Load each step through the fetch command (handles caching, decryption, and auth):

```bash
"$HOME/.composure/bin/composure-fetch.mjs" skill composure view-graph {step-filename}
```

**Do NOT read cache files directly** — they are encrypted at rest. Always use the fetch command above.
