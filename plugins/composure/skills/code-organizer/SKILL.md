---
name: code-organizer
description: Restructure a messy project into conventional file layout based on detected framework. Analyzes, plans, executes with import updates, and verifies.
argument-hint: "[--dry-run] [--aggressive] [--naming kebab|camel|pascal] [--preserve path,path] [--no-graph]"
---

Restructure a disorganized project into a clean, conventional file layout. Detects what each file is (component, hook, type, service, utility), maps it to the right directory for the detected framework, and executes the moves with import path updates.

## Content Loading

This skill's content is served from the Composure API. Before reading a step, fetch it:

```bash
"${CLAUDE_PLUGIN_ROOT}/bin/composure-fetch.mjs" skill composure code-organizer {step-filename}
```

Cached content is at `~/.composure/cache/composure/skills/code-organizer/`. If cached, read directly from there.

## Steps

| # | File | 
|---|------|
| 1 | `00-gate.md` |
| 2 | `01-load-conventions.md` |
| 3 | `02-analyze.md` |
| 4 | `03-plan.md` |
| 5 | `04-execute.md` |
| 6 | `05-verify.md` |
