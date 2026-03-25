---
name: initialize
description: Detect project stack and generate Composure config (.claude/no-bandaids.json, task queue, framework reference docs). Run once per project.
argument-hint: "[--force] [--dry-run] [--skip-context7]"
---

# Composure Initialize

Bootstrap Composure project-level configuration by detecting the tech stack, querying up-to-date framework patterns, and generating appropriate configs.

## Arguments

- `--force` — Overwrite existing `.claude/no-bandaids.json` and regenerate framework docs even if they exist
- `--dry-run` — Show what would be generated without writing files
- `--skip-context7` — Skip Context7 queries (for offline/CI use)

## Workflow

### Step 0: Ensure MCP Servers

#### 0a. composure-graph (bundled)

The `composure-graph` MCP server is **bundled with the Composure plugin** — it is NOT an npm package. Do NOT try to install it via npm/pip/cargo. It is declared in the plugin's `plugin.json` and auto-registered when the plugin is installed.

1. Check if it's available by calling `list_graph_stats`
2. **If available**: report "composure-graph MCP: ready"
3. **If NOT available**, diagnose the problem:
   - Run `node --version` via Bash
   - **If Node < 22.5.0**: tell the user:
     > "composure-graph requires Node 22.5 or newer (for built-in SQLite support). You have Node {version}. Please update Node, then exit Claude Code (Ctrl+C) and reopen it with `claude`."
   - **If Node >= 22.5.0**: tell the user:
     > "The composure-graph MCP server isn't starting. Exit Claude Code (Ctrl+C) and reopen it with `claude` to restart the plugin's MCP server. If the problem persists, verify the plugin is installed by running `claude plugin list`."
   - **STOP.** Do NOT continue without the graph. Do NOT offer alternatives or workarounds.

#### 0b. Context7

Context7 provides up-to-date library documentation. Step 3 uses it to generate framework reference docs.

1. Check if Context7 is already available by running:
   ```bash
   claude mcp list 2>/dev/null | grep -i context7
   ```
2. If **not found** (no output or command fails), install it:
   ```bash
   claude mcp add context7 -- npx -y @upstash/context7-mcp@latest
   ```
3. Report: "Context7 MCP: already installed" or "Context7 MCP: installed"
4. If the `claude mcp add` command fails (e.g., CLI not available, permissions), note it and continue — use `--skip-context7` to skip Step 3

### Step 1: Detect Stack

Read these files from the project root to identify the stack:

| File | What to extract |
|------|----------------|
| `package.json` (root + workspaces) | Framework, key dependencies, scripts, package manager |
| `tsconfig.json` | TypeScript version, strict mode, target |
| `turbo.json` or `pnpm-workspace.yaml` | Monorepo detection |
| `apps/*/package.json` | Per-app frameworks (Next.js, Expo, Vite, etc.) |
| `packages/*/package.json` | Shared packages with type exports |
| `supabase/config.toml` | Supabase detection |
| `next.config.*` | Next.js version and config |
| `app.json` or `app.config.*` | Expo SDK version |
| `requirements.txt` / `pyproject.toml` / `setup.py` | Python detection + dependencies |
| `go.mod` | Go detection + version |
| `Cargo.toml` | Rust detection + edition |
| `CMakeLists.txt` / `Makefile` | C++ detection |
| `Dockerfile` / `docker-compose.yml` | Container detection |
| `*.tf` files | Terraform/IaC detection |

Build a stack profile:

```json
{
  "monorepo": true,
  "packageManager": "pnpm",
  "frameworks": {
    "typescript": {
      "paths": ["apps/web", "apps/mobile", "packages/shared"],
      "frontend": "nextjs",
      "backend": null,
      "versions": {
        "typescript": "5.9",
        "react": "19.2",
        "next": "16.1",
        "tailwindcss": "4.2",
        "shadcn": "4.1"
      }
    },
    "python": {
      "paths": ["services/api", "scripts"],
      "frontend": null,
      "backend": "fastapi",
      "versions": {
        "python": "3.12",
        "fastapi": "0.115",
        "pydantic": "2.12"
      }
    },
    "go": {
      "paths": ["services/worker"],
      "frontend": null,
      "backend": "stdlib",
      "versions": {
        "go": "1.23"
      }
    }
  },
  "typegenScript": "pnpm --filter @myapp/database generate"
}
```

**Frontend detection rules** (check `package.json` dependencies in each path):

| Dependency | `frontend` value |
|-----------|-----------------|
| `next` | `"nextjs"` |
| `vite` (without `next`) | `"vite"` |
| `expo` or `expo-router` | `"expo"` |
| `@angular/core` | `"angular"` |
| `nuxt` | `"nuxt"` |
| `svelte` or `@sveltejs/kit` | `"svelte"` |
| `astro` | `"astro"` |
| None detected | `null` |

**Backend detection rules** (check `package.json` dependencies or language-specific config):

| Dependency / File | `backend` value |
|------------------|----------------|
| `express` | `"express"` |
| `fastify` | `"fastify"` |
| `hono` | `"hono"` |
| `nestjs` | `"nestjs"` |
| `fastapi` (Python) | `"fastapi"` |
| `django` (Python) | `"django"` |
| `gin` / `echo` / `chi` (Go) | `"gin"` / `"echo"` / `"chi"` |
| `axum` / `actix-web` (Rust) | `"axum"` / `"actix"` |
| Go stdlib only | `"stdlib"` |
| None detected | `null` |

**Important**: In monorepos, different paths may have different frontends. When `paths` includes both `apps/web` (Next.js) and `apps/mobile` (Expo), split into separate entries:

```json
{
  "monorepo": true,
  "frameworks": {
    "typescript": {
      "paths": ["apps/web", "packages/shared"],
      "frontend": "nextjs",
      "backend": null,
      "versions": { "next": "16.1", "react": "19.2" }
    },
    "typescript-mobile": {
      "paths": ["apps/mobile"],
      "frontend": "expo",
      "backend": null,
      "versions": { "expo": "54", "react-native": "0.79" }
    }
  }
}
```

For single-framework projects, `frameworks` has one key:
```json
{
  "monorepo": false,
  "frameworks": {
    "typescript": {
      "paths": ["."],
      "frontend": "vite",
      "backend": null,
      "versions": { "typescript": "5.9", "vite": "8.0", "react": "19.2" }
    }
  }
}
```

**Detecting typegenHint**: Look for type generation scripts in order:
1. A `generate` script in any package that produces `*.types.ts` or `database.types.ts`
2. A `supabase gen types` command in any script
3. A `prisma generate` command in any script
4. A `graphql-codegen` command in any script
5. If found, format as the full command from root (e.g., `pnpm --filter @scope/pkg generate`)

### Step 2: Resolve Extensions and Skip Patterns

Based on detected frameworks (merged across all detected languages):

| Framework | Extensions | Skip Patterns |
|-----------|-----------|---------------|
| TypeScript + React | `.ts`, `.tsx`, `.js`, `.jsx` | `*.d.ts`, `*.generated.*`, `*.gen.*` |
| + Vue | add `.vue` | — |
| + Svelte | add `.svelte` | — |
| + Supabase | — | add `database.types.ts` |
| + Prisma | — | add `*.prisma-client.*` |
| + GraphQL Codegen | — | add `*.generated.ts`, `__generated__/*` |
| Python | `.py` | `__pycache__/*`, `*.pyc`, `.venv/*` |
| Go | `.go` | `vendor/*`, `*_test.go` (for no-bandaids only) |
| Rust | `.rs` | `target/*` |
| C++ | `.cpp`, `.cc`, `.cxx`, `.hpp`, `.h` | `build/*`, `cmake-build-*/*` |

### Step 3: Query Context7 and Generate Framework Reference Docs (MANDATORY)

**This step is required.** Claude's training data is 10+ months behind. Context7 provides the current API surface. Use `--skip-context7` only in offline/CI environments.

**Query from the main conversation** — MCP tool permissions are session-scoped and not delegated to subagents. The main conversation already has Context7 loaded and permitted, so querying here avoids the ~80-100K token overhead of bootstrapping each subagent only for MCP calls to be denied. Batch multiple tool calls per message for parallelism within a single turn.

#### 3a. Create the categorized folder structure

**Determine the root:**
- Composure plugin repo (has `skills/app-architecture/`) → `skills/app-architecture/`
- User project (normal case) → `.claude/frameworks/`

**Create `{root}/{category}/{framework}/generated/` and `{root}/{category}/{framework}/project/` directories** based on detected stack. Only create directories for what's actually detected. Run `mkdir -p` for each.

For a Next.js + Expo + Supabase + AI SDK monorepo:

```
.claude/frameworks/
├── frontend/
│   ├── generated/              ← Context7: typescript, shadcn, tailwind, tanstack-query
│   └── project/                ← team-written frontend conventions
├── fullstack/nextjs/
│   ├── generated/              ← Context7: nextjs
│   └── project/                ← team-written Next.js conventions
├── mobile/expo/
│   ├── generated/              ← Context7: expo-sdk
│   └── project/
├── backend/supabase/
│   ├── generated/              ← Context7: supabase-js
│   └── project/
└── sdks/
    ├── generated/              ← Context7: ai-sdk, zod
    └── project/
```

For a Vite + Python FastAPI project:

```
.claude/frameworks/
├── frontend/
│   ├── generated/              ← typescript, shadcn, tailwind
│   └── project/
├── frontend/vite/
│   ├── generated/              ← vite
│   └── project/
├── backend/python/
│   ├── generated/              ← fastapi, pydantic
│   └── project/
└── sdks/
    ├── generated/              ← zod
    └── project/
```

**After creating directories**, generate an `INDEX.md` in each framework folder:

```markdown
# {Framework} — {Category}

## generated/
Context7-sourced reference docs. Auto-populated by `/composure:initialize`.
Do NOT edit — will be overwritten on next `--force` run.

| Doc | Library | Version | Queried |
|-----|---------|---------|---------|
| {filename} | {lib} | {ver} | {date} |

## project/
Team-written conventions, decisions, and overrides.
These complement the generated docs — Claude reads BOTH.
Add `.md` files here for project-specific patterns.
```

**NEVER create a flat `{root}/typescript/` directory.** Libraries are distributed by category.

#### 3b. Build the library task list

From the detected stack, build a list of `{ library, version, outputPath, focusAreas }` tuples:

**Library → category mapping:**

Files use numbered prefixes (`{NN}-{name}.md`) where the number is the **priority** — lower = more foundational, loaded first. See `GENERATED-DOC-TEMPLATE.md` for the full convention.

```
Library detected        →  Output path
────────────────────────────────────────────────────────────────────────────
FRONTEND (shared)
  typescript            →  frontend/generated/01-typescript-{ver}.md
  react                 →  frontend/generated/02-react-{ver}.md
  tailwindcss           →  frontend/generated/03-tailwind-{ver}.md
  shadcn/ui             →  frontend/generated/04-shadcn-{ver}.md
  tanstack-query        →  frontend/generated/05-tanstack-query-{ver}.md

FRONTEND (framework-specific)
  vite                  →  frontend/vite/generated/01-vite-{ver}.md
  @angular/core, router →  frontend/angular/generated/01-angular-{ver}.md

FULLSTACK
  next.js               →  fullstack/nextjs/generated/01-nextjs-{ver}.md

MOBILE
  expo, expo-router     →  mobile/expo/generated/01-expo-{ver}.md
  react-native          →  mobile/expo/generated/02-react-native-{ver}.md

BACKEND
  supabase-js           →  backend/supabase/generated/01-supabase-{ver}.md
  fastapi               →  backend/python/generated/01-fastapi-{ver}.md
  pydantic              →  backend/python/generated/02-pydantic-{ver}.md
  django                →  backend/python/generated/01-django-{ver}.md
  go stdlib             →  backend/go/generated/01-go-{ver}.md
  gin, echo, chi        →  backend/go/generated/02-{framework}-{ver}.md
  axum, actix-web       →  backend/rust/generated/01-{framework}-{ver}.md

SDKs (cross-cutting)
  ai-sdk                →  sdks/generated/01-ai-sdk-{ver}.md
  zod                   →  sdks/generated/02-zod-{ver}.md
  stripe                →  sdks/generated/03-stripe-{ver}.md
  resend                →  sdks/generated/04-resend-{ver}.md
  clerk                 →  sdks/generated/05-clerk-{ver}.md
```

**Example for a Next.js + Expo monorepo project:**

```
.claude/frameworks/
├── frontend/generated/
│   ├── 01-typescript-5.9.md
│   ├── 02-react-19.md
│   ├── 03-tailwind-4.md
│   ├── 04-shadcn-v4.md
│   └── 05-tanstack-query-5.90.md
├── fullstack/nextjs/generated/
│   └── 01-nextjs-16.md
├── mobile/expo/generated/
│   ├── 01-expo-sdk55.md
│   └── 02-react-native-0.79.md
├── backend/supabase/generated/
│   └── 01-supabase-v2.md
└── sdks/generated/
    ├── 01-ai-sdk-v6.md
    └── 02-zod-v4.md
```

**Create directories as needed** — `mkdir -p` before writing each file. The category structure mirrors the plugin's `skills/app-architecture/` layout so the same INDEX.md routing logic works for both plugin-shipped and project-level docs.

**Per-framework focus areas:**

| Detected stack | Libraries to Query | Focus Areas |
|---|---|---|
| TypeScript (always) | typescript, tailwindcss | Type patterns, satisfies, CSS variables |
| TypeScript + React | + react, shadcn/ui | Hooks rules, component patterns (skip for Angular) |
| `frontend: "vite"` | + vite, react-router or tanstack-router | SPA config, Environment API, client-side routing |
| `frontend: "angular"` | + @angular/core, @angular/router | Standalone components, signals, functional guards, zoneless |
| `frontend: "nextjs"` | + next.js | App Router, Server Components, Server Actions, proxy.ts |
| `frontend: "expo"` | + expo, expo-router, react-native | Navigation, native modules, EAS build |
| Python backend | fastapi, pydantic, sqlalchemy, django | Pydantic v2 patterns, async patterns, type hints |
| Go backend | stdlib, gin/echo/chi, cobra | Error handling, generics, context propagation |
| Rust backend | std, axum/actix-web, clap, serde | Ownership, error handling with ?, trait patterns |
| C++ | — (use web search) | Smart pointers, RAII, const correctness |

**Only include libraries matching the detected `frontend`/`backend` values.** Do not query Next.js for a Vite project.

#### 3c. Query Context7 from the main conversation

> **Why not subagents?** MCP tool permissions are session-scoped and NOT delegated to
> subagents — even with `bypassPermissions` or `auto` mode. Subagents can discover
> tools via `ToolSearch` but cannot call them. Each agent also inherits ~80-100K tokens
> of context overhead. The main conversation already has Context7 loaded and permitted,
> making it both cheaper and reliable.

**Read the template first**: Read `skills/app-architecture/GENERATED-DOC-TEMPLATE.md` — it defines
the exact structure, frontmatter, sections, and rules for generated docs.

**Per-library workflow:**

1. Call `resolve-library-id` with `libraryName="{library}"` — pick the highest benchmark score
   with "High" reputation. If a version-specific ID exists, prefer it.
2. Call `query-docs` (BROAD): setup, key patterns, breaking changes.
   Focus areas: `{focusAreas}`
3. Call `query-docs` (TARGETED): query specifically for the focus areas that the first
   query didn't fully cover — anti-patterns, migration steps, advanced config
4. If results are still sparse, try a DIFFERENT library ID from the resolve results
   (e.g., /websites/ variant instead of /org/repo) and query again

**Parallelism strategy**: Batch all `resolve-library-id` calls together in one message (they're independent). Then batch all `query-docs` calls (they depend on resolved IDs, but are independent of each other).

**Example**: For a Vite + React + Tailwind + shadcn project:

```
Message 1 (parallel): resolve-library-id × 4 (typescript, shadcn, tailwind, vite)
Message 2 (parallel): query-docs × 4 (broad, one per library using resolved IDs)
Message 3 (parallel): query-docs × 4 (targeted, for gaps from message 2)
```

This achieves similar parallelism to subagents without the MCP permission barrier or token overhead.

#### 3d. Format, validate, and write

After collecting all Context7 results:

1. **Format** each library's results into the template structure (from `GENERATED-DOC-TEMPLATE.md`)
2. **Validate** before writing:
   - If Context7 returned no data after 3+ attempts → skip, report as "no Context7 data available"
   - If `resolve-library-id` returned no results → skip, report as "library not found in Context7"
   - If `context7_library_id` in frontmatter would be `manual`, `n/a`, or missing → **REJECT**. Report as "fabricated, discarded"
   - If the content contains no code blocks from Context7 → **REJECT** — likely fabricated
3. **Create directories** — `mkdir -p` for each output path
4. **Write** validated files
5. **Report** which docs were written, which returned NO_DATA, and which were rejected

**MUST rules (non-negotiable):**
- MUST source ALL content from Context7 query-docs results. NEVER use training data.
- MUST include a valid `context7_library_id` in frontmatter — the exact ID from `resolve-library-id`.
  NEVER use "manual", "n/a", or placeholders.
- MUST NOT fabricate. If Context7 returns nothing after 3 attempts, skip the library.
  An empty result is correct. A fabricated document is a defect.
- Aim for 200-500 lines — be thorough with complete code examples from Context7.
- Do NOT give up after one empty query — try different IDs and different query phrasings.

**While querying Context7**: proceed with Steps 4-6 (config, graph, task queue) between query batches where possible.

**If Context7 is unavailable** (`--skip-context7`): skip this entire step. The plugin ships with curated reference docs as fallback.

### Step 4: Generate Config

Create `.claude/no-bandaids.json`:

```json
{
  "extensions": [".ts", ".tsx", ".js", ".jsx", ".py", ".go"],
  "skipPatterns": ["*.d.ts", "*.generated.*", "__pycache__/*"],
  "disabledRules": [],
  "typegenHint": "pnpm --filter @myapp/database generate",
  "frameworks": {
    "typescript": {
      "paths": ["apps/web"],
      "frontend": "vite",
      "backend": null,
      "versions": { "typescript": "5.9", "react": "19.2", "vite": "8.0" }
    },
    "python": {
      "paths": ["services/api"],
      "frontend": null,
      "backend": "fastapi",
      "versions": { "python": "3.12", "fastapi": "0.115" }
    }
  },
  "generatedRefsRoot": ".claude/frameworks"
}
```

The `frameworks` field tells `no-bandaids.sh` which rules to apply based on file path and extension. The `frontend` and `backend` fields control which reference docs and architecture patterns get loaded — preventing Next.js patterns from bleeding into Vite projects, and vice versa.

`generatedRefsRoot` points to where Context7-generated docs live for this project. For user projects this is `.claude/frameworks/` (project-level). For the composure plugin repo itself, it's `skills/app-architecture/`. Generated docs are distributed into `frontend/`, `fullstack/`, `mobile/`, or `backend/` subfolders based on the library-to-path mapping in Step 3.

### Step 5: Build Code Graph

If the composure-graph MCP server is available (check if `composure-graph` tools like `list_graph_stats` are callable):

1. Call `list_graph_stats` to check if a graph already exists
2. If no graph exists (`last_updated` is null), call `build_or_update_graph({ full_rebuild: true })` to do an initial full build
3. Report: "Graph built: N files, M nodes, K edges" or "Graph already exists: N nodes, last updated X"
4. If the MCP tools aren't available, skip and note: "Code review graph not configured — run /build-graph manually after plugin setup"

### Step 6: Ensure Task Queue

Create `tasks-plans/` directory and `tasks-plans/tasks.md` if they don't exist:

```markdown
# Code Quality Tasks

> Auto-populated by Composure's PostToolUse hook. Process with `/review-tasks`.

## Critical

## High

## Moderate
```

### Step 7: Report

Print a summary:

```
Composure initialized for <project-name>

Stack detected:
  - TypeScript 5.9 (strict) — apps/web, apps/mobile
  - Python 3.12 + FastAPI 0.115 — services/api
  - Go 1.23 — services/worker
  - Monorepo (pnpm workspaces)

Generated:
  ✓ .claude/no-bandaids.json (6 extensions, 8 skip patterns, 3 frameworks)
  ✓ tasks-plans/tasks.md (task queue ready)

Framework reference docs (.claude/frameworks/ — categorized):
  ✓ .claude/frameworks/frontend/generated/ (3 docs: 01-typescript-5.9, 03-tailwind-4, 04-shadcn-v4)
  ✓ .claude/frameworks/frontend/vite/generated/ (1 doc: 01-vite-8)
  ✓ .claude/frameworks/backend/python/generated/ (3 docs: 01-fastapi-0.115, 02-pydantic-2.12, 03-python-3.12)
  ✓ .claude/frameworks/backend/go/generated/ (1 doc: 01-go-1.23)

Code review graph:
  ✓ 153 nodes, 883 edges, 23 files (last updated: 2026-03-23)

Active hooks:
  - PreToolUse: architecture trigger, no-bandaids (multi-framework)
  - PostToolUse: decomposition check, graph update

Available skills:
  /app-architecture    — Feature building guide (loads framework-specific refs)
  /decomposition-audit — Codebase size violation scan
  /review-tasks        — Process accumulated quality tasks
  /review-pr           — PR review with impact analysis
  /review-delta        — Changes since last commit
  /build-graph         — Build/update code review graph
```

## Notes

- This skill is idempotent — running it again updates the config based on current stack
- With `--force`, it overwrites config AND regenerates all framework reference docs
- With `--dry-run`, it prints what would be generated without writing files
- With `--skip-context7`, it skips Context7 queries (framework docs not generated)
- The skill does NOT modify CLAUDE.md — that's the project's responsibility
- If the project already has a `.claude/no-bandaids.json`, skip generation unless `--force`
- Generated framework docs are `.gitignored` by default — users can `git add -f` to commit them
- Project-level generated docs go to `.claude/frameworks/{category}/{framework}/generated/` (e.g., `.claude/frameworks/fullstack/nextjs/generated/nextjs-16.md`)
- Users can also add hand-written project-specific patterns at `.claude/frameworks/{category}/*.md` which layer on top of plugin refs
- To contribute patterns back to the plugin: move from project `generated/` to plugin `references/` and submit a PR
