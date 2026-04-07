---
name: report
description: Generate a self-contained HTML audit report orchestrating all installed plugins. Produces a visual report with letter grades, tabbed sections, and prioritized recommendations.
argument-hint: "[--url <deployment-url>] [--open] [--no-sentinel] [--no-testbench] [--no-shipyard]"
---

Generate a professional, self-contained HTML audit report by orchestrating all installed plugins. Letter grades, tabbed detail sections, prioritized recommendations, and zero source code exposure.

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
