---
name: audit
description: Full codebase health audit — architecture, security, code quality, dependencies, test coverage. Produces a scored report with letter grades and prioritized remediation. Use when walking into an existing codebase or before major releases.
argument-hint: "[path or glob pattern] [--threshold N] [--quick]"
---

Comprehensive codebase assessment that produces a scored health report with letter grades across 5 categories: Architecture, Security, Code Quality, Dependencies, and Test Coverage.

## Content Loading

Load each step through the fetch command (handles caching, decryption, and auth):

```bash
"~/.composure/bin/composure-fetch.mjs" skill composure audit {step-filename}
```

**Do NOT read cache files directly** — they are encrypted at rest. Always use the fetch command above.

## Steps

| # | File | 
|---|------|
| 1 | `00-bootstrap.md` |
| 2 | `01-size-structure.md` |
| 3 | `02-decomposition.md` |
| 4 | `03-architecture.md` |
| 5 | `04-security.md` |
| 6 | `05-quality.md` |
| 7 | `06-dependencies.md` |
| 8 | `07-score-report.md` |
