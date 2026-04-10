---
name: blueprint
description: Pre-work assessment: classify, scope, impact analysis, implementation specs.
argument-hint: "[feature description] [--skip-graph] [--quick]"
---

Structured "think before building" step — from requirements discovery through implementation planning. Like building a house: the architect surveys the land and gathers requirements (Phase 0), then draws the blueprint with structural specs (Phase 1). One skill, two phases.

## Progress Tracking

This skill uses TaskCreate for progress tracking. Before starting work:
1. Create one task per major step using TaskCreate
2. Set each task to `in_progress` when starting it (TaskUpdate)
3. Mark `completed` when done
4. Write deliverables to files, not inline — inline text is for communication only

## Content Loading

Load each step through the fetch command (handles caching, decryption, and auth):

```bash
<home>/.composure/bin/composure-fetch.mjs skill composure blueprint {step-filename}
```

Replace `<home>` with the user's **resolved absolute home directory** (e.g., `/Users/username` on macOS, `/home/username` on Linux). Do NOT use `$HOME`, `~`, or quotes — Claude Code permissions require the literal path.

**Do NOT read cache files directly** — they are encrypted at rest. Always use the fetch command above.

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
