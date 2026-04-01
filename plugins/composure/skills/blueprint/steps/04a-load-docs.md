# Step 4a: Load Architecture Docs

**Skip if `--quick` or classification is `bug-fix`.**

Read `.claude/no-bandaids.json` for stack info. Load architecture docs from `/app-architecture` based on classification and which files are being changed.

## What to load

| Classification | What to load |
|---|---|
| `new-feature` | Full `/app-architecture` skill — all categories relevant to the stack |
| `enhancement` | Only the categories matching affected files (see category mapping below) |
| `refactor` | `frontend/core.md` for decomposition rules + the category matching affected files |
| `migration` | The category matching the migrated framework + Query Context7 for the target version's migration guide |

## Category mapping

Match changed files to the right architecture category:

| Changed files involve | Load category | What it contains |
|---|---|---|
| `.tsx`, `.jsx`, React components, hooks, UI | `frontend/` | Core patterns, React best practices, shadcn conventions, TypeScript |
| API routes, server logic, database, auth | `backend/` | Core patterns, language-specific guides (Go, Python, Rust, C/C++) |
| Next.js app router, server components, server actions | `fullstack/nextjs/` | Next.js specific patterns and conventions |
| React Native, Expo, mobile screens | `mobile/` | Expo, Kotlin, Swift guides |
| AI SDK, external SDK integrations | `sdks/` | AI SDK validation rules, SDK integration patterns |

If changed files span multiple categories (e.g., a feature touches both `frontend/` and `backend/`), load both.

Each category has an `INDEX.md` — read that first to understand what sub-docs are available, then load the relevant ones.

---

**Next:** Read `04b-write-blueprint.md`
