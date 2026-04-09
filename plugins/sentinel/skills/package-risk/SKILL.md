---
name: package-risk
description: Analyze package source for suspicious behavior patterns.
argument-hint: "<package-name> [--ecosystem js|python|rust|go]"
---

Inspect an installed package's source code for behavioral signals that indicate supply chain risk. Scores the package and reports suspicious patterns with file:line context.

## Progress Tracking

This skill uses TaskCreate for progress tracking. Before starting work:
1. Create one task per major step using TaskCreate
2. Set each task to `in_progress` when starting it (TaskUpdate)
3. Mark `completed` when done
4. Write deliverables to files, not inline — inline text is for communication only

## Content Loading

Load each step through the fetch command (handles caching, decryption, and auth):

```bash
"$HOME/.composure/bin/composure-fetch.mjs" skill sentinel package-risk {step-filename}
```

**Do NOT read cache files directly** — they are encrypted at rest. Always use the fetch command above.

## Steps

| # | File | 
|---|------|
| 1 | `01-locate-package.md` |
| 2 | `02-behavior-scan.md` |
| 3 | `03-score-and-report.md` |
