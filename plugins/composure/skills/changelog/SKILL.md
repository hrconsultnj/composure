---
name: changelog
description: Auto-generate a structured changelog from git history and code graph entity mapping.
argument-hint: "[--from <ref>] [--to <ref>] [--format md|json]"
---

Generate a structured changelog from git history, enriched with code graph entity mapping. Groups commits by type, maps changes to business entities, and produces human-readable release notes.

## Content Loading

This skill's content is served from the Composure API. Before reading a step, fetch it:

```bash
"${CLAUDE_PLUGIN_ROOT}/bin/composure-fetch.mjs" skill composure changelog {step-filename}
```

Cached content is at `~/.composure/cache/composure/skills/changelog/`. If cached, read directly from there.

## Steps

| # | File | 
|---|------|
| 1 | `01-gather-commits.md` |
| 2 | `02-entity-mapping.md` |
| 3 | `03-generate-output.md` |
