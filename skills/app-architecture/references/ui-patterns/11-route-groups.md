# Route Groups Pattern

## Overview

Route groups organize routes by **auth level** and **access scope** without affecting the URL structure. Parentheses `()` create logical groupings that don't appear in URLs.

## Route Group Structure

```
app/
├── layout.tsx                              # Root: Providers
├── (public)/                               # No auth required
│   ├── layout.tsx
│   ├── page.tsx                            # Landing page → /
│   ├── pricing/page.tsx                    # → /pricing
│   └── (auth)/                             # Auth pages
│       ├── layout.tsx
│       ├── login/page.tsx                  # → /login
│       ├── signup/page.tsx                 # → /signup
│       └── forgot-password/page.tsx        # → /forgot-password
│
├── (protected)/                            # Auth required
│   ├── layout.tsx                          # Auth verification
│   │
│   ├── (internal)/                         # Platform staff (role_level < 3)
│   │   ├── layout.tsx                      # Internal access check
│   │   └── admin/[id_prefix]/
│   │       ├── layout.tsx                  # Admin context
│   │       ├── page.tsx                    # → /admin/ACCxxx
│   │       ├── dashboard/page.tsx          # → /admin/ACCxxx/dashboard
│   │       ├── accounts/page.tsx           # → /admin/ACCxxx/accounts
│   │       └── users/page.tsx              # → /admin/ACCxxx/users
│   │
│   ├── (tenant)/                           # Organization users (role_level >= 3)
│   │   ├── layout.tsx                      # Tenant access check
│   │   ├── org/[org_id_prefix]/
│   │   │   ├── layout.tsx                  # Org context + hydration
│   │   │   ├── page.tsx                    # → /org/ACCxxx
│   │   │   ├── dashboard/page.tsx          # → /org/ACCxxx/dashboard
│   │   │   ├── team/page.tsx               # → /org/ACCxxx/team
│   │   │   └── settings/page.tsx           # → /org/ACCxxx/settings
│   │   └── shop/[shop_id_prefix]/
│   │       ├── layout.tsx                  # Shop context
│   │       ├── page.tsx                    # → /shop/SHOPxxx
│   │       └── tickets/page.tsx            # → /shop/SHOPxxx/tickets
│   │
│   └── (external)/                         # External users (customers)
│       ├── layout.tsx                      # External access check
│       └── portal/[id_prefix]/
│           ├── page.tsx                    # → /portal/CONxxx
│           └── tickets/page.tsx            # → /portal/CONxxx/tickets
│
└── docs/                                   # Documentation (may be public or protected)
    ├── layout.tsx
    └── [slug]/page.tsx                     # → /docs/getting-started
```

## Auth Levels by Route Group

| Route Group | Role Level | Privacy Group | Description |
|-------------|------------|---------------|-------------|
| `(public)` | None | None | No auth required |
| `(protected)/(internal)` | 0-2 | internal | Platform staff |
| `(protected)/(tenant)` | 3-8 | tenant | Organization users |
| `(protected)/(external)` | 9+ | external | End customers |

## Layout Responsibilities

### Root Layout (Providers)

```typescript
// app/layout.tsx
export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <QueryProvider>
          <ThemeProvider>
            {children}
          </ThemeProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
```

### Protected Layout (Auth Gate)

```typescript
// app/(protected)/layout.tsx
export default async function ProtectedLayout({ children }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  return children;
}
```

### Internal Layout (Staff Check)

```typescript
// app/(protected)/(internal)/layout.tsx
export default async function InternalLayout({ children }) {
  const supabase = await createClient();
  const profile = await getCurrentUserProfile(supabase);

  // Internal staff: role_level < 3
  if (profile.role_level >= 3) {
    redirect('/unauthorized');
  }

  return (
    <InternalProvider>
      {children}
    </InternalProvider>
  );
}
```

### Tenant Layout (Org Access)

```typescript
// app/(protected)/(tenant)/org/[org_id_prefix]/layout.tsx
export default async function OrgLayout({
  children,
  params
}) {
  const supabase = await createClient();
  const profile = await getCurrentUserProfile(supabase);

  // Resolve org from URL
  const org = await getOrgByPrefix(supabase, params.org_id_prefix);

  // Validate user has access to this org
  const accessibleAccounts = profile.entity_registry?.metadata?.['user.accounts']?.ids ?? [];
  if (!accessibleAccounts.includes(org.id)) {
    redirect('/unauthorized');
  }

  // Prefetch and hydrate
  const queryClient = new QueryClient();
  await queryClient.prefetchQuery({
    queryKey: profileKeys.current(),
    queryFn: () => profile,
  });

  return (
    <OrgProvider org={org}>
      <HydrationBoundary state={dehydrate(queryClient)}>
        <ProtectedLayoutClient>
          {children}
        </ProtectedLayoutClient>
      </HydrationBoundary>
    </OrgProvider>
  );
}
```

## URL Structure

Route groups don't affect URLs:

```
File Path                                           URL
─────────────────────────────────────────────────────────────
app/(public)/page.tsx                             → /
app/(public)/pricing/page.tsx                     → /pricing
app/(public)/(auth)/login/page.tsx                → /login
app/(protected)/(internal)/admin/[id]/page.tsx    → /admin/ACCxxx
app/(protected)/(tenant)/org/[id]/page.tsx        → /org/ACCxxx
app/(protected)/(external)/portal/[id]/page.tsx   → /portal/CONxxx
```

## Dynamic Segments

### ID Prefix Pattern

All tenant routes use `[id_prefix]` or `[xxx_id_prefix]` for URL-friendly identifiers:

```
/admin/ACCa1b2c3d4e5f6/dashboard     # Admin viewing account
/org/ACCa1b2c3d4e5f6/dashboard       # Org dashboard
/shop/SHOPa1b2c3d4e5f6/tickets       # Shop tickets
/portal/CONa1b2c3d4e5f6/tickets      # Customer portal
```

### Resolving ID Prefix to UUID

```typescript
// In layout or page
const { data: account } = await supabase
  .from('accounts')
  .select('id, id_prefix, name')
  .eq('id_prefix', params.org_id_prefix)
  .single();

// Now use account.id (UUID) for queries
```

## Parallel Routes (Optional)

For complex layouts with independent sections:

```
app/(protected)/(tenant)/org/[org_id_prefix]/
├── layout.tsx
├── page.tsx
├── @sidebar/                    # Parallel route for sidebar
│   └── default.tsx
├── @modal/                      # Parallel route for modals
│   ├── default.tsx
│   └── (.)ticket/[id]/page.tsx  # Intercepted route
└── dashboard/
    └── page.tsx
```

## Route Group Checklist

When creating a new feature:

1. **Determine auth level**: Public, internal, tenant, or external?
2. **Place in correct route group**: `(public)`, `(internal)`, `(tenant)`, `(external)`
3. **Use dynamic segment**: `[id_prefix]` for tenant-scoped routes
4. **Add layout if needed**: For context providers or additional auth checks
5. **Follow URL conventions**: Keep URLs clean and predictable

## Common Patterns

### Feature Under Tenant Org

```
app/(protected)/(tenant)/org/[org_id_prefix]/
└── feature/
    ├── page.tsx                 # → /org/ACCxxx/feature
    ├── [item_id]/
    │   └── page.tsx             # → /org/ACCxxx/feature/TKTyyy
    └── new/
        └── page.tsx             # → /org/ACCxxx/feature/new
```

### Feature Under Shop

```
app/(protected)/(tenant)/shop/[shop_id_prefix]/
└── feature/
    ├── page.tsx                 # → /shop/SHOPxxx/feature
    └── [item_id]/
        └── page.tsx             # → /shop/SHOPxxx/feature/ITMyyy
```

### Admin Feature

```
app/(protected)/(internal)/admin/[id_prefix]/
└── feature/
    ├── page.tsx                 # → /admin/ACCxxx/feature
    └── [item_id]/
        └── page.tsx             # → /admin/ACCxxx/feature/ITMyyy
```

## Summary

| Concept | Implementation |
|---------|---------------|
| Route Groups | Parentheses `()` for logical grouping |
| Auth Levels | `(public)`, `(protected)/(internal)`, `(protected)/(tenant)`, `(protected)/(external)` |
| URL Clean | Groups don't affect URL structure |
| Dynamic Segments | `[id_prefix]` for tenant-scoped routes |
| Layout Nesting | Each group can have its own layout |
| Access Validation | Layout checks role_level and accessible accounts |
