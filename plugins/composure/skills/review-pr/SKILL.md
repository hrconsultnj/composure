---
name: review-pr
description: PR review with code graph, quality audit, and security checks.
argument-hint: "[PR number or branch name]"
---

Perform a comprehensive, graph-powered code review of a pull request. Uses verification discipline ("comments with receipts") — every finding is verified against the code graph or source before inclusion.

## Progress Tracking

This skill uses TaskCreate for progress tracking. Before starting work:
1. Create one task per major step using TaskCreate
2. Set each task to `in_progress` when starting it (TaskUpdate)
3. Mark `completed` when done
4. Write deliverables to files, not inline — inline text is for communication only

## Content Loading

**Preferred (MCP tool):**

Invoke the `composure_fetch_skill` MCP tool with:
- `plugin`: `"composure"`
- `skill`: `"review-pr"`
- `step`: the step filename without the `.md` extension


**Fallback (Bash CLI — for sandbox environments where MCP servers are not available):**

```bash
<home>/.composure/bin/composure-fetch.mjs skill composure review-pr {step-filename}
```

Replace `<home>` with the user's **resolved absolute home directory** (e.g., `/Users/username` on macOS, `/home/username` on Linux). Do NOT use `$HOME`, `~`, or quotes — Claude Code permissions require the literal path.

**Do NOT read cache files directly** — they are encrypted at rest. Always use one of the methods above.

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
