---
name: app-architecture
description: Complete architecture guide for building features from database to UI. Dynamically loads framework-specific patterns (TypeScript, Python, Go, Rust, C++) based on detected stack. Covers decomposition, multi-tenant isolation, auth model, query patterns, and component patterns.
---

# App Architecture - Complete Feature Building Guide

## Framework Loading (READ FIRST)

This skill dynamically loads framework-specific references based on the project's detected stack.

**How it works:**
1. Read `.claude/no-bandaids.json` for the `frameworks` field
2. For each detected framework, load its references:

| Framework | SKILL.md | Curated Refs | Generated Refs (Context7) |
|---|---|---|---|
| TypeScript | `typescript/SKILL.md` | `typescript/references/universal/` | `typescript/references/generated/` |
| Python | `python/SKILL.md` | `python/references/universal/` | `python/references/generated/` |
| Go | `go/SKILL.md` | `go/references/universal/` | `go/references/generated/` |
| Rust | `rust/SKILL.md` | `rust/references/universal/` | `rust/references/generated/` |
| C++ | `c++/SKILL.md` | `c++/references/universal/` | `c++/references/generated/` |

3. Also check for project-level overrides at `.claude/frameworks/{lang}/*.md`

**Loading priority** (later overrides earlier):
1. This master SKILL.md (universal patterns — decomposition, component tree, quality tools)
2. `{lang}/SKILL.md` (language-specific anti-patterns and patterns)
3. `{lang}/references/universal/` (curated, hand-written reference docs)
4. `{lang}/references/generated/` (Context7 output — latest API patterns)
5. `{lang}/references/private/` (licensed patterns, if submodule initialized)
6. `.claude/frameworks/{lang}/*.md` (project-level overrides)

**If no `frameworks` field exists** in `no-bandaids.json`, default to TypeScript.

**To refresh generated docs:** Run `/composure:init --force`

---

## Overview

This skill provides the **complete architectural foundation** for building applications. It covers the entire feature lifecycle from database schema to UI components, ensuring consistent patterns across all projects.

**Use this skill when:**
- Creating a new feature (database → UI)
- Building pages, routes, or components
- Implementing data fetching patterns (TanStack Query, FastAPI, Go handlers)
- Setting up multi-tenant isolation (RLS, feed fields)
- Understanding why certain patterns exist

## Quick Start: The 7-Phase Workflow

```
Phase 1: Database     → RLS policies, ID prefixes, feed fields
Phase 2: Auth Model   → 4-level auth, privacy groups, roles
Phase 3: Query Keys   → Account-scoped TanStack Query keys
Phase 4: Query Hooks  → useQuery/useMutation with proper patterns
Phase 5: Layout (SSR) → Auth validation, prefetch, hydration
Phase 6: Page (Client)→ Hooks at top, presentational children
Phase 7: Navigation   → Route groups, tabs, UI state
```

---

## Master Decision Tree

### Question 1: What are you building?

```
┌─────────────────────────────────────────────────────────────┐
│                    WHAT ARE YOU BUILDING?                    │
└──────────────────────────┬──────────────────────────────────┘
                           │
           ┌───────────────┼───────────────┐
           ▼               ▼               ▼
    ┌──────────┐    ┌──────────┐    ┌──────────┐
    │ Database │    │   Page   │    │Component │
    │  Table   │    │  /Route  │    │   Only   │
    └────┬─────┘    └────┬─────┘    └────┬─────┘
         │               │               │
         ▼               ▼               ▼
    Phase 1-2       Phase 3-7        Phase 6
    (Data Layer)    (Full Stack)    (UI Only)
```

### Question 2: Is this multi-tenant (account-scoped)?

**YES** → Include `accountId` in ALL query keys + use `!inner()` joins
**NO** → Standard patterns (rare in SaaS apps)

### Question 3: TanStack Query Pattern Selection

Ask these 4 questions IN ORDER:

1. **Need SEO/SSR?** → YES: Pattern C | NO: Q2
2. **Data sources?** → One: Pattern A | Multiple: Pattern B
3. **Multi-tenant?** → YES: Pattern D (accountId in queryKey)
4. **Account switching?** → YES: Add LoadingProvider

---

## Pattern Reference Map

### Data & Auth Patterns

These patterns have full implementation references (migration templates, RLS policies, trigger functions, role hierarchies) available in `references/private/`. If the private references are not populated, the conceptual guidance below and in the phase sections is designed to be fully usable on its own — Claude will follow these patterns based on the descriptions here.

| Pattern | When to Use | Private Reference |
|---------|-------------|-------------------|
| Entity Registry | Store flexible relationships between tenants and resources | [01-entity-registry-feed.md](references/private/data-patterns/01-entity-registry-feed.md) |
| ID Prefixes | Human-readable identifiers on all database tables | [02-id-prefix-convention.md](references/private/data-patterns/02-id-prefix-convention.md) |
| Multi-Level Auth | Layered access control (user → role → privacy → account) | [03-four-level-auth.md](references/private/data-patterns/03-four-level-auth.md) |
| Privacy Groups | Permission hierarchy controlling how users link to accounts | [04-privacy-role-system.md](references/private/data-patterns/04-privacy-role-system.md) |
| Contact-First | User-account linking via contact records for external users | [05-contact-first-pattern.md](references/private/data-patterns/05-contact-first-pattern.md) |
| Metadata | Flexible JSONB columns with typed templates | [08-metadata-templates.md](references/private/data-patterns/08-metadata-templates.md) |

RLS & database security references (also in `references/private/`):
- [rls-patterns.md](references/private/rls-policies/rls-patterns.md) — Complete RLS policy templates
- [role-hierarchy.md](references/private/rls-policies/role-hierarchy.md) — Role-based access patterns
- [migration-checklist.md](references/private/rls-policies/migration-checklist.md) — Migration safety checklist

### UI & Architecture Patterns (reference docs included)

| Pattern | When to Use | Reference File |
|---------|-------------|----------------|
| Query Keys | TanStack Query caching | [06-query-key-conventions.md](references/universal/data-patterns/06-query-key-conventions.md) |
| Components | Single modal, extend-not-rewrite | [07-component-patterns.md](references/universal/data-patterns/07-component-patterns.md) |
| SSR Hydration | Layout auth + prefetch | [09-ssr-hydration-layout.md](references/universal/ui-patterns/09-ssr-hydration-layout.md) |
| Decomposition | No 1000+ line files | [10-component-decomposition.md](references/universal/ui-patterns/10-component-decomposition.md) |
| Route Groups | Auth levels in URLs | [11-route-groups.md](references/universal/ui-patterns/11-route-groups.md) |
| Tabs & Views | External config, view modes | [12-tabs-and-views.md](references/universal/ui-patterns/12-tabs-and-views.md) |
| Icon Patterns | Safe wrapper, dynamic icons (RN) | [13-icon-patterns.md](references/universal/ui-patterns/13-icon-patterns.md) |
| Bottom Sheet Sizing | Dynamic sizing, conditional render (RN) | [14-bottom-sheet-dynamic-sizing.md](references/universal/ui-patterns/14-bottom-sheet-dynamic-sizing.md) |
| Native Modules | No-op stubs, config plugins, phased SDK (RN) | [~/.claude/examples/mobile-patterns/10-native-modules.md](~/.claude/examples/mobile-patterns/10-native-modules.md) |
| Custom UI Components | Themed controls, BottomSheetModal, DateNavigator, calendar, SearchPickerModal (RN) | [15-custom-ui-components.md](references/universal/ui-patterns/15-custom-ui-components.md) |

---

## Phase 1: Database Schema

### Every Table Needs:

1. **ID Prefix Trigger** — Human-readable prefixes (not bare UUIDs)
2. **Feed Field** — Links to entity registry for tenant isolation
3. **RLS Policies** — Row-level security with proper join patterns
4. **Indexes** — On tenant isolation fields and common query fields

> Migration templates, trigger functions, and RLS policy examples are available in the private references. See [01-entity-registry-feed.md](references/private/data-patterns/01-entity-registry-feed.md), [02-id-prefix-convention.md](references/private/data-patterns/02-id-prefix-convention.md), and the [RLS policies directory](references/private/rls-policies/).

---

## Phase 2: Auth & Role Model

### Multi-Level Auth

Design your auth with layered access control:
1. **User exists** — authenticated identity
2. **Role assigned** — what the user can do
3. **Privacy group** — what data scope the role grants
4. **Account link** — how the user connects to tenant data (directly or via contact records)

> Implementation details for auth levels, privacy group tables, and account linking methods are in the private references. See [03-four-level-auth.md](references/private/data-patterns/03-four-level-auth.md) and [04-privacy-role-system.md](references/private/data-patterns/04-privacy-role-system.md).

---

## Phase 3: Query Key Factory

### CRITICAL: Account-Scoped Keys

```typescript
// ✅ CORRECT - includes accountId
['buildings', 'account', accountId]
['tickets', 'account', accountId, 'list', { status: 'open' }]

// ❌ WRONG - cache shared across accounts!
['buildings']
['tickets', 'list']
```

### Query Key Factory Template

```typescript
export const buildingKeys = {
  all: ['buildings'] as const,

  // Account-scoped (REQUIRED for multi-tenant)
  byAccount: (accountId: string) =>
    [...buildingKeys.all, 'account', accountId] as const,

  // Lists
  lists: (accountId: string) =>
    [...buildingKeys.byAccount(accountId), 'list'] as const,
  list: (accountId: string, filters?: BuildingFilters) =>
    [...buildingKeys.lists(accountId), filters] as const,

  // Details
  details: (accountId: string) =>
    [...buildingKeys.byAccount(accountId), 'detail'] as const,
  detail: (accountId: string, id: string) =>
    [...buildingKeys.details(accountId), id] as const,
}
```

**Deep Dive**: See [references/universal/data-patterns/06-query-key-conventions.md](references/universal/data-patterns/06-query-key-conventions.md)

---

## Phase 4: Query Hooks

### useQuery Template (Multi-Tenant)

```typescript
export function useBuildings(accountId: string, filters?: BuildingFilters) {
  const supabase = createBrowserClient()

  return useQuery({
    queryKey: buildingKeys.list(accountId, filters),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('buildings')
        .select(`
          *,
          accounts!inner(id, id_prefix)  // ✅ !inner() for RLS
        `)
        .eq('accounts.id_prefix', accountId)
        .order('created_at', { ascending: false })

      if (error) throw error
      return data
    },
    staleTime: 30 * 1000,
  })
}
```

### useMutation Template

```typescript
export function useCreateBuilding(accountId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: BuildingInsert) => {
      const result = await createBuilding(accountId, data) // Server action
      if (!result.success) throw new Error(result.error)
      return result.data
    },
    onSuccess: () => {
      // ✅ Invalidate account-specific cache
      queryClient.invalidateQueries({
        queryKey: buildingKeys.byAccount(accountId)
      })
      toast.success('Building created')
    },
    onError: (error) => {
      toast.error(error.message)
    }
  })
}
```

**Deep Dive**: See [references/universal/hooks/](references/universal/hooks/) and [references/universal/tanstack-query/](references/universal/tanstack-query/)

---

## Phase 5: Layout (Server Component)

### Protected Layout with SSR Hydration

```typescript
// app/(protected)/layout.tsx
import { redirect } from 'next/navigation'
import { HydrationBoundary, QueryClient, dehydrate } from '@tanstack/react-query'

export default async function ProtectedLayout({ children }) {
  // 1. Validate authentication
  const profile = await getCurrentUserProfile()
  if (!profile) redirect('/auth/login')

  // 2. Create QueryClient for SSR
  const queryClient = new QueryClient()

  // 3. Prefetch common data
  await queryClient.prefetchQuery({
    queryKey: ['user', 'profile'],
    queryFn: () => profile,
  })

  // 4. Hydrate client
  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <LoadingProvider>
        {children}
      </LoadingProvider>
    </HydrationBoundary>
  )
}
```

**Deep Dive**: See [references/universal/ui-patterns/09-ssr-hydration-layout.md](references/universal/ui-patterns/09-ssr-hydration-layout.md)

---

## Phase 6: Page (Client Component)

### Golden Rules

1. **ONE main client component** per page
2. **ALL hooks at top level** (not conditional)
3. **Child components are presentational** (receive props, no hooks)
4. **Handle loading, error, success states**

### Page Template

```typescript
'use client'

export default function BuildingsPage({ params }) {
  const { account_id } = params

  // ═══════════════════════════════════════════
  // ALL HOOKS AT TOP (Critical Rule)
  // ═══════════════════════════════════════════
  const { data: buildings = [], isLoading, error } = useBuildings(account_id)
  const createMutation = useCreateBuilding(account_id)
  const updateMutation = useUpdateBuilding(account_id)

  // ═══════════════════════════════════════════
  // LOCAL STATE
  // ═══════════════════════════════════════════
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState(null)

  // ═══════════════════════════════════════════
  // ERROR STATE
  // ═══════════════════════════════════════════
  if (error) return <ErrorDisplay error={error} />

  // ═══════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════
  return (
    <div className="p-3 sm:p-6">
      <BuildingsHeader
        count={buildings.length}
        onCreateClick={() => setIsModalOpen(true)}
      />

      {isLoading ? (
        <LoadingSkeleton />
      ) : (
        <BuildingsList
          buildings={buildings}
          onEdit={setEditingItem}
        />
      )}

      {isModalOpen && (
        <BuildingModal
          building={editingItem}
          onSubmit={(data) =>
            editingItem
              ? updateMutation.mutate(data)
              : createMutation.mutate(data)
          }
          onClose={() => {
            setIsModalOpen(false)
            setEditingItem(null)
          }}
        />
      )}
    </div>
  )
}
```

**Deep Dive**: See [references/universal/ui-patterns/10-component-decomposition.md](references/universal/ui-patterns/10-component-decomposition.md)

---

## Phase 7: Navigation & Routes

### Route Group Pattern

```
app/
├── (auth)/                    # Unauthenticated routes
│   ├── login/
│   └── signup/
├── (protected)/               # Requires auth
│   ├── layout.tsx             # Auth check + prefetch
│   └── (tenant)/              # Requires account context
│       └── [account_id]/
│           ├── layout.tsx     # Tenant validation
│           ├── buildings/
│           └── tickets/
└── (internal)/                # Admin only
    └── admin/
```

### Tab Navigation Pattern

```typescript
// External tab config
const BUILDING_TABS = [
  { name: 'Overview', href: 'overview', icon: Home },
  { name: 'Units', href: 'units', icon: Building },
  { name: 'Settings', href: 'settings', icon: Settings },
]

// Layout with tabs
export default function BuildingsLayout({ children, params }) {
  return (
    <div className="flex flex-col gap-6 p-3 sm:p-6">
      <TabNavigation
        tabs={BUILDING_TABS}
        basePath={`/app/${params.account_id}/buildings`}
      />
      {children}
    </div>
  )
}
```

**Deep Dive**: See [references/universal/ui-patterns/11-route-groups.md](references/universal/ui-patterns/11-route-groups.md) and [references/universal/ui-patterns/12-tabs-and-views.md](references/universal/ui-patterns/12-tabs-and-views.md)

### Mobile Navigation (expo-router) — Critical Rules

**Rule 1: Every route group needs `_layout.tsx`**

```
(tabs)/
├── (dashboard)/
│   ├── _layout.tsx    ← REQUIRED (Stack wrapping index)
│   └── index.tsx
├── (my-foods)/
│   ├── _layout.tsx    ← REQUIRED
│   └── index.tsx
└── (hidden-route)/
    ├── _layout.tsx    ← REQUIRED (even for hidden routes!)
    └── index.tsx
```

Without `_layout.tsx`, expo-router sees `(dashboard)/index` as the route name, not `(dashboard)`. The `<Tabs.Screen name="(dashboard)">` won't match → tabs break.

**Rule 2: Always render navigators (overlay guards)**

```tsx
// ✅ Auth/loading guards as overlays — navigator always mounted
<View style={{ flex: 1 }}>
  <Stack>...</Stack>
  {showLoading && (
    <View style={{ ...StyleSheet.absoluteFillObject, zIndex: 10 }}>
      <LoadingScreen />
    </View>
  )}
</View>
```

**Deep Dive**: See [mobile-patterns/09-route-groups-tabs.md](~/.claude/examples/mobile-patterns/09-route-groups-tabs.md)

---

## Anti-Patterns to Avoid

### ❌ Database
- Missing human-readable ID prefixes on tables
- No tenant isolation field linking resources to accounts
- RLS policies that don't enforce tenant boundaries on joins
- Hardcoded UUIDs instead of querying lookup tables

### ❌ Query Hooks
- Missing accountId in queryKey (cache leak!)
- Using useState/useEffect for data fetching
- Forgetting cache invalidation on mutations

### ❌ Components
- Creating multiple client components per page
- Hooks in child components (should be presentational)
- Separate create/edit modals (use single with mode)
- Rewriting working components (extend instead)

### ❌ Icons (React Native)
- Raw `Iconify` import (crashes when icon data missing — use safe `Icon` wrapper)
- Switch/case for icon mapping (use `Record<string, string>` map)
- `@/` path alias for icon wrapper (may not resolve in Metro monorepo — use relative imports)

### ❌ Bottom Sheets (React Native)
- **Horizontal slider + `enableDynamicSizing`** — All steps render side-by-side, gorhom measures tallest step, never re-measures on slide. Use conditional rendering instead.
- **Fixed footer outside scroll view + `enableDynamicSizing`** — `flex: 1` has no natural height, footer floats in middle with empty space below. Put buttons inside `BottomSheetScrollView`.
- **Percentage-based `maxDynamicContentSize`** — Doesn't account for status bar, stack header, orientation. Use `screenHeight - insets.top - 56 - 16`.

### ❌ Navigation (Web)
- Bare UUIDs in URLs (use ID prefixes)
- Missing auth checks in layouts
- Forgetting LoadingProvider for account switching

### ❌ Navigation (React Native / expo-router)
- **Missing `_layout.tsx` in route groups** — Every `(group)/` under `(tabs)` MUST have `_layout.tsx` with Stack, or expo-router sees routes as flat `(group)/index` instead of nested `(group)`. Causes "No route named" warnings and broken tab rendering.
- **Conditionally replacing navigator with non-navigator** — NEVER return `<LoadingScreen>` or `<OnboardingScreen>` INSTEAD of `<Slot>`/`<Stack>`/`<Tabs>`. This unmounts the navigator while navigation state expects it → "Maximum update depth exceeded" in NavigationContainer. Use overlay pattern (always render navigator, show guard screen as `absoluteFill + zIndex` overlay).
- Using `router.back()` for list return (unpredictable stack — use `router.replace()`)
- Hardcoded navigation paths (use builder functions like `buildRoutePath()`)

### ❌ Native Modules (Expo Turbo Modules)
- **Writing SDK integration code without compiling against the real SDK** — API surfaces change between versions. Constructor signatures, abstract method requirements, and callback interfaces CANNOT be inferred from docs alone. Always start with a no-op stub, then add real SDK code only when you can compile. **Expect 2-3 EAS build iterations** — this is the normal compile-test-iterate loop.
- **Bare `return@AsyncFunction` in Kotlin** — Expo Modules `AsyncFunction` expects `Any?` return type. A bare `return@AsyncFunction` sends `Unit` → `Return type mismatch: expected 'Any?', actual 'Unit'`. **Always use `return@AsyncFunction null`** for void async functions.
- **Nullable API chains in streaming methods** — `api?.method()?.subscribe()` returns `Disposable?` which can't be stored in `ConcurrentHashMap<String, Disposable>`. **Fix:** `val a = api ?: return@AsyncFunction null` then use non-null `a` throughout.
- **Assuming SDK callback abstract classes cover all interface methods** — e.g., Polar SDK's `PolarBleApiCallback` provides defaults for 10 of 12 interface methods; 2 remain abstract. The compiler tells you exactly which are missing. **Watch for internal package imports** — missing overrides may require types from internal SDK packages (e.g., `com.polar.androidcommunications.api.ble.model.DisInfo`).
- **Using `app.json` for EAS file environment variables** — Static JSON can't read `process.env`. EAS file secrets (like `google-services.json`) need `app.config.ts` with `process.env.GOOGLE_SERVICES_JSON ?? "./google-services.json"`.
- **Assuming `settings.gradle` structure** — Expo SDK 54+ uses `pluginManagement` + `expoAutolinking`, NOT `dependencyResolutionManagement`. Config plugin regex patterns that target the old AGP structure will silently no-op. Always run `npx expo prebuild --no-install` locally to inspect the actual generated files before writing config plugin transforms.
- **Adding SDK dependencies before implementation is ready** — Uncommented dependencies in `build.gradle` that reference uncompilable native code will fail EAS builds. Keep dependencies commented until the native implementation is tested. Use the pattern: `// Uncomment when Phase N is ready: implementation 'com.github.org:sdk:version'`
- **Reading `w:` warnings instead of `e:` errors in build logs** — Lines with `w:` are deprecation warnings from Expo's own packages (not actionable). Only `e:` lines are compilation errors from your code. Don't waste time on warnings.

### ❌ Config Plugins (Expo)
- **Not verifying generated native files** — Always run `npx expo prebuild --no-install` and inspect the actual `android/settings.gradle`, `android/build.gradle`, and `ios/Podfile` before writing regex-based transforms. Delete the generated `android/` and `ios/` dirs after inspection.
- **Hardcoded regex for Gradle structure** — Expo SDK versions change the Gradle file format. What works in SDK 52 may not match in SDK 54. Use Context7 to check current Expo config plugin docs for the target SDK version.
- **Duplicating existing repo declarations** — Check if repositories (JitPack, Maven Central, etc.) are already present in `android/build.gradle` `allprojects.repositories` before injecting them via config plugin.
- **Import `@expo/config-plugins`** — Module not found in SDK 54+. Use `expo/config-plugins` (no @ prefix).

---

## Decomposition Requirements (MANDATORY)

**These are HARD LIMITS enforced by the PostToolUse decomposition hook.** Violations are flagged automatically and must be corrected before continuing.

### Size Limits

| Component Type | Plan at | HARD LIMIT | Decomposition Pattern |
|----------------|---------|------------|----------------------|
| Container/Page | 100 | 150 | Split into child presentation components |
| Presentation | 100 | 150 | Extract sub-sections into focused components |
| Dialog/Modal | 150 | 200 | Multi-step → `steps/Step1.tsx`, `steps/Step2.tsx` + shared `types.ts` |
| Form (complex) | 200 | 300 | Split field groups into sub-forms, extract validation to schema file |
| Hook (query only) | 80 | 120 | Single responsibility — one entity's reads |
| Hook (query + mutations) | 100 | 150 | Split into `use-[entity]-queries.ts` + `use-[entity]-mutations.ts` |
| Types file | 200 | 300 | Group by domain, split into sub-type files |
| Route file (page/layout) | 30 | 50 | Thin wrapper — import container, pass params |
| JSX return block | 60 | 80 | Extract sections into child components (advisory — not hook-enforced) |

### Pre-Write Planning Rules

**BEFORE writing any component**, answer these questions:

1. **Will it exceed 100 lines?** → Plan the folder structure FIRST:
   ```
   feature/
   ├── index.ts              # Barrel export
   ├── types.ts              # All interfaces/types (if >3 types)
   ├── FeatureContainer.tsx   # Container (hooks + orchestration)
   ├── FeatureHeader.tsx      # Presentation
   ├── FeatureList.tsx        # Presentation
   └── FeatureDialog.tsx      # Modal (if needed)
   ```

2. **Will the modal have multiple steps?** → Plan the steps folder:
   ```
   feature-dialog/
   ├── index.ts              # Barrel export
   ├── types.ts              # Step props, form data, shared state
   ├── FeatureDialog.tsx      # Shell — step navigation + shared state
   ├── steps/
   │   ├── BasicInfoStep.tsx  # Step 1
   │   ├── DetailsStep.tsx    # Step 2
   │   └── ReviewStep.tsx     # Step 3
   └── hooks/
       └── use-dialog-state.ts # Step state management (if complex)
   ```

3. **Will the hook have both queries AND mutations?** → Split from the start:
   ```
   hooks/[entity]/
   ├── use-[entity]-queries.ts    # useQuery hooks (reads)
   ├── use-[entity]-mutations.ts  # useMutation hooks (writes + cache invalidation)
   └── types.ts                   # Shared types, filters, inputs
   ```

4. **Will it have >3 type/interface definitions?** → Create `types.ts` immediately.

5. **Will the JSX return exceed 60 lines?** → Identify child components first, write the container that composes them.

6. **Is it a route file (page.tsx)?** → Thin wrapper only (<50 lines):
   ```tsx
   import { FeatureContainer } from './feature-container'
   export default function FeaturePage({ params }) {
     return <FeatureContainer accountId={params.account_id} />
   }
   ```

### Write Decomposed FROM THE START

**DO NOT** write a large component and then decompose it. This wastes time and creates messy diffs.

**Instead:**
1. Plan the component tree on paper (mentally or briefly in a comment)
2. Create the types file first (if needed)
3. Create child presentation components first (small, focused)
4. Create the container last — it composes the children
5. Create the barrel export (index.ts)

### The "220-Line Duplicate" Rule

If you find yourself writing similar rendering logic that already exists elsewhere:
- **STOP** — search for existing components with that pattern
- **REUSE** — import the existing component, pass different props
- **EXTRACT** — if partially similar, extract the shared part into a new component

**Common duplication targets:** message rendering, card layouts, form patterns, table configurations, status badges, loading skeletons.

### Code Quality Toolchain

These tools work together as part of the architecture workflow. They are also available as standalone skills.

| Tool | How to use | When | Output |
|------|-----------|------|--------|
| **Automatic hook** | Fires on Read/Edit/Write | Logs tasks to `tasks-plans/tasks.md` silently | `tasks-plans/tasks.md` (mechanical: EXTRACT, MOVE) |
| `/decomposition-audit` | Invoke manually | Full codebase audit for size violations | `tasks-plans/decomposition-audit-{date}.md` + TaskCreate entries |
| `/review-tasks` | Invoke manually | Process tasks from both sources | TaskCreate entries (synced from files) |
| `/review-tasks sync` | Invoke at session start | Load pending tasks into current session | TaskCreate entries visible in context |
| `/review-tasks delegate` | Invoke to execute | Dispatch parallel sub-agents to fix | Completed tasks in both files |
| `find_large_functions_tool` | MCP tool (code-review-graph) | Query AST graph for oversized functions | Direct query results |

**Task persistence model:**
- **`tasks-plans/tasks.md`** — hook-generated, mechanical (EXTRACT lines X-Y, MOVE types). Survives sessions.
- **`tasks-plans/*.md`** — audit-generated, detailed (HOW to decompose, root causes, phases). Survives sessions.
- **TaskCreate** — session-visible, auto-synced from above files by `/review-tasks sync` or `/decomposition-audit`.

**Typical workflow:**
1. Build features → hook silently logs issues to `tasks-plans/tasks.md`
2. Periodically run `/decomposition-audit` → writes plan to `tasks-plans/`, creates TaskCreate entries
3. Run `/review-tasks sync` at session start → loads pending tasks into context
4. Run `/review-tasks delegate` → agents execute tasks using plan file for guidance
5. Agents mark tasks done in both `tasks-plans/tasks.md` and `tasks-plans/*.md`

---

## Complete Feature Checklist

### Database Layer
- [ ] Migration with human-readable ID prefixes
- [ ] Tenant isolation field linking resources to accounts
- [ ] RLS policy enforcing tenant boundaries
- [ ] Indexes on isolation fields and common query columns

### Query Layer
- [ ] Query key factory with accountId
- [ ] useQuery hook with `!inner()` join
- [ ] useMutation hook with cache invalidation
- [ ] Server action with Zod validation

### UI Layer
- [ ] Layout with auth check + HydrationBoundary
- [ ] Page with all hooks at top
- [ ] Presentational child components
- [ ] Loading, error, success states
- [ ] Mobile responsive (p-3 sm:p-6)

### Navigation
- [ ] Route group for auth level
- [ ] Tab config (if multi-tab feature)
- [ ] Redirect logic for default tab

### Quality
- [ ] `pnpm typecheck` passes
- [ ] `pnpm lint` passes
- [ ] Tested at 320px, 768px, 1024px

---

## Resources

### TypeScript References (`typescript/references/`)

**Curated (`universal/`):**
- [06-query-key-conventions.md](typescript/references/universal/data-patterns/06-query-key-conventions.md) — Account-scoped TanStack Query key factories
- [07-component-patterns.md](typescript/references/universal/data-patterns/07-component-patterns.md) — Single modal, extend-not-rewrite, presentational children
- [09-ssr-hydration-layout.md](typescript/references/universal/ui-patterns/09-ssr-hydration-layout.md)
- [10-component-decomposition.md](typescript/references/universal/ui-patterns/10-component-decomposition.md)
- [11-route-groups.md](typescript/references/universal/ui-patterns/11-route-groups.md)
- [12-tabs-and-views.md](typescript/references/universal/ui-patterns/12-tabs-and-views.md)
- [13-icon-patterns.md](typescript/references/universal/ui-patterns/13-icon-patterns.md)
- [14-bottom-sheet-dynamic-sizing.md](typescript/references/universal/ui-patterns/14-bottom-sheet-dynamic-sizing.md)
- [15-custom-ui-components.md](typescript/references/universal/ui-patterns/15-custom-ui-components.md)
- [quick-reference.md](typescript/references/universal/tanstack-query/quick-reference.md) — TanStack Query
- [pattern-guide.md](typescript/references/universal/tanstack-query/pattern-guide.md)
- [common-patterns.md](typescript/references/universal/hooks/common-patterns.md) — Query hooks
- [multi-tenant-patterns.md](typescript/references/universal/hooks/multi-tenant-patterns.md)

**Generated (`generated/` — via Context7, refreshed by `/composure:init --force`):**
- [shadcn-v4.md](typescript/references/generated/shadcn-v4.md) — oklch theming, @theme inline, CSS variable set
- [vite-8.md](typescript/references/generated/vite-8.md) — Environment API, SPA config
- [tailwind-4.md](typescript/references/generated/tailwind-4.md) — CSS-based config, @custom-variant
- [typescript-5.9.md](typescript/references/generated/typescript-5.9.md) — satisfies, strict flags, erasableSyntaxOnly

**Private (`private/` — submodule, licensed patterns):**
- [01-entity-registry-feed.md](typescript/references/private/data-patterns/01-entity-registry-feed.md) — Entity registry schema
- [02-id-prefix-convention.md](typescript/references/private/data-patterns/02-id-prefix-convention.md) — ID prefix triggers
- [03-four-level-auth.md](typescript/references/private/data-patterns/03-four-level-auth.md) — 4-level auth hierarchy
- [04-privacy-role-system.md](typescript/references/private/data-patterns/04-privacy-role-system.md) — Privacy groups and roles
- [05-contact-first-pattern.md](typescript/references/private/data-patterns/05-contact-first-pattern.md) — Contact-based account linking
- [08-metadata-templates.md](typescript/references/private/data-patterns/08-metadata-templates.md) — JSONB metadata patterns
- [rls-patterns.md](typescript/references/private/rls-policies/rls-patterns.md) — RLS policy templates
- [role-hierarchy.md](typescript/references/private/rls-policies/role-hierarchy.md) — Role-based access patterns
- [migration-checklist.md](typescript/references/private/rls-policies/migration-checklist.md) — Migration safety checklist

### Other Frameworks

Each language has its own `SKILL.md` with anti-patterns and patterns:
- [Python](python/SKILL.md) — Pydantic validation, mypy strict, async patterns
- [Go](go/SKILL.md) — Error handling, generics, context propagation, package decomposition
- [Rust](rust/SKILL.md) — Ownership, clippy, ? operator, unsafe justification
- [C++](c++/SKILL.md) — Smart pointers, RAII, const correctness, modern C++ idioms

Generated docs (populated by `/composure:init --force` via Context7) live in `{lang}/references/generated/`.

### Project-Level Overrides

Users can add project-specific patterns at `.claude/frameworks/{lang}/*.md`. These layer on top of plugin refs and are loaded last (highest priority).
