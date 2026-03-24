# Next.js 16 — Enforced Validation Rules

> Claude MUST check written code against these patterns. Violations are bugs.

## Error-Level (Block — Must Fix Before Proceeding)

| Pattern | Issue | Fix |
|---------|-------|-----|
| `getServerSideProps` | Removed in App Router | Use server components with async data fetching |
| `getStaticProps` | Removed in App Router | Use `generateStaticParams` + server components |
| `from 'next/router'` | Pages Router only | Use `next/navigation` (`useRouter`, `usePathname`, `useSearchParams`) |
| `from 'next/head'` | Pages Router only | Use `export const metadata` or `generateMetadata()` |
| `cookies()` without `await` | Async in Next.js 16 | `const cookieStore = await cookies()` — only in server components/actions |
| `headers()` without `await` | Async in Next.js 16 | `const headersList = await headers()` — only in server components/actions |
| `params` without `await` | Async in Next.js 16 | `const { slug } = await params` — in `page.tsx`, `layout.tsx`, `generateMetadata` |
| `searchParams` without `await` | Async in Next.js 16 | `const { q } = await searchParams` — in `page.tsx` only |
| `useRef()` without initial value | Required in React 19 | `useRef(null)` or `useRef(0)` |
| `next export` CLI command | Removed | Use `output: "export"` in next.config |
| `useState`/`useEffect` in server component | Hooks need client boundary | Add `'use client'` at top of file (only flag if file has NO `'use client'` directive) |
| `NextApiRequest`/`NextApiResponse` | Pages Router API route | Use App Router route handlers: `export async function GET(req: Request)` |

## Recommended-Level (Fix — Technical Debt If Left)

| Pattern | Issue | Fix |
|---------|-------|-----|
| `function middleware()` | Renamed in Next.js 16 | Rename function to `proxy()`, file to `proxy.ts` |
| `revalidateTag(tag)` single arg | Deprecated in Next.js 16 | `revalidateTag(tag, "max")` with cacheLife profile |
| `cacheHandler` (singular) | Deprecated | Use `cacheHandlers` (plural) with per-type handlers |
| `unstable_cache` | Deprecated | Use `'use cache'` directive with `cacheLife()` and `cacheTag()` |
| External font loaders (googleapis) | Suboptimal | Use `next/font` for zero-CLS self-hosted fonts |
| `from 'next-auth'` / `getServerSession` | Legacy auth | Consider managed auth (Clerk, Supabase Auth, Auth0) |
| In-process caches (`lru-cache`, `node-cache`) | Lost between invocations | Use framework caching (`'use cache'`) or external cache |

## File Conventions

| File | Purpose | Server/Client |
|------|---------|---------------|
| `layout.tsx` | Shared UI wrapper, preserves state across navigations | Server (default) |
| `page.tsx` | Unique route UI, receives `params` and `searchParams` | Server (default) |
| `loading.tsx` | Suspense fallback for the route segment | Server (default) |
| `error.tsx` | Error boundary for the route segment | **Client** (required) |
| `not-found.tsx` | 404 UI | Server (default) |
| `route.ts` | API endpoint — named exports: `GET`, `POST`, `PUT`, `DELETE` | Server only |
| `template.tsx` | Like layout but remounts on every navigation | Server (default) |
| `default.tsx` | Parallel route fallback (required for `@slot` routes) | Server (default) |
| `proxy.ts` | Network proxy — request interception before cache | Server (Node.js only) |

## Route Segments

| Pattern | Example | Matches |
|---------|---------|---------|
| `[id]` | `app/users/[id]/page.tsx` | `/users/123` |
| `[...slug]` | `app/docs/[...slug]/page.tsx` | `/docs/a/b/c` |
| `[[...slug]]` | `app/shop/[[...slug]]/page.tsx` | `/shop` or `/shop/a/b` |
| `(group)` | `app/(marketing)/page.tsx` | `/` (group ignored in URL) |
| `@slot` | `app/@sidebar/page.tsx` | Parallel route slot |

## Async API Signatures

```tsx
// page.tsx
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ q?: string }>
}) {
  const { id } = await params
  const { q } = await searchParams
}

// generateMetadata
export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  return { title: `Item ${id}` }
}

// Server action / server component
const cookieStore = await cookies()
const headersList = await headers()
```
