---
name: app-architecture
description: Complete architecture guide for building multi-tenant SaaS features from database to UI. Use when creating new features, pages, components, database tables, query hooks, or understanding architectural patterns. Covers entity registry, ID prefixes, auth model, RLS policies, TanStack Query, SSR hydration, route groups, and component patterns.
---

# App Architecture - Complete Feature Building Guide

## Overview

This skill provides the **complete architectural foundation** for building multi-tenant SaaS applications. It covers the entire feature lifecycle from database schema to UI components, ensuring consistent patterns across all projects.

**Use this skill when:**
- Creating a new feature (database → UI)
- Building pages, routes, or components
- Implementing data fetching with TanStack Query
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

| Pattern | When to Use | Reference File |
|---------|-------------|----------------|
| Entity Registry | Store flexible relationships | [01-entity-registry-feed.md](references/data-patterns/01-entity-registry-feed.md) |
| ID Prefixes | All database tables | [02-id-prefix-convention.md](references/data-patterns/02-id-prefix-convention.md) |
| 4-Level Auth | Access requirements | [03-four-level-auth.md](references/data-patterns/03-four-level-auth.md) |
| Privacy Groups | Permission hierarchy | [04-privacy-role-system.md](references/data-patterns/04-privacy-role-system.md) |
| Contact-First | User-account linking | [05-contact-first-pattern.md](references/data-patterns/05-contact-first-pattern.md) |
| Query Keys | TanStack Query caching | [06-query-key-conventions.md](references/data-patterns/06-query-key-conventions.md) |
| Components | Single modal, extend-not-rewrite | [07-component-patterns.md](references/data-patterns/07-component-patterns.md) |
| Metadata | JSONB templates | [08-metadata-templates.md](references/data-patterns/08-metadata-templates.md) |
| SSR Hydration | Layout auth + prefetch | [09-ssr-hydration-layout.md](references/ui-patterns/09-ssr-hydration-layout.md) |
| Decomposition | No 1000+ line files | [10-component-decomposition.md](references/ui-patterns/10-component-decomposition.md) |
| Route Groups | Auth levels in URLs | [11-route-groups.md](references/ui-patterns/11-route-groups.md) |
| Tabs & Views | External config, view modes | [12-tabs-and-views.md](references/ui-patterns/12-tabs-and-views.md) |
| Icon Patterns | Safe wrapper, dynamic icons (RN) | [13-icon-patterns.md](references/ui-patterns/13-icon-patterns.md) |
| Bottom Sheet Sizing | Dynamic sizing, conditional render (RN) | [14-bottom-sheet-dynamic-sizing.md](references/ui-patterns/14-bottom-sheet-dynamic-sizing.md) |
| Native Modules | No-op stubs, config plugins, phased SDK (RN) | [~/.claude/examples/mobile-patterns/10-native-modules.md](~/.claude/examples/mobile-patterns/10-native-modules.md) |
| Custom UI Components | Themed controls, BottomSheetModal, DateNavigator, calendar, SearchPickerModal (RN) | [15-custom-ui-components.md](references/ui-patterns/15-custom-ui-components.md) |

---

## Phase 1: Database Schema

### Every Table Needs:

1. **ID Prefix Trigger** - `ACC`, `TKT`, `VEH` (not `acc_`, bare UUIDs)
2. **Feed Field** - Links to `entity_registry` for tenant isolation
3. **RLS Policies** - Use `!inner()` joins for multi-tenant filtering
4. **Indexes** - On `feed`, `id_prefix`, and common query fields

### Migration Template

```sql
-- 1. Create table with feed field
CREATE TABLE {table_name} (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  id_prefix TEXT NOT NULL,
  feed UUID NOT NULL REFERENCES entity_registry(entity_id),
  account_id UUID NOT NULL REFERENCES accounts(id),
  -- your columns...
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Add ID prefix trigger
CREATE TRIGGER set_{table_name}_id_prefix
  BEFORE INSERT ON {table_name}
  FOR EACH ROW
  EXECUTE FUNCTION trigger_set_id_prefix('{PREFIX}');

-- 3. Create indexes
CREATE INDEX idx_{table_name}_feed ON {table_name}(feed);
CREATE INDEX idx_{table_name}_id_prefix ON {table_name}(id_prefix);
CREATE INDEX idx_{table_name}_account_id ON {table_name}(account_id);

-- 4. Enable RLS
ALTER TABLE {table_name} ENABLE ROW LEVEL SECURITY;

-- 5. Create RLS policy
CREATE POLICY "tenant_isolation_{table_name}"
  ON {table_name} FOR ALL
  USING (account_id = auth.jwt() ->> 'account_id');
```

**Deep Dive**: See [references/rls-policies/](references/rls-policies/) for complete RLS patterns.

---

## Phase 2: Auth & Role Model

### 4-Level Auth Hierarchy

```
1. User exists ──► users table (linked to auth.users)
2. Role assigned ► user_roles lookup table
3. Privacy group ► role_privacy lookup table
4. Account link ─► Direct OR via contact (based on privacy)
```

### Privacy Groups → Account Link

| Privacy Level | Account Link Method |
|---------------|---------------------|
| Internal (0) | `account_id` SET DIRECTLY on user |
| Tenant (1) | `contact_id` SET → derive from contact |
| External (2) | `contact_id` SET → derive from contact |

**Deep Dive**: See [references/data-patterns/03-four-level-auth.md](references/data-patterns/03-four-level-auth.md)

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

**Deep Dive**: See [references/data-patterns/06-query-key-conventions.md](references/data-patterns/06-query-key-conventions.md)

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

**Deep Dive**: See [references/hooks/](references/hooks/) and [references/tanstack-query/](references/tanstack-query/)

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

**Deep Dive**: See [references/ui-patterns/09-ssr-hydration-layout.md](references/ui-patterns/09-ssr-hydration-layout.md)

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

**Deep Dive**: See [references/ui-patterns/10-component-decomposition.md](references/ui-patterns/10-component-decomposition.md)

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

**Deep Dive**: See [references/ui-patterns/11-route-groups.md](references/ui-patterns/11-route-groups.md) and [references/ui-patterns/12-tabs-and-views.md](references/ui-patterns/12-tabs-and-views.md)

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
- Forgetting ID prefix trigger
- Missing feed field for tenant isolation
- RLS without `!inner()` joins
- Hardcoded UUIDs (query lookup tables instead)

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
- [ ] Migration with ID prefix trigger
- [ ] Feed field for entity registry
- [ ] RLS policy with `!inner()` joins
- [ ] Indexes on feed, id_prefix, account_id

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

### Data & Auth Patterns (1-8)
- [01-entity-registry-feed.md](references/data-patterns/01-entity-registry-feed.md)
- [02-id-prefix-convention.md](references/data-patterns/02-id-prefix-convention.md)
- [03-four-level-auth.md](references/data-patterns/03-four-level-auth.md)
- [04-privacy-role-system.md](references/data-patterns/04-privacy-role-system.md)
- [05-contact-first-pattern.md](references/data-patterns/05-contact-first-pattern.md)
- [06-query-key-conventions.md](references/data-patterns/06-query-key-conventions.md)
- [07-component-patterns.md](references/data-patterns/07-component-patterns.md)
- [08-metadata-templates.md](references/data-patterns/08-metadata-templates.md)

### UI & Architecture Patterns (9-15)
- [09-ssr-hydration-layout.md](references/ui-patterns/09-ssr-hydration-layout.md)
- [10-component-decomposition.md](references/ui-patterns/10-component-decomposition.md)
- [11-route-groups.md](references/ui-patterns/11-route-groups.md)
- [12-tabs-and-views.md](references/ui-patterns/12-tabs-and-views.md)
- [13-icon-patterns.md](references/ui-patterns/13-icon-patterns.md)
- [14-bottom-sheet-dynamic-sizing.md](references/ui-patterns/14-bottom-sheet-dynamic-sizing.md)
- [15-custom-ui-components.md](references/ui-patterns/15-custom-ui-components.md) — Themed controls replacing native: CalendarPickerSheet, DateNavigator, TagSheet, BrandedDialog, SearchPickerModal (address-picker autocomplete), BottomSheetModal patterns

### TanStack Query Deep Dives
- [references/tanstack-query/quick-reference.md](references/tanstack-query/quick-reference.md)
- [references/tanstack-query/pattern-guide.md](references/tanstack-query/pattern-guide.md)
- [references/tanstack-query/pattern-examples.md](references/tanstack-query/pattern-examples.md)

### RLS & Database Security
- [references/rls-policies/rls-patterns.md](references/rls-policies/rls-patterns.md)
- [references/rls-policies/role-hierarchy.md](references/rls-policies/role-hierarchy.md)
- [references/rls-policies/migration-checklist.md](references/rls-policies/migration-checklist.md)

### Query Hook Generation
- [references/hooks/common-patterns.md](references/hooks/common-patterns.md)
- [references/hooks/multi-tenant-patterns.md](references/hooks/multi-tenant-patterns.md)

### Mobile Native Modules
- [~/.claude/examples/mobile-patterns/10-native-modules.md](~/.claude/examples/mobile-patterns/10-native-modules.md) — No-op stub pattern, config plugins, phased SDK integration
