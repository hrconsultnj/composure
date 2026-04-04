---
name: run
description: Run tests -- all, changed files only, or for a specific file. Parse output, show failures with source context.
argument-hint: "[all|changed|<file-path>] [--watch] [--coverage]"
---

Run tests and parse the output into actionable failure reports with source context. Supports full suite, changed-files-only, and single-file modes.

## Content Loading

Load each step through the fetch command (handles caching, decryption, and auth):

```bash
"~/.composure/bin/composure-fetch.mjs" skill testbench run {step-filename}
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
