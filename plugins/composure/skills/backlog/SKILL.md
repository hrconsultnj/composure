---
name: backlog
description: Review and process accumulated code quality tasks from tasks-plans/tasks.md, tasks-plans/audits/, and tasks-plans/blueprints/. Tasks are auto-logged by the PostToolUse hook, decomposition audits, and blueprints. Supports batch processing, delegation to sub-agents, verification, and archiving.
argument-hint: "[add <description>|batch|delegate|clean|summary|sync|verify|archive]"
---

Process the task queue from `tasks-plans/tasks.md` (hook-generated), `tasks-plans/audits/` (audit-generated), and `tasks-plans/blueprints/` (blueprint-generated).

## Content Loading

This skill's content is cached locally. Read steps from cache first, fetch only if missing:

```bash
"~/.composure/bin/composure-fetch.mjs" skill composure backlog {step-filename}
```

**Read from `~/.composure/cache/composure/skills/backlog/` first.** Only run the fetch command above if the cached file is missing.
