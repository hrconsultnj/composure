# TanStack Query Quick Reference

**Print this out and keep it by your desk!**

## The 5 Questions (Ask Every Time)

### 1. Is this a Layout or Page?
- **Layout + Auth Required** → Pattern E (Protected Layout SSR)
- **Layout + No Auth** → Simple Server Component
- **Page** → Go to question 2

### 2. Does this need SEO/SSR?
- **YES** → Pattern C (Server + Client)
- **NO** → Go to question 3

### 3. How many data sources?
- **One** → Pattern A (Simple Page)
- **Multiple related** → Pattern A (Multiple hooks)
- **Multiple independent** → Pattern B (Dashboard)

### 4. Is this multi-tenant?
- **YES** → Pattern D (Account-scoped)
- **NO** → Continue with pattern from Q3

### 5. Account switching involved?
- **YES** → Add LoadingProvider
- **NO** → Just use TanStack Query loading states

## The 5 Patterns at a Glance

| Pattern | File | Use When | Structure |
|---------|------|----------|-----------|
| **A: Simple** | `pattern-a-simple-page.tsx` | One entity, basic CRUD | `page.tsx` (client) |
| **B: Dashboard** | `pattern-b-complex-page.tsx` | Multiple independent sections | `page.tsx` (layout) + sections |
| **C: SEO** | `pattern-c-seo-page.tsx` | Public content, needs metadata | `page.tsx` (server) + `*-client.tsx` |
| **D: Multi-Tenant** | `pattern-d-multi-tenant.tsx` | Account-scoped data | `[account_id]/page.tsx` |
| **E: Protected Layout** | `pattern-e-protected-layout-ssr.md` | Authenticated layouts with SSR | `layout.tsx` (server + HydrationBoundary) |

## Code Templates

### Pattern A: Simple Page
```tsx
'use client'

export default function MyPage() {
  const { data, isLoading } = useMyData()
  const mutation = useMyMutation()

  if (isLoading) return <Loader />

  return (
    <div>
      <Header data={data} />
      <List data={data} />
      <Form onSubmit={mutation.mutate} />
    </div>
  )
}
```

### Pattern B: Dashboard
```tsx
'use client'

export default function Dashboard() {
  return (
    <div className="grid grid-cols-2 gap-4">
      <SectionA />  {/* Has useQuery inside */}
      <SectionB />  {/* Has useQuery inside */}
      <SectionC />  {/* Has useQuery inside */}
    </div>
  )
}
```

### Pattern C: SEO Page
```tsx
// page.tsx (Server Component)
export async function generateMetadata({ params }) {
  const data = await fetchData(params.id)
  return { title: data.title }
}

export default async function Page({ params }) {
  const initialData = await fetchData(params.id)
  return <PageClient initialData={initialData} />
}

// page-client.tsx (Client Component)
'use client'

export default function PageClient({ initialData }) {
  const { data = initialData } = useQuery({
    queryKey: ['data', initialData.id],
    queryFn: fetchData,
    initialData,
  })

  return <div>{data.title}</div>
}
```

### Pattern D: Multi-Tenant
```tsx
'use client'

export default function MyPage() {
  const params = useParams()
  const accountId = params.account_id

  const { data } = useAccountData({ accountId })
  const { setAccountSwitchLoading } = useLoadingContext()

  return <div>Account: {accountId}</div>
}
```

### Pattern E: Protected Layout (SSR)
```tsx
// Server Component with HydrationBoundary
import { HydrationBoundary, QueryClient, dehydrate } from '@tanstack/react-query'

export default async function ProtectedLayout({ children }) {
  const user = await getUser()
  if (!user) redirect('/login')

  const queryClient = new QueryClient()

  // Prefetch user data
  await queryClient.prefetchQuery({
    queryKey: ['user', 'profile'],
    queryFn: () => fetchUserProfile(user),
  })

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      {children}
    </HydrationBoundary>
  )
}
```

## Query Hook Template

```tsx
// src/hooks/query/use-[feature].ts

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createBrowserClient } from '@/lib/supabase/client'

// Query Keys
export const [feature]Keys = {
  all: ['[feature]'] as const,
  lists: () => [...[feature]Keys.all, 'list'] as const,
  detail: (id: string) => [...[feature]Keys.all, 'detail', id] as const,
}

// Fetch all
export function use[Feature]s() {
  const supabase = createBrowserClient()

  return useQuery({
    queryKey: [feature]Keys.lists(),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('[table]')
        .select('*')

      if (error) throw error
      return data
    },
    staleTime: 30 * 1000, // 30 seconds
  })
}

// Create
export function useCreate[Feature]() {
  const queryClient = useQueryClient()
  const supabase = createBrowserClient()

  return useMutation({
    mutationFn: async (data: any) => {
      const { data: result, error } = await supabase
        .from('[table]')
        .insert(data)
        .select()
        .single()

      if (error) throw error
      return result
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [feature]Keys.lists() })
    },
  })
}
```

## Common Stale Times

```tsx
// Rarely changes (settings, configs)
staleTime: Infinity

// User profile, account info
staleTime: 5 * 60 * 1000 // 5 minutes

// Lists, dashboards
staleTime: 30 * 1000 // 30 seconds

// Real-time data
staleTime: 0 // Always refetch
```

## Multi-Tenant Query Pattern

```tsx
export function useBuildings({ accountId }: { accountId: string }) {
  const supabase = createBrowserClient()

  return useQuery({
    queryKey: ['buildings', 'account', accountId], // Include accountId in key!
    queryFn: async () => {
      const { data, error } = await supabase
        .from('buildings')
        .select(`
          *,
          accounts!inner(id, id_prefix)  // !inner() for RLS
        `)
        .eq('accounts.id_prefix', accountId) // Filter by account

      if (error) throw error
      return data
    },
  })
}
```

## LoadingProvider vs TanStack Query

### Use LoadingProvider For:
```tsx
// Account switching
setAccountSwitchLoading(true, 'Switching accounts...')

// Page navigation
setPageTransitionLoading(true)

// Bulk operations
setGlobalLoading(true, 'Importing 1000 records...')
```

### Use TanStack Query For:
```tsx
// Individual queries
const { isLoading } = useQuery(...)

// Mutations
const { isPending } = useMutation(...)

// Multiple queries
const isPageLoading = isLoadingA || isLoadingB || isLoadingC
```

## Common Mistakes to Avoid

### ❌ DON'T: Create separate client components for each piece
```tsx
// Bad: Artificial splitting
buildings-header-client.tsx
buildings-list-client.tsx
buildings-form-client.tsx
```

### ✅ DO: One main client component
```tsx
// Good: All in one place
buildings-page.tsx (client component with all hooks)
```

---

### ❌ DON'T: Use useState/useEffect for data fetching
```tsx
const [data, setData] = useState([])
useEffect(() => { fetch... }, [])
```

### ✅ DO: Use TanStack Query
```tsx
const { data } = useQuery({ queryKey: ['data'], queryFn: fetchData })
```

---

### ❌ DON'T: Manual loading states for queries
```tsx
const [loading, setLoading] = useState(false)
```

### ✅ DO: Use query loading states
```tsx
const { isLoading } = useQuery(...)
```

---

### ❌ DON'T: Forget account in query key (multi-tenant)
```tsx
queryKey: ['buildings'] // Wrong - shared across accounts!
```

### ✅ DO: Include account in key
```tsx
queryKey: ['buildings', 'account', accountId] // Correct
```

## File Structure Checklist

```
✓ app/[feature]/page.tsx
  - Client component if no SEO needed
  - Server component if SEO needed

✓ app/[feature]/[feature]-client.tsx (if SSR)
  - Only if using Pattern C (SEO)

✓ src/hooks/query/use-[feature].ts
  - All TanStack Query hooks
  - Export useQuery and useMutation hooks

✓ app/[feature]/components/
  - Presentational components only
  - No data fetching inside
```

## Decision Tree Flowchart

```
New Request
       ↓
  Is it a Layout? ──YES─→ Need auth check? ──YES─→ Pattern E (Protected Layout SSR)
       ↓ NO                     ↓ NO
       ↓                        ↓
   Is it a Page?          Simple Layout (Server Component)
       ↓ YES
       ↓
   Need SEO? ──YES─→ Pattern C (Server + Client)
       ↓ NO
       ↓
Multi-tenant? ──YES─→ Pattern D (Account-scoped)
       ↓ NO
       ↓
Multiple independent ──YES─→ Pattern B (Dashboard)
   sections?
       ↓ NO
       ↓
   Pattern A (Simple Page)
```

## Quick Wins

**Replace 90% of manual state with:**
- `useQuery` replaces: useState, useEffect, loading, error states
- `useMutation` replaces: useState for submitting, loading, error
- Query keys enable: Automatic caching, deduplication, invalidation
- LoadingProvider for: App-level orchestration only

**Remember:**
1. One main client component per page
2. All hooks at the top level
3. Child components are presentational
4. LoadingProvider ≠ query loading
5. Multi-tenant = include accountId in query key

---

**Need more details?** See:
- `PATTERN-GUIDE.md` - Complete decision guide
- `pattern-*.tsx` - Full pattern examples
- `docs/06-user-interface/react-best-practices.md` - In-depth guide
