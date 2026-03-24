# Full-Stack Architecture — Index

> **This is a barrel index.** Load files based on the detected `frontend` value from `.claude/no-bandaids.json`.

## Always Also Load

Full-stack frameworks still use frontend patterns. **You MUST also load `frontend/INDEX.md`** and follow its "Always Load" instructions — read `core.md` (routing file), then ALL files in `references/typescript/` and `references/generated/`.

## Load by `frontend` value

| `frontend` value | MUST load | Contains |
|---|---|---|
| `"nextjs"` | [nextjs/nextjs.md](nextjs/nextjs.md) + ALL files in [nextjs/references/](nextjs/references/) | Phase 5 (SSR layout), Phase 7 (route groups), Server Components, SSR hydration, Context7 Next.js docs |

**DO NOT load these for pure frontend frameworks** (Vite) or mobile (Expo).
