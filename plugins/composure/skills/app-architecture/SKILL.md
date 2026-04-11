---
name: app-architecture
description: Architecture guide for feature implementation. Routes by detected stack.
---

Read `.composure/no-bandaids.json` (or `.claude/no-bandaids.json` for existing projects) and extract:
- `frameworks` — which languages are in use
- `frontend` — which frontend framework (`"vite"`, `"nextjs"`, `"angular"`, `"expo"`, or `null`)
- `backend` — which backend framework (or `null`)

## Content Loading

**Preferred (MCP tool):**

Invoke the `composure_fetch_skill` MCP tool with:
- `plugin`: `"composure"`
- `skill`: `"app-architecture"`
- `step`: the step filename without the `.md` extension (category content uses `"{category}/{filename}"`)


**Fallback (Bash CLI — for sandbox environments where MCP servers are not available):**

```bash
<home>/.composure/bin/composure-fetch.mjs skill composure app-architecture {step-filename}
```

Replace `<home>` with the user's **resolved absolute home directory** (e.g., `/Users/username` on macOS, `/home/username` on Linux). Do NOT use `$HOME`, `~`, or quotes — Claude Code permissions require the literal path.

**Do NOT read cache files directly** — they are encrypted at rest. Always use one of the methods above.

## Categories

This skill has category-specific content:

- `backend/` — 6 files
- `frontend/` — 16 files
- `fullstack/` — 5 files
- `infra/` — 5 files
- `mobile/` — 7 files
- `sdks/` — 2 files

Fetch category content via the `composure_fetch_skill` MCP tool with `step="{category}/{filename}"`, or fall back to the Bash CLI: `<home>/.composure/bin/composure-fetch.mjs skill composure app-architecture {category}/{filename}`
