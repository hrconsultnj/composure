# Next.js Frontend — SSR, Route Groups & Server Components

> **Only load this file when `frontend: "nextjs"` in `.claude/no-bandaids.json`.**

## Phase 5: Server Component Layout with SSR Hydration

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

**Deep Dive**: See `fullstack/nextjs/01-ssr-hydration-layout.md`

---

## Phase 7: Route Groups

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

**Deep Dive**: See `fullstack/nextjs/02-route-groups.md`

---

## TanStack Query: SSR Pattern

**Need SEO/SSR?** → Use Pattern C (prefetch in Server Component, hydrate on client):

```typescript
// Server Component (layout or page)
const queryClient = new QueryClient()
await queryClient.prefetchQuery({
  queryKey: buildingKeys.list(accountId),
  queryFn: () => fetchBuildings(accountId),
})

// Wrap children in HydrationBoundary
<HydrationBoundary state={dehydrate(queryClient)}>
  {children}
</HydrationBoundary>
```

---

## Anti-Patterns (Next.js)

### ❌ Navigation
- Missing auth checks in layouts (Server Components should validate before rendering)
- Forgetting LoadingProvider for account switching
- Using `router.push()` when `redirect()` in Server Component is sufficient

### ❌ Server Components
- Adding `'use client'` unnecessarily (default to Server Components)
- Importing client-only hooks in Server Components
- Not pushing `'use client'` boundary as far down as possible

---

## Checklist

- [ ] Layout with auth check + HydrationBoundary
- [ ] Route group for auth level
- [ ] Tab config (if multi-tab feature)
- [ ] Redirect logic for default tab
- [ ] `proxy.ts` configured for middleware (Next.js 16+)
