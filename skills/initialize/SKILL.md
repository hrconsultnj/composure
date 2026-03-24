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

### Step 0: Ensure Context7 MCP

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

**Use parallel agents** — spawn one agent per library group. Each agent independently resolves the library ID, queries Context7, and writes the generated doc. This prevents sequential bottlenecks when multiple libraries are detected.

#### 3a. Build the library task list

From the detected stack, build a list of `{ library, version, outputPath, focusAreas }` tuples:

**Output path mapping** (relative to `skills/app-architecture/`):

```
Library detected        →  Output path
────────────────────────────────────────────────────────────────────────────
typescript, react       →  frontend/references/generated/{lib}-{ver}.md
shadcn/ui, tailwindcss  →  frontend/references/generated/{lib}-{ver}.md
vite                    →  frontend/vite/references/generated/vite-{ver}.md
@angular/core, router   →  frontend/angular/references/generated/{lib}-{ver}.md
next.js                 →  fullstack/nextjs/references/generated/nextjs-{ver}.md
expo, expo-router       →  mobile/expo/references/generated/{lib}-{ver}.md
react-native            →  mobile/expo/references/generated/react-native-{ver}.md
fastapi, pydantic       →  backend/python/references/generated/{lib}-{ver}.md
django                  →  backend/python/references/generated/{lib}-{ver}.md
go stdlib, gin, echo    →  backend/go/references/generated/{lib}-{ver}.md
axum, actix-web         →  backend/rust/references/generated/{lib}-{ver}.md
```

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

#### 3b. Spawn parallel agents

Group libraries by output directory, then spawn **one Agent per group** using the Agent tool. All agents run in parallel (`run_in_background: true`, `mode: "bypassPermissions"`).

**`bypassPermissions` is required** — agents need to write generated docs without prompting. These are auto-generated reference files, not user code.

Each agent receives this prompt:

```
You are generating a Context7 reference doc for {library} {version}.

**Read the template first**: Read `skills/app-architecture/GENERATED-DOC-TEMPLATE.md` — it defines
the exact structure, frontmatter, sections, and rules you MUST follow.

Then:
1. Call `resolve-library-id` with libraryName="{library}" — pick the highest benchmark score
   with "High" reputation. If a version-specific ID exists, prefer it.
2. Call `query-docs` (BROAD): setup, key patterns, breaking changes
   Focus areas: {focusAreas}
3. Call `query-docs` (TARGETED): query specifically for the focus areas that the first
   query didn't fully cover — anti-patterns, migration steps, advanced config
4. If results are still sparse, try a DIFFERENT library ID from the resolve results
   (e.g., /websites/ variant instead of /org/repo) and query again
5. Read the existing file at {outputPath} (if it exists)
6. Write the result to: {outputPath} following the template structure exactly

Rules from the template apply:
- Only include what Context7 returns — do NOT invent patterns
- Aim for 200-500 lines — be thorough with complete code examples
- Code examples must come from Context7
- If Context7 returns no results after 3 attempts, skip the file entirely
- Do NOT give up after one empty query — try different IDs and different query phrasings
```

**Example**: For a Vite + React + Tailwind + shadcn project, spawn 4 agents in parallel:

```
Agent 1: typescript 5.9   → frontend/references/generated/typescript-5.9.md
Agent 2: shadcn/ui 4.1    → frontend/references/generated/shadcn-v4.md
Agent 3: tailwindcss 4.2  → frontend/references/generated/tailwind-4.md
Agent 4: vite 8.0         → frontend/vite/references/generated/vite-8.md
```

For a Next.js + React + Tailwind project, spawn 4 agents:

```
Agent 1: typescript 5.9   → frontend/references/generated/typescript-5.9.md
Agent 2: shadcn/ui 4.1    → frontend/references/generated/shadcn-v4.md
Agent 3: tailwindcss 4.2  → frontend/references/generated/tailwind-4.md
Agent 4: next.js 16.1     → fullstack/nextjs/references/generated/nextjs-16.md
```

#### 3c. Wait and report

After all agents complete, collect results and report which docs were written, how many Context7 snippets each received, and any failures.

**While agents are running**: Tell the user what's happening. Example:

```
Generating framework reference docs (4 agents running in parallel)...
  - typescript 5.9   → frontend/references/generated/
  - shadcn/ui 4.1    → frontend/references/generated/
  - tailwindcss 4.2  → frontend/references/generated/
  - vite 8.0         → frontend/vite/references/generated/

Continue with Steps 4-6 while agents finish. Results will be reported in Step 7.
```

**Do NOT wait for agents to finish before proceeding** to Steps 4-6 (config generation, graph build, task queue). These are independent. Only Step 7 (Report) needs agent results.

**First-time users**: The plugin ships with the folder skeleton (`frontend/`, `fullstack/`, `mobile/`, `backend/` with README placeholders). Agents write into these existing directories. No manual setup needed.

**If Context7 is unavailable** (`--skip-context7`): skip this entire step. The plugin ships with curated reference docs in `frontend/references/typescript/` as fallback.

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
  "generatedRefsRoot": "skills/app-architecture"
}
```

The `frameworks` field tells `no-bandaids.sh` which rules to apply based on file path and extension. The `frontend` and `backend` fields control which reference docs and architecture patterns get loaded — preventing Next.js patterns from bleeding into Vite projects, and vice versa. The `generatedRefsRoot` points to the architecture skill root; generated docs are distributed into `frontend/`, `fullstack/`, `mobile/`, or `backend/` subfolders based on the library-to-path mapping in Step 3.

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

Framework reference docs (distributed by architecture category):
  ✓ frontend/references/generated/ (3 docs: typescript-5.9, shadcn-v4, tailwind-4)
  ✓ frontend/vite/references/generated/ (1 doc: vite-8)
  ✓ backend/python/references/generated/ (3 docs: python-3.12, fastapi-0.115, pydantic-2.12)
  ✓ backend/go/references/generated/ (1 doc: go-1.23)

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
- Users can also add project-specific patterns at `.claude/frameworks/{lang}/*.md` which layer on top of plugin refs
- To contribute patterns back to the plugin: move from `generated/` to `references/universal/` and submit a PR
