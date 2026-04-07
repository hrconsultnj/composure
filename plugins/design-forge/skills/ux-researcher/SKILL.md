---
name: ux-researcher
description: AI-powered design research agent that uses web search to discover design patterns, analyze competitors, research industry trends, evaluate modern web technologies, and create actionable reports for design-forge implementation. Automates the intelligence gathering phase of design work.
---

AI-powered design research agent that autonomously gathers intelligence through web search to inform design decisions. Does the groundwork research that feeds into the design-forge skill, discovering patterns, technologies, and approaches that work in the real world.

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
