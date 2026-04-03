---
name: audit
description: Full codebase health audit — architecture, security, code quality, dependencies, test coverage. Produces a scored report with letter grades and prioritized remediation. Use when walking into an existing codebase or before major releases.
argument-hint: "[path or glob pattern] [--threshold N] [--quick]"
---

Comprehensive codebase assessment that produces a scored health report with letter grades across 5 categories: Architecture, Security, Code Quality, Dependencies, and Test Coverage.

## Content Loading

This skill's content is served from the Composure API. Before reading a step, fetch it:

```bash
composure-fetch skill composure audit {step-filename}
```

Cached content is at `~/.composure/cache/composure/skills/audit/`. If cached, read directly from there.

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

