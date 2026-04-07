---
name: app-architecture
description: Complete architecture guide for building features from database to UI. Routes to frontend/, fullstack/, mobile/, backend/, or sdks/ based on detected stack. Covers decomposition, multi-tenant isolation, auth model, query patterns, and component patterns.
---

Read `.composure/no-bandaids.json` (or `.claude/no-bandaids.json` for existing projects) and extract:
- `frameworks` — which languages are in use
- `frontend` — which frontend framework (`"vite"`, `"nextjs"`, `"angular"`, `"expo"`, or `null`)
- `backend` — which backend framework (or `null`)

## Content Loading

Load each step through the fetch command (handles caching, decryption, and auth):

```bash
"$HOME/.composure/bin/composure-fetch.mjs" skill composure app-architecture {step-filename}
```

**Do NOT read cache files directly** — they are encrypted at rest. Always use the fetch command above.

## Categories

This skill has category-specific content:

- `backend/` — 6 files
- `frontend/` — 16 files
- `fullstack/` — 5 files
- `infra/` — 5 files
- `mobile/` — 7 files
- `sdks/` — 2 files

Fetch category content: `"$HOME/.composure/bin/composure-fetch.mjs" skill composure app-architecture {category}/{filename}`
