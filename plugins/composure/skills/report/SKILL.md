---
name: report
description: Generate a self-contained HTML audit report orchestrating all installed plugins. Produces a visual report with letter grades, tabbed sections, and prioritized recommendations.
argument-hint: "[--url <deployment-url>] [--open] [--no-sentinel] [--no-testbench] [--no-shipyard]"
---

Generate a professional, self-contained HTML audit report by orchestrating all installed plugins. Letter grades, tabbed detail sections, prioritized recommendations, and zero source code exposure.

## Content Loading

This skill's content is served from the Composure API. Before reading a step, fetch it:

```bash
"${CLAUDE_PLUGIN_ROOT}/bin/composure-fetch.mjs" skill composure report {step-filename}
```

Cached content is at `~/.composure/cache/composure/skills/report/`. If cached, read directly from there.

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
