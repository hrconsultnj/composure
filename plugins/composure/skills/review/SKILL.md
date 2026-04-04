---
name: review
description: Review only changes since last commit using impact analysis. Token-efficient delta review with automatic blast-radius detection.
argument-hint: "[file or function name]"
---

Perform a focused, token-efficient code review of only the changed code and its blast radius.

## Content Loading

This skill's content is cached locally. Read steps from cache first, fetch only if missing:

```bash
"~/.composure/bin/composure-fetch.mjs" skill composure review {step-filename}
```

**Read from `~/.composure/cache/composure/skills/review/` first.** Only run the fetch command above if the cached file is missing.
