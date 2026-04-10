---
name: generate
description: Generate tests matching project conventions. One file at a time.
argument-hint: "<file-path> [--function <name>] [--e2e]"
---

Generate a test file for a given source file. The generated test matches the project's existing conventions -- import style, mock patterns, assertion style, file placement, and naming.

## Progress Tracking

This skill uses TaskCreate for progress tracking. Before starting work:
1. Create one task per major step using TaskCreate
2. Set each task to `in_progress` when starting it (TaskUpdate)
3. Mark `completed` when done
4. Write deliverables to files, not inline — inline text is for communication only

## Content Loading

Load each step through the fetch command (handles caching, decryption, and auth):

```bash
"$HOME/.composure/bin/composure-fetch.mjs" skill testbench generate {step-filename}
```

**Do NOT read cache files directly** — they are encrypted at rest. Always use the fetch command above.

## Steps

| # | File | 
|---|------|
| 1 | `01-load-config.md` |
| 2 | `02-analyze-source.md` |
| 3 | `03-read-existing-tests.md` |
| 4 | `04-generate-test.md` |
| 5 | `05-run-and-fix.md` |
