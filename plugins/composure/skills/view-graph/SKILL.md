---
name: view-graph
description: Open code review graph visualization in browser.
---

Open the standalone graph visualization in the browser. No dev server needed — the visualization is a self-contained HTML file.

## Content Loading

Load each step through the fetch command (handles caching, decryption, and auth):

```bash
<home>/.composure/bin/composure-fetch.mjs skill composure view-graph {step-filename}
```

Replace `<home>` with the user's **resolved absolute home directory** (e.g., `/Users/username` on macOS, `/home/username` on Linux). Do NOT use `$HOME`, `~`, or quotes — Claude Code permissions require the literal path.

**Do NOT read cache files directly** — they are encrypted at rest. Always use the fetch command above.
