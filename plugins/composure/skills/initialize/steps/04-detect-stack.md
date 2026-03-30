# Step 4: Detect Stack

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
        "typescript": "5.9", "react": "19.2", "next": "16.1",
        "tailwindcss": "4.2", "shadcn": "4.1", "supabase-js": "2.93"
      }
    },
    "supabase": {
      "paths": ["apps/web", "apps/mobile"],
      "frontend": null,
      "backend": "supabase",
      "versions": { "supabase-js": "2.93" }
    },
    "python": {
      "paths": ["services/api", "scripts"],
      "frontend": null,
      "backend": "fastapi",
      "versions": { "python": "3.12", "fastapi": "0.115", "pydantic": "2.12" }
    },
    "go": {
      "paths": ["services/worker"],
      "frontend": null,
      "backend": "stdlib",
      "versions": { "go": "1.23" }
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
| `@supabase/supabase-js` or `supabase/config.toml` | `"supabase"` |
| `express` | `"express"` |
| `fastify` | `"fastify"` |
| `hono` | `"hono"` |
| `nestjs` | `"nestjs"` |
| `fastapi` (Python) | `"fastapi"` |
| `django` (Python) | `"django"` |
| `gin` / `echo` / `chi` (Go) | `"gin"` / `"echo"` / `"chi"` |
| `axum` / `actix-web` (Rust) | `"axum"` / `"actix"` |
| Go stdlib only | `"stdlib"` |
| `prisma` or `@prisma/client` | `"prisma"` |
| `drizzle-orm` | `"drizzle"` |
| Raw `pg` / `postgres` / `mysql2` / `mongoose` | `"postgresql"` / `"mysql"` / `"mongodb"` |
| None detected | `null` |

**Supabase is a backend, not just a client SDK.** When `@supabase/supabase-js` is detected, create a separate `"supabase"` entry in `frameworks` — this routes to `backend/supabase/` docs (RLS policies, auth helpers, realtime, edge functions). The `supabase-js` version can also appear in the frontend's `versions` for client-side reference, but the backend entry is what loads the database patterns.

**A project can have BOTH a frontend backend and a data backend.** For example, Next.js (frontend: `"nextjs"`) + Supabase (backend: `"supabase"`) are separate framework entries — they don't conflict.

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

---

**Next:** Read `steps/05-extensions-skip-patterns.md`
