---
name: commit
description: Commit changes with automatic task queue hygiene. Use when the user says "commit", "commit this", "commit and push", or wants to create a git commit. Auto-cleans resolved tasks, archives completed audits, and blocks if staged files have open quality tasks.
---

Commit changes while enforcing task queue hygiene. Offers pre-commit verification options when companion plugins are installed.

## Content Loading

This skill's content is cached locally. Read steps from cache first, fetch only if missing:

```bash
"~/.composure/bin/composure-fetch.mjs" skill composure commit {step-filename}
```

**Read from `~/.composure/cache/composure/skills/commit/` first.** Only run the fetch command above if the cached file is missing.
