---
name: review
description: Review changes since last commit with impact analysis.
argument-hint: "[file or function name]"
---

Perform a focused, token-efficient code review of only the changed code and its blast radius.

## Content Loading

Load each step through the fetch command (handles caching, decryption, and auth):

```bash
"$HOME/.composure/bin/composure-fetch.mjs" skill composure review {step-filename}
```

**Do NOT read cache files directly** — they are encrypted at rest. Always use the fetch command above.
