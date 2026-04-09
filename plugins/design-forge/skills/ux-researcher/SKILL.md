---
name: ux-researcher
description: Design research via web search — patterns, competitors, trends, tech evaluation.
---

AI-powered design research agent that autonomously gathers intelligence through web search to inform design decisions. Does the groundwork research that feeds into the design-forge skill, discovering patterns, technologies, and approaches that work in the real world.

## Progress Tracking

This skill uses TaskCreate for progress tracking. Before starting work:
1. Create one task per major step using TaskCreate
2. Set each task to `in_progress` when starting it (TaskUpdate)
3. Mark `completed` when done
4. Write deliverables to files, not inline — inline text is for communication only

## Content Loading

Load each step through the fetch command (handles caching, decryption, and auth):

```bash
"$HOME/.composure/bin/composure-fetch.mjs" skill design-forge ux-researcher {step-filename}
```

**Do NOT read cache files directly** — they are encrypted at rest. Always use the fetch command above.

## Steps

| # | File | 
|---|------|
| 1 | `01-define-scope.md` |
| 2 | `02-execute-research.md` |
| 3 | `03-synthesize.md` |
| 4 | `04-write-report.md` |
| 5 | `05-handoff.md` |

## References

- `competitor-analysis-template.md`
- `industry-research-template.md`
- `report-templates.md`
- `technology-matrix.md`
