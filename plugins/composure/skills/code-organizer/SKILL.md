---
name: code-organizer
description: Restructure project into conventional file layout by framework.
argument-hint: "[--dry-run] [--aggressive] [--naming kebab|camel|pascal] [--preserve path,path] [--no-graph]"
---

Restructure a disorganized project into a clean, conventional file layout. Detects what each file is (component, hook, type, service, utility), maps it to the right directory for the detected framework, and executes the moves with import path updates.

## Progress Tracking

This skill uses TaskCreate for progress tracking. Before starting work:
1. Create one task per major step using TaskCreate
2. Set each task to `in_progress` when starting it (TaskUpdate)
3. Mark `completed` when done
4. Write deliverables to files, not inline — inline text is for communication only

## Content Loading

Load each step through the fetch command (handles caching, decryption, and auth):

```bash
"$HOME/.composure/bin/composure-fetch.mjs" skill composure code-organizer {step-filename}
```

**Do NOT read cache files directly** — they are encrypted at rest. Always use the fetch command above.

## Steps

| # | File | 
|---|------|
| 1 | `00-gate.md` |
| 2 | `01-load-conventions.md` |
| 3 | `02-analyze.md` |
| 4 | `03-plan.md` |
| 5 | `04-execute.md` |
| 6 | `05-verify.md` |
