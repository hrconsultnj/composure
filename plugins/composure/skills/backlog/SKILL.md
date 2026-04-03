---
name: backlog
description: Review and process accumulated code quality tasks from tasks-plans/tasks.md, tasks-plans/audits/, and tasks-plans/blueprints/. Tasks are auto-logged by the PostToolUse hook, decomposition audits, and blueprints. Supports batch processing, delegation to sub-agents, verification, and archiving.
argument-hint: "[add <description>|batch|delegate|clean|summary|sync|verify|archive]"
---

Process the task queue from `tasks-plans/tasks.md` (hook-generated), `tasks-plans/audits/` (audit-generated), and `tasks-plans/blueprints/` (blueprint-generated).

## Content Loading

This skill's content is served from the Composure API. Before reading a step, fetch it:

```bash
composure-fetch skill composure backlog {step-filename}
```

Cached content is at `~/.composure/cache/composure/skills/backlog/`. If cached, read directly from there.

