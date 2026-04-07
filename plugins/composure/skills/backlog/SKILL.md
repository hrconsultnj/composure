---
name: backlog
description: Manage the tasks-plans/ workspace — add items to backlog, ideas, or reference. Process queued work. Organize by topic, not flat dumps.
argument-hint: "[add <description>|idea <description>|ref <description>|batch|delegate|clean|summary|sync|verify|archive]"
---

Manage the `tasks-plans/` workspace. Route content to the right folder, organized by topic.

## Folder Structure

```
tasks-plans/
├── backlog/          ← Actionable work items (each has a start prompt)
├── blueprints/       ← Detailed execution specs (created by /composure:blueprint)
├── archive/          ← Completed blueprints + backlogs
├── ideas/            ← Exploration, not committed to
├── reference/        ← Audits, snapshots, analysis docs
└── tasks.md          ← Live session task list (auto-logged by hooks)
```

## Routing Rules

When the user says "add to backlog" or you need to persist something, classify it:

| Signal | Folder | Subfolder by topic |
|--------|--------|--------------------|
| Actionable work, has clear steps, ready to pick up | `backlog/` | Group by area: `agents/`, `cortex/`, `website/`, `plugins/`, etc. |
| Exploration, "what if", not committed, needs research | `ideas/` | Flat or by theme — existing convention |
| Audit result, snapshot, analysis, historical data | `reference/` | Date-stamped: `{topic}-{YYYY-MM-DD}.md` |
| Detailed execution plan with per-file specs | `blueprints/` | Created by `/composure:blueprint`, not manually |
| Quick task for this session only | `tasks.md` | Or use native TaskCreate |

## Organizing Within Folders

**Don't flat-dump.** When a folder grows past 5-6 files on the same topic, group into a subfolder:

```
backlog/
├── agents/
│   └── agent-refinement.md
├── cortex/
│   ├── live-collaboration.md
│   └── token-optimized-routing.md
├── website/
│   └── cortex-hexagon-update.md
├── create-composure-cli.md          ← standalone until more CLI items exist
└── memory-consolidation.md          ← standalone
```

Use your judgment. If there's only 1 file on a topic, keep it at the root. When 2-3 accumulate on the same area, create the subfolder and move them.

## Subcommands

### `add <description>` — Add to backlog

1. Parse the description to understand the work item
2. Determine the topic area (agents, cortex, website, plugins, infrastructure, etc.)
3. Create a file at `tasks-plans/backlog/{topic}/{slug}.md` (or `tasks-plans/backlog/{slug}.md` if no clear topic group)
4. Include a **Start Prompt** section so a future session can pick it up immediately
5. If detailed enough for a blueprint, suggest: "This is complex enough for `/composure:blueprint`"

### `idea <description>` — Add to ideas

1. Create a file at `tasks-plans/ideas/{slug}.md`
2. Use the idea template: concept, why it matters, dependencies, effort estimate
3. Ideas are exploration — don't over-structure them

### `ref <description>` — Save reference

1. Create a file at `tasks-plans/reference/{slug}-{YYYY-MM-DD}.md`
2. Date-stamp reference docs — they're snapshots in time

### `batch` — Process queued tasks

Process tasks from `tasks-plans/tasks.md` (hook-generated quality violations).

### `summary` — Show what's queued

Read all folders and present a summary:
- Backlog: N items (grouped by topic)
- Ideas: N items
- Reference: N docs
- Blueprints: N active (not archived)
- Tasks.md: N open, M completed

### `clean` — Archive completed items

Move completed backlog items and blueprints to `archive/`.

### `sync` — Load pending tasks into session

Read backlog items and create TaskCreate entries for the current session.

## Content Loading

Load processing steps through the fetch command:

```bash
"$HOME/.composure/bin/composure-fetch.mjs" skill composure backlog {step-filename}
```
