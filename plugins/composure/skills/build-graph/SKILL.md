---
name: build-graph
description: Build/update code review knowledge graph and open visualization.
argument-hint: "[full] [--no-open]"
---

Build or incrementally update the persistent code knowledge graph, generate a standalone HTML visualization, and open it in the browser.

## Content Loading

Load each step through the fetch command (handles caching, decryption, and auth):

```bash
"$HOME/.composure/bin/composure-fetch.mjs" skill composure build-graph {step-filename}
```

**Do NOT read cache files directly** — they are encrypted at rest. Always use the fetch command above.
