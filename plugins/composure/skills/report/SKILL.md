---
name: report
description: Generate HTML audit report with letter grades across plugins.
argument-hint: "[--url <deployment-url>] [--open] [--no-sentinel] [--no-testbench] [--no-shipyard]"
---

Generate a professional, self-contained HTML audit report by orchestrating all installed plugins. Letter grades, tabbed detail sections, prioritized recommendations, and zero source code exposure.

## Progress Tracking

This skill uses TaskCreate for progress tracking. Before starting work:
1. Create one task per major step using TaskCreate
2. Set each task to `in_progress` when starting it (TaskUpdate)
3. Mark `completed` when done
4. Write deliverables to files, not inline — inline text is for communication only

## Content Loading

Load each step through the fetch command (handles caching, decryption, and auth):

```bash
"$HOME/.composure/bin/composure-fetch.mjs" skill composure report {step-filename}
```

**Do NOT read cache files directly** — they are encrypted at rest. Always use the fetch command above.

## Steps

| # | File | 
|---|------|
| 1 | `00-prerequisites.md` |
| 2 | `01-gather-data.md` |
| 3 | `02-scoring.md` |
| 4 | `03-generate-html.md` |
| 5 | `04-summary-and-remediation.md` |

## Templates

- `audit-footer.html`
- `audit-header.html`
- `audit-tab-panels.html`
- `audit-tabs.html`
