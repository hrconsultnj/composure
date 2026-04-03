---
name: review
description: Review only changes since last commit using impact analysis. Token-efficient delta review with automatic blast-radius detection.
argument-hint: "[file or function name]"
---

Perform a focused, token-efficient code review of only the changed code and its blast radius.

## Content Loading

This skill's content is served from the Composure API. Before reading a step, fetch it:

```bash
"${CLAUDE_PLUGIN_ROOT}/bin/composure-fetch.mjs" skill composure review {step-filename}
```

Cached content is at `~/.composure/cache/composure/skills/review/`. If cached, read directly from there.
