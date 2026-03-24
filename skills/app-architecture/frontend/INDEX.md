# Frontend Architecture — Index

> **This is a barrel index.** Load files based on the detected `frontend` value from `.claude/no-bandaids.json`.

## Always Load

| File | Contains |
|------|----------|
| [core.md](core.md) | **Routing file** — tells you which reference docs to read for Phases 3-4, 6. Does NOT contain the patterns itself. |
| ALL files in [references/typescript/](references/typescript/) | **The actual patterns** — TanStack Query, hooks, decomposition, component architecture (MUST READ) |
| ALL files in [references/generated/](references/generated/) | **Current API patterns** — TypeScript, shadcn, Tailwind from Context7 (MUST READ) |

## Load by `frontend` value

| `frontend` value | MUST also load | Contains |
|---|---|---|
| `"vite"` | [vite/vite.md](vite/vite.md) + ALL files in [vite/references/generated/](vite/references/generated/) | Phase 5 (SPA shell), Phase 7 (client-side routing), Context7 Vite docs |
| `"angular"` | [angular/angular.md](angular/angular.md) + ALL files in [angular/references/generated/](angular/references/generated/) | Phase 5 (app shell + route guards), Phase 7 (Angular Router), standalone components |
| `"nextjs"` | **Use `fullstack/` instead** — Next.js is full-stack, not frontend-only |
| `"expo"` | **Use `mobile/` instead** — Expo is mobile, not web frontend |
| `null` or other | Nothing extra | Only core patterns apply |

**DO NOT load framework files that don't match.**
