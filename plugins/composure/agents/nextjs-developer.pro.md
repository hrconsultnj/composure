# Next.js Developer — Pro Overlay

> Loaded when `.composure/composure-pro.json` is present with valid license.

## Supabase SSR Integration

- Use `@supabase/ssr` for server-side auth. Cookie-based session management.
- Create Supabase client in server components via `createServerClient()`.
- Middleware handles auth refresh and tenant context injection.
- Every data-fetching server component must pass tenant context through `!inner()` queries.

## Multi-Tenant Routing

- Use route groups for tenant-scoped pages: `(tenant)/[tenantId]/...`.
- Layout components inject tenant context from middleware-resolved session.
- Global pages (marketing, auth) live outside the tenant route group.

## Type Safety

- Import generated types from `src/lib/supabase/database.types.ts`.
- Domain types in `src/types/` extend or narrow the generated types.
