# Full-Stack Architecture — Index

> **This is a barrel index.** Load files based on the detected `frontend` value from `.claude/no-bandaids.json`.

## Always Also Load

Full-stack frameworks still use frontend patterns. **You MUST also load `frontend/INDEX.md`** and follow its "Always Load" instructions — read `core.md` (routing file), then ALL files in `typescript/`.

## Load by `frontend` value

| `frontend` value | MUST load | Contains |
|---|---|---|
| `"nextjs"` | [nextjs/nextjs.md](nextjs/nextjs.md) + ALL `*.md` files in [nextjs/](nextjs/) | Phase 5 (SSR layout), Phase 7 (route groups), Server Components, SSR hydration |

**DO NOT load these for pure frontend frameworks** (Vite) or mobile (Expo).

## Project-Level Docs

Also check `.claude/frameworks/fullstack/nextjs/` for project-specific docs:
- `generated/` — Context7 docs (nextjs)
- `project/` — team-written conventions
