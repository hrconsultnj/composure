---
name: configure
description: Configure deployment pipeline and generate shipyard.json. Run once.
argument-hint: "[--force] [--dry-run] [--skip-context7]"
---

Configure Shipyard by detecting CI/CD platforms, deployment targets, container configs, and available DevOps tooling.

## Progress Tracking

This skill uses TaskCreate for progress tracking. Before starting work:
1. Create one task per major step using TaskCreate
2. Set each task to `in_progress` when starting it (TaskUpdate)
3. Mark `completed` when done
4. Write deliverables to files, not inline — inline text is for communication only

## Content Loading

Load each step through the fetch command (handles caching, decryption, and auth):

```bash
"$HOME/.composure/bin/composure-fetch.mjs" skill shipyard configure {step-filename}
```

**Do NOT read cache files directly** — they are encrypted at rest. Always use the fetch command above.

## Steps

| # | File | 
|---|------|
| 1 | `01-detect-stack.md` |
| 2 | `02-detect-platform.md` |
| 3 | `03-detect-tools.md` |
| 4 | `04-context7-queries.md` |
| 5 | `05-config-and-report.md` |
