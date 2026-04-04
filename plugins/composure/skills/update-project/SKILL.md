---
name: update-project
description: Refresh Composure config, hooks, or reference docs without full re-initialization. Targets only what changed.
argument-hint: "[config] [docs] [hooks] [stack] [all]"
---

Lightweight refresh for an already-initialized project. Unlike `/initialize`, this skips first-time setup (Context7 install, task queue creation, graph bootstrap) and only updates what's stale or explicitly requested.

## Content Loading

This skill's content is cached locally. Read steps from cache first, fetch only if missing:

```bash
"~/.composure/bin/composure-fetch.mjs" skill composure update-project {step-filename}
```

**Read from `~/.composure/cache/composure/skills/update-project/` first.** Only run the fetch command above if the cached file is missing.
