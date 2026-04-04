---
name: review-pr
description: Comprehensive PR review using code graph, quality audit, verification discipline, framework checks, and Sentinel security crossover.
argument-hint: "[PR number or branch name]"
---

Perform a comprehensive, graph-powered code review of a pull request. Uses verification discipline ("comments with receipts") — every finding is verified against the code graph or source before inclusion.

## Content Loading

This skill's content is cached locally. Read steps from cache first, fetch only if missing:

```bash
"~/.composure/bin/composure-fetch.mjs" skill composure review-pr {step-filename}
```

**Read from `~/.composure/cache/composure/skills/review-pr/` first.** Only run the fetch command above if the cached file is missing.

## Steps

| # | File | 
|---|------|
| 1 | `01-identify-and-setup.md` |
| 2 | `02-context-building.md` |
| 3 | `03-walkthrough.md` |
| 4 | `04-quality-audit.md` |
| 5 | `04a-run-audit.md` |
| 6 | `04b-filter-changed.md` |
| 7 | `04c-classify-findings.md` |
| 8 | `04d-test-coverage.md` |
| 9 | `04e-quality-delta.md` |
| 10 | `05-deep-dive.md` |
| 11 | `06-framework-checks.md` |
| 12 | `07-security-crossover.md` |
| 13 | `08-generate-output.md` |
