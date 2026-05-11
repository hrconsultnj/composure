---
name: app-architecture
description: Architecture guide for feature implementation. Routes by detected stack and by user plan (Free vs Pro/Enterprise).
---

## Plan-aware routing (do this first)

This skill routes differently based on the user's Composure plan. Pro/Enterprise users get the canonical multi-tenant data-patterns catalog; Free users get the generic stack-based architecture content.

### 1. Detect plan

Read `~/.composure/credentials.json` (resolve `<home>` to the absolute home directory; do not use `$HOME` or `~`):

```bash
jq -r '.plan // "free"' <home>/.composure/credentials.json 2>/dev/null
```

Possible values: `"free"`, `"pro"`, `"enterprise"`, or empty / file missing → treat as `"free"`.

### 2. Route

**If plan is `"pro"` or `"enterprise"`:**

The Pro data-patterns catalog at `<plugin-parent>/composure-pro/plugins/pro-patterns/data-patterns/` (or, when shipped via plugin install, `~/.claude/plugins/cache/composure-suite/pro-patterns/<version>/data-patterns/`) is the canonical source. Resolve the path via the helper:

```bash
source <plugin-root>/hooks/lib/resolve-data-patterns.sh
echo "$DATA_PATTERNS_PATH"
```

Then **read the top-level `INDEX.md` first**, identify the relevant category for the work being done, and read **all files in that category's `INDEX.md` mandatory reading list** — not just the one whose title matches the immediate task. The catalog is dependency-ordered:

| Layer | Read when |
|-------|-----------|
| `00-foundation/` | Always — before anything else |
| `10-schema/` | Adding/altering any table |
| `20-auth/` (+ `rls/`) | Touching auth, sessions, permissions, RLS |
| `30-entities/` | Building or extending a domain entity (addresses, inbox, services) |
| `40-frontend/` | Anything in `app/`, `components/`, `hooks/`, `providers/` |

If `DATA_PATTERNS_SOURCE=mcp` (Pro/Enterprise plan but no local copy), call the `composure_fetch_ref` MCP tool with `category: "data-patterns"` to fetch the catalog. If `DATA_PATTERNS_SOURCE=none` (no plan match), fall through to Free routing below.

**If plan is `"free"` (or unknown):** continue with stack-based routing below.

---

## Stack-based routing (Free, or fallback for Pro/Enterprise without a relevant data-pattern)

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
