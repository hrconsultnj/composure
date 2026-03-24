# Frontend Core — What to Load

> **This file does NOT contain the patterns. It tells you WHERE to find them. You MUST read the referenced files — skipping them will result in incorrect code.**

## Phases 3-4: Query Layer

**MUST READ** these files for query key factories, hooks, mutations, and cache invalidation:

| File | What you'll learn |
|------|-------------------|
| `references/typescript/data-patterns/06-query-key-conventions.md` | Account-scoped query key factory pattern, hierarchical key structure |
| `references/typescript/hooks/common-patterns.md` | 10 real-world useQuery/useMutation patterns (pagination, CRUD, infinite scroll, search, prefetching) |
| `references/typescript/hooks/multi-tenant-patterns.md` | Account-scoped queries, account switching, feed field joins |
| `references/typescript/hooks/cache-invalidation-guide.md` | When and how to invalidate — granular vs broad, optimistic updates |
| `references/typescript/tanstack-query/quick-reference.md` | Decision tree: which TanStack Query pattern to use |
| `references/typescript/tanstack-query/pattern-guide.md` | Pattern A-D with full implementation templates |

**Do NOT write query hooks without reading these files first.** The patterns handle edge cases (account switching, cache leaks, stale data) that summaries miss.

## Phase 6: Page Component Architecture

**MUST READ** these files for component structure, decomposition, and UI patterns:

| File | What you'll learn |
|------|-------------------|
| `references/typescript/10-component-decomposition.md` | Size limits (enforced by hook), folder structure templates, pre-write planning rules, barrel exports |
| `references/typescript/data-patterns/07-component-patterns.md` | Single modal pattern, extend-not-rewrite, presentational children, loading states |

## Generated Reference Docs

**MUST READ** all files in `references/generated/` — these contain current API patterns from Context7:

| File | What you'll learn |
|------|-------------------|
| `references/generated/typescript-5.9.md` | satisfies, const type params, erasableSyntaxOnly, strict flags |
| `references/generated/shadcn-v4.md` | oklch theming, @theme inline, CLI v4, registry system |
| `references/generated/tailwind-4.md` | CSS-based config, @theme, @custom-variant, Vite plugin |

## Anti-Patterns (Universal)

These apply to ALL frontend frameworks (Vite, Next.js, Expo, Angular):

- ❌ Missing accountId in queryKey — cache leaks across tenants
- ❌ Using useState/useEffect for data fetching — use TanStack Query
- ❌ Multiple client components per page — ONE container with hooks, children are presentational
- ❌ Hooks in child components — children receive props only
- ❌ Separate create/edit modals — single modal with mode
- ❌ Rewriting working components — extend instead
- ❌ Bare UUIDs in URLs — use ID prefixes
