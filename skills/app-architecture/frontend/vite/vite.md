# Vite Frontend — SPA Architecture

> **Only load this file when `frontend: "vite"` in `.claude/no-bandaids.json`.**

## Phase 5: SPA Shell with Client-Side Auth

```typescript
// src/app.tsx — Vite SPA entry
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000 } },
})

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <AuthGuard>
          <AppRoutes />
        </AuthGuard>
      </Router>
    </QueryClientProvider>
  )
}
```

No Server Components. No `layout.tsx`. Auth guards are client-side route wrappers. Everything runs in the browser.

---

## Phase 7: Client-Side Routing

Two options: **React Router 7** or **TanStack Router**. Both work with Vite SPA.

### Option A: React Router 7 (createBrowserRouter)

```typescript
// src/routes.tsx
import { createBrowserRouter, RouterProvider } from 'react-router'

const router = createBrowserRouter([
  {
    path: '/',
    Component: Root,
    children: [
      { index: true, Component: Home },
      {
        path: 'auth',
        Component: AuthLayout,
        children: [
          { path: 'login', Component: Login },
          { path: 'register', Component: Register },
        ],
      },
      {
        // Protected routes — auth guard via loader
        path: ':account_id',
        Component: TenantLayout,
        loader: ({ params }) => requireAuth(params.account_id),
        children: [
          { index: true, Component: DashboardHome },
          { path: 'buildings', Component: BuildingsPage },
          { path: 'buildings/:id', Component: BuildingDetail },
          { path: 'tickets', Component: TicketsPage },
          { path: 'settings', Component: SettingsPage },
        ],
      },
    ],
  },
])

export function AppRoutes() {
  return <RouterProvider router={router} />
}
```

Key patterns:
- **Nested routes** with `children` — child components render into parent's `<Outlet />`
- **Prefix routes** — parent with only `path`, no `Component` (groups without layout)
- **Index routes** — default child at parent URL
- **Loaders** — data fetching before render, receives `{ request, params }`
- **Auth guard via loader** — `redirect('/login')` if unauthenticated

### Option B: TanStack Router (file-based, type-safe)

```tsx
// src/routes/posts.$postId.tsx
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/posts/$postId')({
  // Validate and parse search params
  validateSearch: (search) => ({
    page: Number(search?.page ?? 1),
    filter: String(search?.filter ?? ''),
  }),

  // Define loader dependencies from search params
  loaderDeps: ({ search }) => ({ page: search.page }),

  // Load data with full type safety
  loader: async ({ params, deps, abortController }) => {
    const response = await fetch(
      `/api/posts/${params.postId}?page=${deps.page}`,
      { signal: abortController.signal },
    )
    if (!response.ok) throw new Error('Failed to fetch post')
    return response.json()
  },

  pendingComponent: () => <div>Loading post...</div>,
  errorComponent: ({ error }) => <div>Error: {error.message}</div>,

  component: function PostComponent() {
    const post = Route.useLoaderData()
    const { postId } = Route.useParams()
    const { page } = Route.useSearch()

    return (
      <div>
        <h1>{post.title}</h1>
        <p>Post ID: {postId}, Page: {page}</p>
      </div>
    )
  },
})
```

Key patterns:
- **File-based routing** is preferred — auto code-splitting, type inference
- **`beforeLoad`** for auth guards — `throw Route.redirect({ to: '/login' })`
- **`validateSearch`** for type-safe search params
- **`loaderDeps`** to connect search params to loader refetching
- **`Route.useLoaderData()`** — fully typed from loader return

### Auth Guard (TanStack Router)

```tsx
// src/routes/__root.tsx or a layout route
export const Route = createFileRoute('/dashboard')({
  beforeLoad: ({ context }) => {
    if (!context.user) {
      throw Route.redirect({ to: '/login' })
    }
  },
})
```

---

## Anti-Patterns (Vite SPA)

### ❌ Don't
- Use `'use client'` directives — everything is client in Vite
- Use `next/navigation`, `next/image`, or any Next.js imports
- Use Server Components or Server Actions — Vite is client-only
- Create `layout.tsx` files expecting file-system routing (that's Next.js)
- Use `getServerSideProps` or `getStaticProps` — those are Next.js
- Mix `BrowserRouter` (React Router v6) with `createBrowserRouter` (v7) — pick one

---

## Checklist

- [ ] QueryClientProvider at app root
- [ ] AuthGuard wrapping protected routes (loader redirect or route wrapper)
- [ ] Client-side router configured (React Router 7 or TanStack Router)
- [ ] No Next.js imports or patterns
- [ ] Vite proxy configured for API calls during development
