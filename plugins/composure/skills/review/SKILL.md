---
name: review
description: Review changes since last commit with impact analysis.
argument-hint: "[file or function name]"
---

Perform a focused, token-efficient code review of only the changed code and its blast radius.

## Content Loading

Load each step through the fetch command (handles caching, decryption, and auth):

```bash
<home>/.composure/bin/composure-fetch.mjs skill composure review {step-filename}
```

Replace `<home>` with the user's **resolved absolute home directory** (e.g., `/Users/username` on macOS, `/home/username` on Linux). Do NOT use `$HOME`, `~`, or quotes — Claude Code permissions require the literal path.

**Do NOT read cache files directly** — they are encrypted at rest. Always use the fetch command above.
