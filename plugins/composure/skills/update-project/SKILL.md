---
name: update-project
description: Refresh Composure config, hooks, or reference docs without full re-initialization. Targets only what changed.
argument-hint: "[config] [docs] [hooks] [stack] [all]"
---

Lightweight refresh for an already-initialized project. Unlike `/initialize`, this skips first-time setup (Context7 install, task queue creation, graph bootstrap) and only updates what's stale or explicitly requested.

## Content Loading

This skill's content is served from the Composure API. Before reading a step, fetch it:

```bash
composure-fetch skill composure update-project {step-filename}
```

Cached content is at `~/.composure/cache/composure/skills/update-project/`. If cached, read directly from there.

