---
name: app-architecture
description: Complete architecture guide for building features from database to UI. Routes to frontend/, fullstack/, mobile/, backend/, or sdks/ based on detected stack. Covers decomposition, multi-tenant isolation, auth model, query patterns, and component patterns.
---

Read `.composure/no-bandaids.json` (or `.claude/no-bandaids.json` for existing projects) and extract:
- `frameworks` — which languages are in use
- `frontend` — which frontend framework (`"vite"`, `"nextjs"`, `"angular"`, `"expo"`, or `null`)
- `backend` — which backend framework (or `null`)

## Content Loading

This skill's content is cached locally. Read steps from cache first, fetch only if missing:

```bash
"~/.composure/bin/composure-fetch.mjs" skill composure app-architecture {step-filename}
```

**Read from `~/.composure/cache/composure/skills/app-architecture/` first.** Only run the fetch command above if the cached file is missing.

## Categories

This skill has category-specific content:

- `backend/` — 6 files
- `frontend/` — 16 files
- `fullstack/` — 5 files
- `infra/` — 5 files
- `mobile/` — 7 files
- `sdks/` — 2 files

Fetch category content: `"~/.composure/bin/composure-fetch.mjs" skill composure app-architecture {category}/{filename}`
