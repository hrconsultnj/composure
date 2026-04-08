---
name: commit
description: Commit with task queue hygiene. Use for "commit", "commit and push".
---

Commit changes while enforcing task queue hygiene. Offers pre-commit verification options when companion plugins are installed.

## Content Loading

Load each step through the fetch command (handles caching, decryption, and auth):

```bash
"$HOME/.composure/bin/composure-fetch.mjs" skill composure commit {step-filename}
```

**Do NOT read cache files directly** — they are encrypted at rest. Always use the fetch command above.
