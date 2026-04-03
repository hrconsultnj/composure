---
name: headers
description: HTTP security header analysis — context-aware grading with exploitable-risk focus, not checkbox counting.
argument-hint: "<url>"
---

Analyze HTTP security headers for a given URL. Grades based on actual exploitable risk rather than checkbox compliance. Provides WHY explanations and exact fix commands.

## Content Loading

This skill's content is served from the Composure API. Before reading a step, fetch it:

```bash
"${CLAUDE_PLUGIN_ROOT}/bin/composure-fetch.mjs" skill sentinel headers {step-filename}
```

Cached content is at `~/.composure/cache/sentinel/skills/headers/`. If cached, read directly from there.

## Steps

| # | File | 
|---|------|
| 1 | `01-fetch-headers.md` |
| 2 | `02-analyze-headers.md` |
| 3 | `03-overall-grade.md` |
| 4 | `04-report.md` |
