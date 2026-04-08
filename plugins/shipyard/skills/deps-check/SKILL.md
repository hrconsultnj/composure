---
name: deps-check
description: Check dependency health — CVEs, outdated, unsafe versions.
argument-hint: "[--fix] [--json]"
---

Audit project dependencies for known vulnerabilities (CVEs), outdated packages, and unsafe version ranges. Unlike basic `npm audit`, this skill determines the **highest safe version** for each vulnerable package -- not just "update to latest" which may itself be vulnerable.

## Content Loading

Load each step through the fetch command (handles caching, decryption, and auth):

```bash
"$HOME/.composure/bin/composure-fetch.mjs" skill shipyard deps-check {step-filename}
```

**Do NOT read cache files directly** — they are encrypted at rest. Always use the fetch command above.

## Steps

| # | File | 
|---|------|
| 1 | `01-detect-pkg-manager.md` |
| 2 | `02-run-audit.md` |
| 3 | `03-enrich-results.md` |
| 4 | `04-fix-report-tasks.md` |
