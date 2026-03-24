# Page & Component Pattern Guide

## The Decision Tree (Use This Every Time)

When creating a new page, ask these questions **in order**:

### 1. Does this page need SEO/SSR? (Public-facing, searchable content)

**YES** → Use Server Component + Client Component pattern
```
app/[feature]/page.tsx          (Server Component - SSR)
app/[feature]/[feature]-client.tsx (Client Component - TanStack Query)
```

**NO** → Use Client Component only
```
app/[feature]/page.tsx          (Client Component - TanStack Query)
```

### 2. How many data sources does this page have?

**One data source** (e.g., just a list of buildings)
```tsx
// One useQuery hook in the main client component
const { data, isLoading } = useBuildings()
```

**Multiple related data sources** (e.g., buildings + stats + filters)
```tsx
// Multiple useQuery hooks in the main client component
const { data: buildings } = useBuildings()
const { data: stats } = useBuildingStats()
const { data: filters } = useBuildingFilters()
```

**Multiple INDEPENDENT sections** (e.g., dashboard with 5 different widgets)
```tsx
// Split into feature components (still client components)
<DashboardClient>
  <BuildingsWidget />  {/* Has its own useQuery */}
  <UsersWidget />      {/* Has its own useQuery */}
  <RevenueWidget />    {/* Has its own useQuery */}
</DashboardClient>
```

### 3. Does this page have mutations? (Create/Edit/Delete)

**YES** → Add useMutation hooks
```tsx
const createMutation = useCreateBuilding()
const updateMutation = useUpdateBuilding()
```

**NO** → Just use useQuery hooks

### 4. Does this have app-level loading? (Account switching, navigation)

**YES** → Use LoadingProvider context
```tsx
const { setAccountSwitchLoading } = useLoadingContext()
```

**NO** → Use query loading states only
```tsx
const { isLoading } = useQuery(...)
```

## Pattern Examples

### Pattern A: Simple Page (One Data Source)

**Use when:**
- Single list/table/view
- No SEO needed
- Basic CRUD

```
app/buildings/
├── page.tsx                    (Client Component)
└── components/
    ├── buildings-table.tsx     (Presentational)
    └── create-building-form.tsx (Presentational)
```

### Pattern B: Complex Page (Multiple Sections)

**Use when:**
- Dashboard-like page
- Multiple independent data sources
- Each section can load independently

```
app/dashboard/
├── page.tsx                    (Client Component - Layout)
└── components/
    ├── buildings-section.tsx   (Client - has useQuery)
    ├── users-section.tsx       (Client - has useQuery)
    └── revenue-section.tsx     (Client - has useQuery)
```

### Pattern C: SEO/SSR Page

**Use when:**
- Public-facing content
- Needs metadata
- Search engine visibility

```
app/blog/[slug]/
├── page.tsx                    (Server Component)
├── blog-post-client.tsx        (Client Component)
└── components/
    ├── post-content.tsx        (Presentational)
    └── comments-section.tsx    (Client - has useQuery)
```

### Pattern D: Multi-Tenant Page

**Use when:**
- Data scoped to account
- Account switching
- Feed field filtering

```
app/[account_id]/buildings/
├── page.tsx                    (Client Component)
└── components/
    ├── buildings-list.tsx      (Presentational)
    └── account-switcher.tsx    (Uses LoadingProvider)
```

## Real Examples

See the companion files:
- `pattern-a-simple-page.tsx` - Simple buildings list
- `pattern-b-complex-page.tsx` - Dashboard with multiple sections
- `pattern-c-seo-page.tsx` - Blog post with SSR
- `pattern-d-multi-tenant.tsx` - Account-scoped data

## Quick Decision Matrix

| Scenario | Server Component? | Client Component? | TanStack Query? | LoadingProvider? |
|----------|------------------|-------------------|-----------------|------------------|
| Simple list page | Optional (SSR) | ✅ Required | ✅ Yes | Maybe |
| Complex dashboard | No | ✅ Required | ✅ Yes | Maybe |
| Public blog post | ✅ Required | ✅ Required | ✅ Yes (client) | No |
| Settings page | No | ✅ Required | ✅ Yes | No |
| Account switching | No | ✅ Required | ✅ Yes | ✅ Yes |
| Static about page | ✅ Only this | No | No | No |

## Component Split Guidelines

### ✅ DO Split When:

- Different sections load independently
- Components are reusable across pages
- Clear separation of concerns (list vs form vs filters)

### ❌ DON'T Split When:

- Just to avoid 'use client' (artificial split)
- Data/state needs to be shared between splits
- Creates prop drilling hell

## The Rules

### Rule 1: One Main Client Component
**Every interactive page has ONE main client component** that coordinates all TanStack Query hooks.

### Rule 2: Child Components Are Presentational
**Child components receive data/callbacks as props** - they don't fetch data themselves (unless independent sections).

### Rule 3: TanStack Query = Client Only
**If you use useQuery/useMutation, the component MUST have 'use client'**.

### Rule 4: Server Components Are Optional
**Use server components for SSR/SEO benefits, not because you "should"**.

### Rule 5: LoadingProvider ≠ Query Loading
**LoadingProvider is for app-level orchestration (navigation, account switching), NOT individual queries**.

## When to Ask Claude

Ask these questions when creating new pages:

### "Should this be a server or client component?"
Answer: If it uses TanStack Query hooks → Client Component

### "Do I need to split this into multiple files?"
Answer: Only if:
- You have multiple INDEPENDENT sections (dashboard widgets)
- Components are reused across pages
- NOT just to separate server/client

### "Where do I put the useQuery hooks?"
Answer: In the main client component (one place)

### "Should I use LoadingProvider here?"
Answer: Only if:
- Account switching
- Navigation transitions
- Multi-step app operations
NOT for individual query loading states

### "Can I combine multiple queries in one component?"
Answer: YES! That's the point - TanStack Query handles all the state

## Template Checklist

When creating a new page, copy this checklist:

```markdown
New Page: _______________

- [ ] Needs SEO/SSR? (Y/N)
- [ ] Number of data sources: ___
- [ ] Has mutations? (Y/N)
- [ ] Uses account switching? (Y/N)
- [ ] Independent sections? (Y/N)

Pattern to use: ___ (A/B/C/D)

File structure:
- [ ] page.tsx (server/client)
- [ ] [feature]-client.tsx (if SSR)
- [ ] Query hooks created in src/hooks/query/
- [ ] Presentational components in components/

TanStack Query hooks needed:
- [ ] useQuery: ___
- [ ] useMutation: ___
- [ ] useInfiniteQuery: ___
```
