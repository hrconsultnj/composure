---
name: scan
description: Security scan — Semgrep, dependency audit, graph exposure ranking.
argument-hint: "[--semgrep-only] [--deps-only] [--path <dir>]"
---

Run a comprehensive security scan combining static analysis (Semgrep), dependency vulnerability auditing, and exposure-aware prioritization via the Composure code graph. Findings are classified by both severity AND reachability (public, authenticated, internal, dead code) to produce actionable priority rankings. Results are written to `tasks-plans/tasks.md` using Composure's severity format.

## Progress Tracking

This skill uses TaskCreate for progress tracking. Before starting work:
1. Create one task per major step using TaskCreate
2. Set each task to `in_progress` when starting it (TaskUpdate)
3. Mark `completed` when done
4. Write deliverables to files, not inline — inline text is for communication only

## Content Loading

Load each step through the fetch command (handles caching, decryption, and auth):

```bash
"$HOME/.composure/bin/composure-fetch.mjs" skill sentinel scan {step-filename}
```

**Do NOT read cache files directly** — they are encrypted at rest. Always use the fetch command above.

## Steps

| # | File | 
|---|------|
| 1 | `01-prerequisites.md` |
| 2 | `02-semgrep-analysis.md` |
| 3 | `03-dependency-audit.md` |
| 4 | `04-exposure-analysis.md` |
| 5 | `05-severity-mapping.md` |
| 6 | `06-known-cve-check.md` |
| 7 | `07-write-to-tasks.md` |
| 8 | `08-report-summary.md` |
