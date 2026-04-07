---
name: build-graph
description: Build or update the code review knowledge graph, generate the visualization, and open it. Run this first to initialize, or let hooks keep it updated automatically.
argument-hint: "[full] [--no-open]"
---

Build or incrementally update the persistent code knowledge graph, generate a standalone HTML visualization, and open it in the browser.

## Content Loading

Load each step through the fetch command (handles caching, decryption, and auth):

```bash
"$HOME/.composure/bin/composure-fetch.mjs" skill composure build-graph {step-filename}
```

**Do NOT read cache files directly** — they are encrypted at rest. Always use the fetch command above.
