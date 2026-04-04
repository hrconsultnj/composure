---
name: configure
description: Configure deployment pipeline — detect CI/CD platforms, deployment targets, container configs, and generate .claude/shipyard.json. Query Context7 for CI/CD reference docs. Run once per project.
argument-hint: "[--force] [--dry-run] [--skip-context7]"
---

Configure Shipyard by detecting CI/CD platforms, deployment targets, container configs, and available DevOps tooling.

## Content Loading

This skill's content is cached locally. Read steps from cache first, fetch only if missing:

```bash
"~/.composure/bin/composure-fetch.mjs" skill shipyard configure {step-filename}
```

**Read from `~/.composure/cache/shipyard/skills/configure/` first.** Only run the fetch command above if the cached file is missing.

## Steps

| # | File | 
|---|------|
| 1 | `01-detect-stack.md` |
| 2 | `02-detect-platform.md` |
| 3 | `03-detect-tools.md` |
| 4 | `04-context7-queries.md` |
| 5 | `05-config-and-report.md` |
