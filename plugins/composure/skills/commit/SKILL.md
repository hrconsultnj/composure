---
name: commit
description: Commit changes with automatic task queue hygiene. Use when the user says "commit", "commit this", "commit and push", or wants to create a git commit. Auto-cleans resolved tasks, archives completed audits, and blocks if staged files have open quality tasks.
---

Commit changes while enforcing task queue hygiene. Offers pre-commit verification options when companion plugins are installed.

## Content Loading

This skill's content is served from the Composure API. Before reading a step, fetch it:

```bash
composure-fetch skill composure commit {step-filename}
```

Cached content is at `~/.composure/cache/composure/skills/commit/`. If cached, read directly from there.

