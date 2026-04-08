---
name: review-pr
description: PR review with code graph, quality audit, and security checks.
argument-hint: "[PR number or branch name]"
---

Perform a comprehensive, graph-powered code review of a pull request. Uses verification discipline ("comments with receipts") — every finding is verified against the code graph or source before inclusion.

## Content Loading

Load each step through the fetch command (handles caching, decryption, and auth):

```bash
"$HOME/.composure/bin/composure-fetch.mjs" skill composure review-pr {step-filename}
```

**Do NOT read cache files directly** — they are encrypted at rest. Always use the fetch command above.

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
