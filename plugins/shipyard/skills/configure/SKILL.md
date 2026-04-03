---
name: configure
description: Configure deployment pipeline — detect CI/CD platforms, deployment targets, container configs, and generate .claude/shipyard.json. Query Context7 for CI/CD reference docs. Run once per project.
argument-hint: "[--force] [--dry-run] [--skip-context7]"
---

Configure Shipyard by detecting CI/CD platforms, deployment targets, container configs, and available DevOps tooling.

## Content Loading

This skill's content is served from the Composure API. Before reading a step, fetch it:

```bash
"${CLAUDE_PLUGIN_ROOT}/bin/composure-fetch.mjs" skill shipyard configure {step-filename}
```

Cached content is at `~/.composure/cache/shipyard/skills/configure/`. If cached, read directly from there.

## Steps

| # | File | 
|---|------|
| 1 | `01-detect-stack.md` |
| 2 | `02-detect-platform.md` |
| 3 | `03-detect-tools.md` |
| 4 | `04-context7-queries.md` |
| 5 | `05-config-and-report.md` |
