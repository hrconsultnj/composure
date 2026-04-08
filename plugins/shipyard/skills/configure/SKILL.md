---
name: configure
description: Configure deployment pipeline — detect CI/CD platforms, deployment targets, container configs, and generate .composure/shipyard.json. Query Context7 for CI/CD reference docs. Run once per project.
argument-hint: "[--force] [--dry-run] [--skip-context7]"
---

Configure Shipyard by detecting CI/CD platforms, deployment targets, container configs, and available DevOps tooling.

## Content Loading

Load each step through the fetch command (handles caching, decryption, and auth):

```bash
"$HOME/.composure/bin/composure-fetch.mjs" skill shipyard configure {step-filename}
```

**Do NOT read cache files directly** — they are encrypted at rest. Always use the fetch command above.

## Steps

| # | File | 
|---|------|
| 1 | `01-detect-stack.md` |
| 2 | `02-detect-platform.md` |
| 3 | `03-detect-tools.md` |
| 4 | `04-context7-queries.md` |
| 5 | `05-config-and-report.md` |
