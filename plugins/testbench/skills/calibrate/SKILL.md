---
name: calibrate
description: Detect test framework, generate testbench.json. Run once.
argument-hint: "[--force] [--dry-run] [--skip-context7]"
---

Calibrate the test bench by detecting the test framework, learning conventions from existing tests, querying up-to-date test framework docs, and generating the config.

## Progress Tracking

This skill uses TaskCreate for progress tracking. Before starting work:
1. Create one task per major step using TaskCreate
2. Set each task to `in_progress` when starting it (TaskUpdate)
3. Mark `completed` when done
4. Write deliverables to files, not inline — inline text is for communication only

## Content Loading

Load each step through the fetch command (handles caching, decryption, and auth):

```bash
"$HOME/.composure/bin/composure-fetch.mjs" skill testbench calibrate {step-filename}
```

**Do NOT read cache files directly** — they are encrypted at rest. Always use the fetch command above.

## Steps

| # | File | 
|---|------|
| 1 | `01-detect-framework.md` |
| 2 | `02-detect-conventions.md` |
| 3 | `03-context7-queries.md` |
| 4 | `04-config-and-report.md` |
