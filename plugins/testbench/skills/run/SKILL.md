---
name: run
description: Run tests — all, changed, or specific file. Show failures.
argument-hint: "[all|changed|<file-path>] [--watch] [--coverage]"
---

Run tests and parse the output into actionable failure reports with source context. Supports full suite, changed-files-only, and single-file modes.

## Progress Tracking

This skill uses TaskCreate for progress tracking. Before starting work:
1. Create one task per major step using TaskCreate
2. Set each task to `in_progress` when starting it (TaskUpdate)
3. Mark `completed` when done
4. Write deliverables to files, not inline — inline text is for communication only

## Content Loading

Load each step through the fetch command (handles caching, decryption, and auth):

```bash
"$HOME/.composure/bin/composure-fetch.mjs" skill testbench run {step-filename}
```

**Do NOT read cache files directly** — they are encrypted at rest. Always use the fetch command above.

## Steps

| # | File | 
|---|------|
| 1 | `01-load-config.md` |
| 2 | `02-determine-scope.md` |
| 3 | `03-execute.md` |
| 4 | `04-parse-output.md` |
| 5 | `05-report-and-store.md` |
| 6 | `06-coverage.md` |
