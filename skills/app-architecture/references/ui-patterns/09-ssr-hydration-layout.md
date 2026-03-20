# SSR + Hydration + App Layout Pattern

## Overview

The app uses **Server-Side Rendering (SSR) with TanStack Query hydration** cached at the app layout level. This provides fast initial loads, SEO benefits, and seamless client-side interactivity.

## Architecture Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                         ROOT LAYOUT                                  │
│   app/layout.tsx - QueryProvider + LoadingProvider + ThemeProvider  │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    PROTECTED LAYOUT (Server)                         │
│   app/(protected)/layout.tsx - Auth verification                    │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                  TENANT LAYOUT (Server + Hydration)                  │
│   app/(protected)/(tenant)/org/[org_id_prefix]/layout.tsx           │
│   - Fetch user profile (ONE call)                                   │
│   - Validate org access                                             │
│   - Prefetch into TanStack Query cache                              │
│   - HydrationBoundary + dehydrate(queryClient)                      │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│              PROTECTED LAYOUT CLIENT (Client Component)              │
│   components/layout/ProtectedLayoutClient.tsx                       │
│   - Receives hydrated data                                          │
│   - Fetches accessible accounts ONCE                                │
│   - Renders AppLayout with accounts                                 │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      APP LAYOUT (Client)                             │
│   components/layout/AppLayout.tsx                                   │
│   ┌──────────────┬────────────────────────────────────────────┐    │
│   │  AppSidebar  │              Content Area                   │    │
│   │              │  ┌─────────────────────────────────────┐   │    │
│   │  Navigation  │  │          AppHeader                   │   │    │
│   │  Groups      │  │  OrgSwitcher │ Title │ UserDropdown  │   │    │
│   │              │  └─────────────────────────────────────┘   │    │
│   │              │                                             │    │
│   │              │  ┌─────────────────────────────────────┐   │    │
│   │              │  │           {children}                 │   │    │
│   │              │  │         Page Content                 │   │    │
│   │              │  └─────────────────────────────────────┘   │    │
│   └──────────────┴────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────┘
```

## Key Files

### Root Layout (Providers)

```typescript
// app/layout.tsx
export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <QueryProvider>        {/* TanStack Query */}
          <LoadingProvider>    {/* Global loading state */}
            <ThemeProvider>    {/* Dark/light theme */}
              {children}
            </ThemeProvider>
          </LoadingProvider>
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

### Tenant Layout (SSR + Hydration)

```typescript
// app/(protected)/(tenant)/org/[org_id_prefix]/layout.tsx
export default async function OrgLayout({
  children,
  params
}: {
  children: ReactNode;
  params: { org_id_prefix: string };
}) {
  const supabase = await createClient();

  // 1. Fetch user profile ONCE (server-side)
  const profile = await getCurrentUserProfile(supabase);

  // 2. Validate org access
  const org = await getOrgByPrefix(supabase, params.org_id_prefix);
  if (!org || !userHasOrgAccess(profile, org)) {
    redirect('/unauthorized');
  }

  // 3. Prefetch into TanStack Query cache
  const queryClient = new QueryClient();
  await queryClient.prefetchQuery({
    queryKey: profileKeys.current(),
    queryFn: () => profile,
  });

  // 4. Provide hydration boundary
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

### Protected Layout Client (Account Fetching)

```typescript
// components/layout/ProtectedLayoutClient.tsx
'use client';

export function ProtectedLayoutClient({ children }) {
  // Fetch accessible accounts ONCE on mount
  const [accounts, setAccounts] = useState<SafeAccount[]>([]);

  useEffect(() => {
    async function loadAccounts() {
      const result = await getAccessibleAccounts();
      setAccounts(result);
    }
    loadAccounts();
  }, []);

  return (
    <AppLayout accounts={accounts}>
      {children}
    </AppLayout>
  );
}
```

## App Layout Components

### AppLayout (Main Wrapper)

```typescript
// components/layout/AppLayout.tsx
'use client';

interface AppLayoutProps {
  children: ReactNode;
  title?: string;
  headerRight?: ReactNode;
  hideSidebar?: boolean;
  hideHeader?: boolean;
  accounts?: SafeAccount[];
  currentAccountPrefix?: string;
}

export function AppLayout({
  children,
  title,
  headerRight,
  hideSidebar = false,
  hideHeader = false,
  accounts = [],
  currentAccountPrefix,
}: AppLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const isMobile = useIsMobile();

  return (
    <div className="flex h-screen">
      {/* Sidebar - always rendered, visibility controlled by CSS */}
      {!hideSidebar && (
        <AppSidebar
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          isMobile={isMobile}
        />
      )}

      {/* Main content area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        {!hideHeader && (
          <AppHeader
            title={title}
            headerRight={headerRight}
            onMenuClick={() => setSidebarOpen(true)}
            isMobile={isMobile}
            accounts={accounts}
            currentAccountPrefix={currentAccountPrefix}
          />
        )}

        {/* Page content */}
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
```

### AppHeader (Top Bar)

```typescript
// components/layout/AppHeader.tsx
'use client';

export function AppHeader({
  title,
  headerRight,
  onMenuClick,
  isMobile,
  accounts,
  currentAccountPrefix,
}: AppHeaderProps) {
  return (
    <header className="h-14 border-b flex items-center px-4 gap-4">
      {/* Mobile: Menu trigger */}
      {isMobile && (
        <Button variant="ghost" size="icon" onClick={onMenuClick}>
          <MenuIcon />
        </Button>
      )}

      {/* Org Switcher (always visible) */}
      <OrgSwitcher
        accounts={accounts}
        currentAccountPrefix={currentAccountPrefix}
      />

      {/* Title (optional) */}
      {title && <h1 className="font-semibold">{title}</h1>}

      {/* Spacer */}
      <div className="flex-1" />

      {/* Custom header content */}
      {headerRight}

      {/* User dropdown (always visible) */}
      <UserMenuDropdown />
    </header>
  );
}
```

### AppSidebar (Navigation)

```typescript
// components/layout/AppSidebar.tsx
'use client';

export function AppSidebar({ isOpen, onClose, isMobile }: AppSidebarProps) {
  const pathname = usePathname();
  const isChatRoute = pathname.includes('/chat');

  // Desktop: Collapsible sidebar
  // Mobile: Slide-in overlay

  return (
    <>
      {/* Mobile backdrop */}
      {isMobile && isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside className={cn(
        "flex flex-col bg-sidebar border-r",
        // Desktop
        !isMobile && "w-64",
        // Mobile: slide in/out
        isMobile && "fixed inset-y-0 left-0 z-50 w-64 transform transition-transform",
        isMobile && !isOpen && "-translate-x-full",
        isMobile && isOpen && "translate-x-0",
      )}>
        {/* Logo */}
        <div className="h-14 flex items-center px-4 border-b">
          <Logo />
        </div>

        {/* Navigation - switches based on route */}
        <nav className="flex-1 overflow-auto p-2">
          {isChatRoute ? (
            <ChatSidebarContent />
          ) : (
            <NavigationGroups />
          )}
        </nav>
      </aside>
    </>
  );
}
```

### OrgSwitcher (Account Switching)

```typescript
// components/layout/OrgSwitcher.tsx
'use client';

export function OrgSwitcher({
  accounts,
  currentAccountPrefix
}: OrgSwitcherProps) {
  const router = useRouter();
  const queryClient = useQueryClient();

  // Only show if user has multiple accounts
  if (accounts.length <= 1) {
    return <span>{accounts[0]?.name ?? 'No Account'}</span>;
  }

  const handleAccountSwitch = (account: SafeAccount) => {
    // 1. Navigate to new account URL
    router.push(`/org/${account.id_prefix}/dashboard`);

    // 2. Clear account-scoped queries (prevent data leakage)
    queryClient.removeQueries({
      predicate: (query) => query.queryKey[1] === 'account',
    });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger>
        {currentAccount?.name}
        <ChevronDownIcon />
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        {accounts.map((account) => (
          <DropdownMenuItem
            key={account.id}
            onClick={() => handleAccountSwitch(account)}
          >
            {account.name}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
```

## Key Patterns

### 1. Server Data → Client Hydration

```typescript
// Server layout: Prefetch data
const queryClient = new QueryClient();
await queryClient.prefetchQuery({
  queryKey: ['profile'],
  queryFn: () => serverFetchedData,
});

// Wrap children with hydration
<HydrationBoundary state={dehydrate(queryClient)}>
  {children}
</HydrationBoundary>

// Client component: Use same query key (instant, no loading)
const { data } = useQuery({
  queryKey: ['profile'],
  queryFn: fetchProfile,
});
```

### 2. Single Data Fetch Pattern

```
Server Layout
    │
    ├── Fetch user profile ONCE
    ├── Validate access
    ├── Prefetch into cache
    │
    └── Client Layout
            │
            ├── Fetch accounts ONCE (via server action)
            ├── Pass accounts to AppLayout
            │
            └── AppLayout
                    │
                    ├── OrgSwitcher receives accounts (no fetch)
                    ├── UserDropdown uses cached profile (no fetch)
                    └── Children receive hydrated data
```

### 3. Account Switching (URL-based)

```typescript
// Account context comes from URL params, NOT database storage
// Switching = navigation to different route

// URL structure
/org/ACCabc123/dashboard    // Account A
/org/ACCxyz789/dashboard    // Account B

// On switch:
// 1. Navigate to new URL
// 2. Clear account-scoped queries
// 3. New layout validates access + provides context
```

## File Structure

```
app/
├── layout.tsx                         # Providers
├── (protected)/
│   ├── layout.tsx                     # Auth gate
│   ├── (internal)/
│   │   ├── layout.tsx                 # Internal staff context
│   │   └── admin/[id_prefix]/
│   │       ├── layout.tsx             # Admin layout
│   │       └── page.tsx
│   └── (tenant)/
│       ├── layout.tsx                 # Tenant context
│       └── org/[org_id_prefix]/
│           ├── layout.tsx             # Org layout + hydration
│           └── page.tsx

components/layout/
├── AppLayout.tsx                      # Main layout wrapper
├── AppSidebar.tsx                     # Navigation sidebar
├── AppHeader.tsx                      # Top header bar
├── ProtectedLayoutClient.tsx          # Client-side layout
├── OrgSwitcher.tsx                    # Account dropdown
├── UserMenuDropdown.tsx               # User menu
├── NavGroup.tsx                       # Nav category
├── NavItem.tsx                        # Nav item
└── ChatSidebarContent.tsx             # Chat-specific nav
```

## Summary

| Layer | Type | Responsibility |
|-------|------|----------------|
| Root Layout | Server | Providers (Query, Loading, Theme) |
| Protected Layout | Server | Auth verification |
| Tenant Layout | Server | Access validation + hydration |
| ProtectedLayoutClient | Client | Account fetching |
| AppLayout | Client | Sidebar + header + content |
| OrgSwitcher | Client | Account switching UI |
| UserMenuDropdown | Client | User menu UI |
