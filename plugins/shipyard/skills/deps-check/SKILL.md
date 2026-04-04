---
name: deps-check
description: Check dependency health -- known CVEs, outdated packages, unsafe versions. Recommends the highest safe version, not just "latest". Blocks Critical CVEs via Composure commit gate.
argument-hint: "[--fix] [--json]"
---

Audit project dependencies for known vulnerabilities (CVEs), outdated packages, and unsafe version ranges. Unlike basic `npm audit`, this skill determines the **highest safe version** for each vulnerable package -- not just "update to latest" which may itself be vulnerable.

## Content Loading

This skill's content is cached locally. Read steps from cache first, fetch only if missing:

```bash
"~/.composure/bin/composure-fetch.mjs" skill shipyard deps-check {step-filename}
```

**Read from `~/.composure/cache/shipyard/skills/deps-check/` first.** Only run the fetch command above if the cached file is missing.

## Steps

| # | File | 
|---|------|
| 1 | `01-detect-pkg-manager.md` |
| 2 | `02-run-audit.md` |
| 3 | `03-enrich-results.md` |
| 4 | `04-fix-report-tasks.md` |
