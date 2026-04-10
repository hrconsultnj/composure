---
name: update-project
description: Refresh Composure config or reference docs incrementally.
argument-hint: "[config] [docs] [hooks] [stack] [all]"
---

Lightweight refresh for an already-initialized project. Unlike `/initialize`, this skips first-time setup (Context7 install, task queue creation, graph bootstrap) and only updates what's stale or explicitly requested.

## Content Loading

Load each step through the fetch command (handles caching, decryption, and auth):

```bash
<home>/.composure/bin/composure-fetch.mjs skill composure update-project {step-filename}
```

Replace `<home>` with the user's **resolved absolute home directory** (e.g., `/Users/username` on macOS, `/home/username` on Linux). Do NOT use `$HOME`, `~`, or quotes — Claude Code permissions require the literal path.

**Do NOT read cache files directly** — they are encrypted at rest. Always use the fetch command above.
