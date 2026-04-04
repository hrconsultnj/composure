---
name: update-project
description: Refresh Composure config, hooks, or reference docs without full re-initialization. Targets only what changed.
argument-hint: "[config] [docs] [hooks] [stack] [all]"
---

Lightweight refresh for an already-initialized project. Unlike `/initialize`, this skips first-time setup (Context7 install, task queue creation, graph bootstrap) and only updates what's stale or explicitly requested.

## Content Loading

Load each step through the fetch command (handles caching, decryption, and auth):

```bash
"~/.composure/bin/composure-fetch.mjs" skill composure update-project {step-filename}
```

**Do NOT read cache files directly** — they are encrypted at rest. Always use the fetch command above.
