---
name: headers
description: HTTP security header analysis — context-aware grading with exploitable-risk focus, not checkbox counting.
argument-hint: "<url>"
---

Analyze HTTP security headers for a given URL. Grades based on actual exploitable risk rather than checkbox compliance. Provides WHY explanations and exact fix commands.

## Content Loading

This skill's content is cached locally. Read steps from cache first, fetch only if missing:

```bash
"~/.composure/bin/composure-fetch.mjs" skill sentinel headers {step-filename}
```

**Read from `~/.composure/cache/sentinel/skills/headers/` first.** Only run the fetch command above if the cached file is missing.

## Steps

| # | File | 
|---|------|
| 1 | `01-fetch-headers.md` |
| 2 | `02-analyze-headers.md` |
| 3 | `03-overall-grade.md` |
| 4 | `04-report.md` |
