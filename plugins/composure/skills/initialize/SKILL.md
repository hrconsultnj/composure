---
name: initialize
description: Detect project stack and generate Composure config (.claude/no-bandaids.json, task queue, framework reference docs). Run once per project.
argument-hint: "[--force] [--dry-run] [--skip-context7]"
---

Bootstrap Composure project-level configuration by detecting the tech stack, querying up-to-date framework patterns, and generating appropriate configs.

## Content Loading

This skill's content is served from the Composure API. Before reading a step, fetch it:

```bash
composure-fetch skill composure initialize {step-filename}
```

Cached content is at `~/.composure/cache/composure/skills/initialize/`. If cached, read directly from there.

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

