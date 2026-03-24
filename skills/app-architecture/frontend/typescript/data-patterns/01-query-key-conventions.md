# Query Key Conventions

## Overview

TanStack Query keys for multi-tenant applications must include tenant context to ensure proper cache isolation and invalidation.

## Key Structure

```typescript
// Pattern: [entity, 'account', accountId, ...specifics]

// List all contacts in account
['contacts', 'account', 'acc_abc123', 'list']

// Single contact
['contacts', 'account', 'acc_abc123', 'detail', 'con_xyz789']

// Filtered list
['contacts', 'account', 'acc_abc123', 'list', { status: 'active' }]
```

## Query Key Factory Pattern

Create factories in a shared package or module:

```typescript
// lib/query/contact-keys.ts

export const contactKeys = {
  // Base key for all contact queries
  all: ['contacts'] as const,

  // All contacts in an account
  inAccount: (accountId: string) =>
    [...contactKeys.all, 'account', accountId] as const,

  // List with optional filters
  list: (accountId: string, filters?: ContactFilters) =>
    [...contactKeys.inAccount(accountId), 'list', filters] as const,

  // Single contact detail
  detail: (accountId: string, contactId: string) =>
    [...contactKeys.inAccount(accountId), 'detail', contactId] as const,

  // Contact's related data
  vehicles: (accountId: string, contactId: string) =>
    [...contactKeys.detail(accountId, contactId), 'vehicles'] as const,
};
```

## Usage in Hooks

```typescript
// hooks/query/use-contacts.ts
import { contactKeys } from '@/lib/query/contact-keys';
import { useWorkspace } from '@/providers/workspace-provider';

export function useContacts(filters?: ContactFilters) {
  const { accountId } = useWorkspace();

  return useQuery({
    queryKey: contactKeys.list(accountId, filters),
    queryFn: () => getContacts(supabase, accountId, filters),
    enabled: !!accountId,
  });
}

export function useContact(contactId: string) {
  const { accountId } = useWorkspace();

  return useQuery({
    queryKey: contactKeys.detail(accountId, contactId),
    queryFn: () => getContact(supabase, accountId, contactId),
    enabled: !!accountId && !!contactId,
  });
}
```

## Cache Invalidation

### After Mutation

```typescript
export function useCreateContact() {
  const { accountId } = useWorkspace();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateContactData) =>
      createContact(supabase, accountId, data),

    onSuccess: () => {
      // Invalidate all contact lists in this account
      queryClient.invalidateQueries({
        queryKey: contactKeys.inAccount(accountId),
      });
    },
  });
}
```

### On Account Switch

```typescript
// When user switches accounts, clear all account-scoped data
function handleAccountSwitch(newAccountId: string) {
  queryClient.removeQueries({
    predicate: (query) => {
      // Remove any query with 'account' in position 1
      return query.queryKey[1] === 'account';
    },
  });

  setAccountId(newAccountId);
}
```

## Standard Key Factories

```typescript
// Example standard factories for common entities

export const accountKeys = {
  all: ['accounts'] as const,
  list: (filters?: AccountFilters) => [...accountKeys.all, 'list', filters] as const,
  detail: (accountId: string) => [...accountKeys.all, 'detail', accountId] as const,
};

export const userKeys = {
  all: ['users'] as const,
  inAccount: (accountId: string) => [...userKeys.all, 'account', accountId] as const,
  list: (accountId: string, filters?: UserFilters) =>
    [...userKeys.inAccount(accountId), 'list', filters] as const,
  detail: (accountId: string, userId: string) =>
    [...userKeys.inAccount(accountId), 'detail', userId] as const,
  me: () => [...userKeys.all, 'me'] as const,
};

export const inboxKeys = {
  all: ['inboxes'] as const,
  inAccount: (accountId: string) => [...inboxKeys.all, 'account', accountId] as const,
  list: (accountId: string) => [...inboxKeys.inAccount(accountId), 'list'] as const,
  detail: (accountId: string, inboxId: string) =>
    [...inboxKeys.inAccount(accountId), 'detail', inboxId] as const,
  threads: (accountId: string, inboxId: string, filters?: ThreadFilters) =>
    [...inboxKeys.detail(accountId, inboxId), 'threads', filters] as const,
};
```

## Key Rules

### 1. Always Include accountId

```typescript
// ✓ Correct - account scoped
queryKey: contactKeys.list(accountId, filters)

// ✗ Wrong - no tenant isolation
queryKey: ['contacts', 'list', filters]
```

### 2. Use Factories, Not Inline Arrays

```typescript
// ✓ Correct - consistent, type-safe
queryKey: contactKeys.detail(accountId, contactId)

// ✗ Wrong - easy to get wrong, no type safety
queryKey: ['contacts', 'account', accountId, 'detail', contactId]
```

### 3. Filters as Last Element

```typescript
// ✓ Correct - filters at end
queryKey: contactKeys.list(accountId, { status: 'active', page: 1 })

// ✗ Wrong - filters in middle
queryKey: ['contacts', { status: 'active' }, 'account', accountId]
```

### 4. Hierarchical Structure

```typescript
// Parent → Child relationship
contactKeys.inAccount(accountId)                    // All in account
contactKeys.list(accountId, filters)               // Filtered list
contactKeys.detail(accountId, contactId)           // Single item
contactKeys.vehicles(accountId, contactId)         // Related data

// Invalidating parent invalidates children
queryClient.invalidateQueries({
  queryKey: contactKeys.inAccount(accountId),
  // This invalidates list, detail, and vehicles
});
```

## Non-Account-Scoped Keys

Some data isn't account-scoped:

```typescript
// Current user (global)
export const authKeys = {
  session: () => ['auth', 'session'] as const,
  user: () => ['auth', 'user'] as const,
};

// Lookup tables (global, read-only)
export const lookupKeys = {
  roles: () => ['lookups', 'roles'] as const,
  privacy: () => ['lookups', 'privacy'] as const,
  states: () => ['lookups', 'states'] as const,
};
```

## Mobile Considerations

### Offline Persistence

```typescript
// Mobile uses AsyncStorage persister
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      gcTime: 1000 * 60 * 60 * 24, // 24 hours
      staleTime: 1000 * 60 * 5,    // 5 minutes
    },
  },
});

// Persist to AsyncStorage
const persister = createAsyncStoragePersister({
  storage: AsyncStorage,
  key: 'QUERY_CACHE',
});
```

### Prevent Re-renders During Logout

```typescript
// Use subscribed: false during logout/error recovery
const { data } = useQuery({
  queryKey: userKeys.me(),
  queryFn: getMe,
  subscribed: isStable,  // false during transitions
});
```

## Summary

| Pattern | Example |
|---------|---------|
| All in account | `[entity, 'account', accountId]` |
| List | `[entity, 'account', accountId, 'list', filters?]` |
| Detail | `[entity, 'account', accountId, 'detail', entityId]` |
| Related | `[entity, 'account', accountId, 'detail', entityId, 'related']` |
| Global | `[entity, 'me']` or `['lookups', type]` |

Always use factories. Always include accountId for tenant data.
