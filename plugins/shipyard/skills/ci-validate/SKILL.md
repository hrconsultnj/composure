---
name: ci-validate
description: Validate CI/CD workflow files with fix suggestions.
argument-hint: "[workflow-file]"
---

Validate CI/CD workflow files for syntax errors, common mistakes, and best practice violations. Combines external linters (actionlint) with built-in heuristic checks that catch issues linters miss.

## Progress Tracking

This skill uses TaskCreate for progress tracking. Before starting work:
1. Create one task per major step using TaskCreate
2. Set each task to `in_progress` when starting it (TaskUpdate)
3. Mark `completed` when done
4. Write deliverables to files, not inline — inline text is for communication only

## Content Loading

Load each step through the fetch command (handles caching, decryption, and auth):

```bash
"$HOME/.composure/bin/composure-fetch.mjs" skill shipyard ci-validate {step-filename}
```

**Do NOT read cache files directly** — they are encrypted at rest. Always use the fetch command above.

## Steps

| # | File | 
|---|------|
| 1 | `01-find-ci-files.md` |
| 2 | `02-external-linter.md` |
| 3 | `03a-heuristic-checks-1-6.md` |
| 4 | `03b-heuristic-checks-7-12.md` |
| 5 | `04-report-and-tasks.md` |
