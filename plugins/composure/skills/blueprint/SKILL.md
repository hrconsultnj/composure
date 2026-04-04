---
name: blueprint
description: Graph-powered pre-work assessment with progressive refinement. Classifies work, scans code graph, confirms scope with user, analyzes impact, evaluates approaches, and writes a persistent blueprint with per-file implementation specs.
argument-hint: "[feature description] [--skip-graph] [--quick]"
---

Structured "think before building" step — from requirements discovery through implementation planning. Like building a house: the architect surveys the land and gathers requirements (Phase 0), then draws the blueprint with structural specs (Phase 1). One skill, two phases.

## Content Loading

This skill's content is cached locally. Read steps from cache first, fetch only if missing:

```bash
"~/.composure/bin/composure-fetch.mjs" skill composure blueprint {step-filename}
```

**Read from `~/.composure/cache/composure/skills/blueprint/` first.** Only run the fetch command above if the cached file is missing.

## Steps

| # | File | 
|---|------|
| 1 | `00a-preflight.md` |
| 2 | `00b-intent-analysis.md` |
| 3 | `00c-ecosystem-research.md` |
| 4 | `00d-stack-options.md` |
| 5 | `00e-requirements-confirm.md` |
| 6 | `00f-scaffold.md` |
| 7 | `00g-auto-initialize.md` |
| 8 | `01-classify.md` |
| 9 | `02-graph-scan.md` |
| 10 | `03-impact-analysis.md` |
| 11 | `04a-load-docs.md` |
| 12 | `04b-write-blueprint.md` |
| 13 | `04c-handoff.md` |

## Templates

- `00c-ecosystem-research.md`
- `00d-stack-options.md`
- `00e-requirements-summary.md`
- `04b-blueprint-document.md`
