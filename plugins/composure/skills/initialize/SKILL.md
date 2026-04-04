---
name: initialize
description: Detect project stack and generate Composure config (.composure/no-bandaids.json, task queue, framework reference docs). Run once per project.
argument-hint: "[--force] [--dry-run] [--skip-context7]"
---

Bootstrap Composure project-level configuration by detecting the tech stack, querying up-to-date framework patterns, and generating appropriate configs.

## Content Loading

This skill's content is cached locally. Read steps from cache first, fetch only if missing:

```bash
"~/.composure/bin/composure-fetch.mjs" skill composure initialize {step-filename}
```

**Read from `~/.composure/cache/composure/skills/initialize/` first.** Only run the fetch command above if the cached file is missing.

## Steps

| # | File | 
|---|------|
| 1 | `00-scope-detection.md` |
| 2 | `01-context-health.md` |
| 3 | `02-mcp-setup.md` |
| 4 | `03-companion-triage.md` |
| 5 | `04-detect-stack.md` |
| 6 | `05-extensions-skip-patterns.md` |
| 7 | `06-context7-setup.md` |
| 8 | `07a-context7-folders.md` |
| 9 | `07b-context7-query-loop.md` |
| 10 | `08-generate-config.md` |
| 11 | `09-build-graph.md` |
| 12 | `10-task-queue.md` |
| 13 | `11-report.md` |
| 14 | `12-claude-md-offer.md` |
