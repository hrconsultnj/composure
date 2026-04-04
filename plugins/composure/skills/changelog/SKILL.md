---
name: changelog
description: Auto-generate a structured changelog from git history and code graph entity mapping.
argument-hint: "[--from <ref>] [--to <ref>] [--format md|json]"
---

Generate a structured changelog from git history, enriched with code graph entity mapping. Groups commits by type, maps changes to business entities, and produces human-readable release notes.

## Content Loading

This skill's content is cached locally. Read steps from cache first, fetch only if missing:

```bash
"~/.composure/bin/composure-fetch.mjs" skill composure changelog {step-filename}
```

**Read from `~/.composure/cache/composure/skills/changelog/` first.** Only run the fetch command above if the cached file is missing.

## Steps

| # | File | 
|---|------|
| 1 | `01-gather-commits.md` |
| 2 | `02-entity-mapping.md` |
| 3 | `03-generate-output.md` |
