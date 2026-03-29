# Step 3a: Context7 — Folder Structure and Library Mapping

**If `--skip-context7` was passed, skip to** `steps/04-generate-config.md`.

**This step is required.** Claude's training data is 10+ months behind. Context7 provides the current API surface. Use `--skip-context7` only in offline/CI environments.

**Query from the main conversation** — MCP tool permissions are session-scoped and not delegated to subagents. Querying here avoids the ~80-100K token overhead of bootstrapping each subagent only for MCP calls to be denied.

## Freshness check (skip recent docs)

Before querying Context7 for a library, check if a generated doc already exists for it:

```bash
stat -f "%m" {file} 2>/dev/null || stat -c "%Y" {file} 2>/dev/null
```

- **If the doc exists and is < 7 days old**: skip that library. Report: "{library} docs are fresh ({N} days old) — skipping"
- **If the doc exists and is >= 7 days old**: regenerate it
- **If `--force` is passed**: regenerate docs >= 7 days old. Docs < 7 days old are STILL skipped — there's no reason to re-query what was just generated
- **If the doc doesn't exist**: generate it

## Create the categorized folder structure

**Determine the root:**
- Composure plugin repo (has `skills/app-architecture/`) — `skills/app-architecture/`
- User project (normal case) — `.claude/frameworks/`

**Create `{root}/{category}/{framework}/generated/` and `{root}/{category}/{framework}/project/` directories** based on detected stack. Only create directories for what's actually detected. Run `mkdir -p` for each.

For a Next.js + Expo + Supabase + AI SDK monorepo:
```
.claude/frameworks/
+-- frontend/
|   +-- generated/              <-- Context7: typescript, shadcn, tailwind, tanstack-query
|   +-- project/                <-- team-written frontend conventions
+-- fullstack/nextjs/
|   +-- generated/              <-- Context7: nextjs
|   +-- project/                <-- team-written Next.js conventions
+-- mobile/expo/
|   +-- generated/              <-- Context7: expo-sdk
|   +-- project/
+-- backend/supabase/
|   +-- generated/              <-- Context7: supabase-js
|   +-- project/
+-- sdks/
    +-- generated/              <-- Context7: ai-sdk, zod
    +-- project/
```

For a Vite + Python FastAPI project:
```
.claude/frameworks/
+-- frontend/
|   +-- generated/              <-- typescript, shadcn, tailwind
|   +-- project/
+-- frontend/vite/
|   +-- generated/              <-- vite
|   +-- project/
+-- backend/python/
|   +-- generated/              <-- fastapi, pydantic
|   +-- project/
+-- sdks/
    +-- generated/              <-- zod
    +-- project/
```

**After creating directories**, generate an `INDEX.md` in each framework folder:

```markdown
# {Framework} -- {Category}

## generated/
Context7-sourced reference docs. Auto-populated by `/composure:initialize`.
Do NOT edit -- will be overwritten on next `--force` run.

| Doc | Library | Version | Queried |
|-----|---------|---------|---------|
| {filename} | {lib} | {ver} | {date} |

## project/
Team-written conventions, decisions, and overrides.
These complement the generated docs -- Claude reads BOTH.
Add `.md` files here for project-specific patterns.
```

**NEVER create a flat `{root}/typescript/` directory.** Libraries are distributed by category.

## Build the library task list

From the detected stack, build a list of `{ library, version, outputPath, focusAreas }` tuples.

Files use numbered prefixes (`{NN}-{name}.md`) where the number is the **priority** — lower = more foundational, loaded first. See `GENERATED-DOC-TEMPLATE.md` for the full convention.

```
Library detected        ->  Output path
FRONTEND (shared)
  typescript            ->  frontend/generated/01-typescript-{ver}.md
  react                 ->  frontend/generated/02-react-{ver}.md
  tailwindcss           ->  frontend/generated/03-tailwind-{ver}.md
  shadcn/ui             ->  frontend/generated/04-shadcn-{ver}.md
  tanstack-query        ->  frontend/generated/05-tanstack-query-{ver}.md

FRONTEND (framework-specific)
  vite                  ->  frontend/vite/generated/01-vite-{ver}.md
  @angular/core, router ->  frontend/angular/generated/01-angular-{ver}.md

FULLSTACK
  next.js               ->  fullstack/nextjs/generated/01-nextjs-{ver}.md

MOBILE
  expo, expo-router     ->  mobile/expo/generated/01-expo-{ver}.md
  react-native          ->  mobile/expo/generated/02-react-native-{ver}.md

BACKEND
  supabase-js           ->  backend/supabase/generated/01-supabase-{ver}.md
  fastapi               ->  backend/python/generated/01-fastapi-{ver}.md
  pydantic              ->  backend/python/generated/02-pydantic-{ver}.md
  django                ->  backend/python/generated/01-django-{ver}.md
  go stdlib             ->  backend/go/generated/01-go-{ver}.md
  gin, echo, chi        ->  backend/go/generated/02-{framework}-{ver}.md
  axum, actix-web       ->  backend/rust/generated/01-{framework}-{ver}.md

SDKs (cross-cutting)
  ai-sdk                ->  sdks/generated/01-ai-sdk-{ver}.md
  zod                   ->  sdks/generated/02-zod-{ver}.md
  stripe                ->  sdks/generated/03-stripe-{ver}.md
  resend                ->  sdks/generated/04-resend-{ver}.md
  clerk                 ->  sdks/generated/05-clerk-{ver}.md
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

---

**Next:** Read `steps/03b-context7-query-loop.md`
