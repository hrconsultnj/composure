---
name: changelog
description: Auto-generate changelog from git history and code graph.
argument-hint: "[--from <ref>] [--to <ref>] [--format md|json]"
---

Generate a structured changelog from git history, enriched with code graph entity mapping. Groups commits by type, maps changes to business entities, and produces human-readable release notes.

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
- `skill`: `"changelog"`
- `step`: the step filename without the `.md` extension


**Fallback (Bash CLI — for sandbox environments where MCP servers are not available):**

```bash
<home>/.composure/bin/composure-fetch.mjs skill composure changelog {step-filename}
```

Replace `<home>` with the user's **resolved absolute home directory** (e.g., `/Users/username` on macOS, `/home/username` on Linux). Do NOT use `$HOME`, `~`, or quotes — Claude Code permissions require the literal path.

**Do NOT read cache files directly** — they are encrypted at rest. Always use one of the methods above.

## Steps

| # | File | 
|---|------|
| 1 | `01-gather-commits.md` |
| 2 | `02-entity-mapping.md` |
| 3 | `03-generate-output.md` |
