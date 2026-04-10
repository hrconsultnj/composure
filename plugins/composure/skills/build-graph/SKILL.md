---
name: build-graph
description: Build/update code review knowledge graph and open visualization.
argument-hint: "[full] [--no-open]"
---

Build or incrementally update the persistent code knowledge graph, generate a standalone HTML visualization, and open it in the browser.

## Content Loading

Load each step through the fetch command (handles caching, decryption, and auth):

```bash
<home>/.composure/bin/composure-fetch.mjs skill composure build-graph {step-filename}
```

Replace `<home>` with the user's **resolved absolute home directory** (e.g., `/Users/username` on macOS, `/home/username` on Linux). Do NOT use `$HOME`, `~`, or quotes — Claude Code permissions require the literal path.

**Do NOT read cache files directly** — they are encrypted at rest. Always use the fetch command above.
