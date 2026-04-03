---
name: app-architecture
description: Complete architecture guide for building features from database to UI. Routes to frontend/, fullstack/, mobile/, backend/, or sdks/ based on detected stack. Covers decomposition, multi-tenant isolation, auth model, query patterns, and component patterns.
---

Read `.claude/no-bandaids.json` and extract:
- `frameworks` — which languages are in use
- `frontend` — which frontend framework (`"vite"`, `"nextjs"`, `"angular"`, `"expo"`, or `null`)
- `backend` — which backend framework (or `null`)

## Content Loading

This skill's content is served from the Composure API. Before reading a step, fetch it:

```bash
"${CLAUDE_PLUGIN_ROOT}/bin/composure-fetch.mjs" skill composure app-architecture {step-filename}
```

Cached content is at `~/.composure/cache/composure/skills/app-architecture/`. If cached, read directly from there.

## Categories

This skill has category-specific content:

- `backend/` — 6 files
- `frontend/` — 16 files
- `fullstack/` — 5 files
- `infra/` — 5 files
- `mobile/` — 7 files
- `sdks/` — 2 files

Fetch category content: `"${CLAUDE_PLUGIN_ROOT}/bin/composure-fetch.mjs" skill composure app-architecture {category}/{filename}`
