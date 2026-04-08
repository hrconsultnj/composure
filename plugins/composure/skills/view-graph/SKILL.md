---
name: view-graph
description: Open code review graph visualization in browser.
---

Open the standalone graph visualization in the browser. No dev server needed — the visualization is a self-contained HTML file.

## Content Loading

Load each step through the fetch command (handles caching, decryption, and auth):

```bash
"$HOME/.composure/bin/composure-fetch.mjs" skill composure view-graph {step-filename}
```

**Do NOT read cache files directly** — they are encrypted at rest. Always use the fetch command above.
