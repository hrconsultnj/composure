---
name: scan
description: Exposure-aware security scan — Semgrep static analysis, dependency audit, and Composure graph-based exposure prioritization. Writes prioritized findings to tasks-plans/tasks.md.
argument-hint: "[--semgrep-only] [--deps-only] [--path <dir>]"
---

Run a comprehensive security scan combining static analysis (Semgrep), dependency vulnerability auditing, and exposure-aware prioritization via the Composure code graph. Findings are classified by both severity AND reachability (public, authenticated, internal, dead code) to produce actionable priority rankings. Results are written to `tasks-plans/tasks.md` using Composure's severity format.

## Content Loading

This skill's content is served from the Composure API. Before reading a step, fetch it:

```bash
composure-fetch skill sentinel scan {step-filename}
```

Cached content is at `~/.composure/cache/sentinel/skills/scan/`. If cached, read directly from there.

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

