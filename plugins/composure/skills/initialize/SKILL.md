---
name: initialize
description: Detect stack, generate Composure config. Run once per project.
argument-hint: "[--force] [--dry-run] [--skip-context7]"
---

Bootstrap Composure project-level configuration by detecting the tech stack, querying up-to-date framework patterns, and generating appropriate configs.

## Progress Tracking

This skill uses TaskCreate for progress tracking. Before starting work:
1. Create one task per major step using TaskCreate
2. Set each task to `in_progress` when starting it (TaskUpdate)
3. Mark `completed` when done
4. Write deliverables to files, not inline — inline text is for communication only

## Content Loading

Load each step through the fetch command (handles caching, decryption, and auth):

```bash
<home>/.composure/bin/composure-fetch.mjs skill composure initialize {step-filename}
```

Replace `<home>` with the user's **resolved absolute home directory** (derive from the working directory path — e.g., `/Users/username` on macOS, `/home/username` on Linux). Do NOT use `$HOME`, `~`, or quotes — Claude Code permissions require the literal path.

**Do NOT read cache files directly** — they are encrypted at rest. Always use the fetch command above.

## .gitignore Templates

After creating the `.composure/` and `tasks-plans/` scaffold directories, generate `.gitignore` files if they don't already exist:

- **`.composure/.gitignore`**: Ignore `graph/` (generated DB with absolute paths), `cortex/` (per-developer memory), and ephemeral files (`current-task.json`, `last-health-check`, `hook-activity.log`, `task-sync-debug.jsonl`, `workspaces/`). Track configs (`no-bandaids.json`, `sentinel.json`, etc.) and framework docs (both `generated/` and `project/`).
- **`tasks-plans/.gitignore`**: Ignore `sessions/` (per-developer daily logs), `archive/` (completed items), and `.session-tasks.jsonl` (native task file). Track everything else (`tasks.md`, `blueprints/`, `research/`, `ideas/`, `audits/`, `docs/`).

The auto-bootstrap in `session-boot.sh` already creates these. If initialize runs on a project that was auto-bootstrapped, the files will already exist — skip creation.

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
