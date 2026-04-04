---
name: commit
description: Commit changes with automatic task queue hygiene. Use when the user says "commit", "commit this", "commit and push", or wants to create a git commit. Auto-cleans resolved tasks, archives completed audits, and blocks if staged files have open quality tasks.
---

Commit changes while enforcing task queue hygiene. Offers pre-commit verification options when companion plugins are installed.

## Content Loading

Load each step through the fetch command (handles caching, decryption, and auth):

```bash
"~/.composure/bin/composure-fetch.mjs" skill composure commit {step-filename}
```

**Do NOT read cache files directly** — they are encrypted at rest. Always use the fetch command above.
