---
name: audit
description: Full codebase health audit with scored report and letter grades.
argument-hint: "[path or glob pattern] [--threshold N] [--quick]"
---

Comprehensive codebase assessment that produces a scored health report with letter grades across 5 categories: Architecture, Security, Code Quality, Dependencies, and Test Coverage.

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
- `skill`: `"audit"`
- `step`: the step filename without the `.md` extension


**Fallback (Bash CLI — for sandbox environments where MCP servers are not available):**

```bash
<home>/.composure/bin/composure-fetch.mjs skill composure audit {step-filename}
```

Replace `<home>` with the user's **resolved absolute home directory** (e.g., `/Users/username` on macOS, `/home/username` on Linux). Do NOT use `$HOME`, `~`, or quotes — Claude Code permissions require the literal path.

**Do NOT read cache files directly** — they are encrypted at rest. Always use one of the methods above.

## Steps

| # | File | 
|---|------|
| 1 | `00-bootstrap.md` |
| 2 | `01-size-structure.md` |
| 3 | `02-decomposition.md` |
| 4 | `03-architecture.md` |
| 5 | `04-security.md` |
| 6 | `05-quality.md` |
| 7 | `06-dependencies.md` |
| 8 | `07-score-report.md` |
