---
name: changelog
description: Auto-generate a structured changelog from git history and code graph entity mapping.
argument-hint: "[--from <ref>] [--to <ref>] [--format md|json]"
---

Generate a structured changelog from git history, enriched with code graph entity mapping. Groups commits by type, maps changes to business entities, and produces human-readable release notes.

## Content Loading

Load each step through the fetch command (handles caching, decryption, and auth):

```bash
"$HOME/.composure/bin/composure-fetch.mjs" skill composure changelog {step-filename}
```

**Do NOT read cache files directly** — they are encrypted at rest. Always use the fetch command above.

## Steps

| # | File | 
|---|------|
| 1 | `01-gather-commits.md` |
| 2 | `02-entity-mapping.md` |
| 3 | `03-generate-output.md` |
