# Multi-Tenant Patterns

**Account isolation, RLS (Row Level Security), and feed field patterns for multi-tenant applications**

---

## Understanding Multi-Tenancy

In our application, data is isolated by **account**. Each user belongs to one account, and should only see data for their account.

### Key Concepts

1. **Account Isolation** - Users can only access data for their account
2. **RLS (Row Level Security)** - Database-level enforcement
3. **Feed Field** - Entity registry pattern for cross-account access
4. **Query Key Scoping** - Cache separation by account

---

## Pattern 1: Account-Scoped Queries

### The Problem

Without account scoping, all users see all data:

```typescript
// ❌ WRONG: No account filtering
const { data, error } = await supabase
  .from('buildings')
  .select('*')

// Returns ALL buildings from ALL accounts!
```

### The Solution

Always include account filtering:

```typescript
// ✅ CORRECT: Account-scoped query
const { data, error } = await supabase
  .from('buildings')
  .select('*, accounts!inner(id, id_prefix)')
  .eq('accounts.id_prefix', accountIdPrefix)

// Returns only buildings for this account
```

### Implementation

```typescript
// src/hooks/query/entities/properties/buildings/use-buildings.ts

import type { Database } from '@/types/database.types'

type BuildingRow = Database['public']['Tables']['buildings']['Row']

export interface BuildingFilters {
  accountId: string  // REQUIRED for multi-tenant
  status?: 'active' | 'inactive' | 'all'
}

async function fetchBuildings(filters: BuildingFilters): Promise<BuildingRow[]> {
  const supabase = createClient()
  const { accountId, status } = filters

  let query = supabase
    .from('buildings')
    .select('*, accounts!inner(id, id_prefix)')
    .eq('accounts.id_prefix', accountId)  // Account filter

  if (status && status !== 'all') {
    query = query.eq('status', status)
  }

  const { data, error } = await query
  if (error) throw error
  return data as BuildingRow[]
}

export function useBuildings(filters: BuildingFilters) {
  return useQuery({
    queryKey: ['buildings', 'account', filters.accountId, filters],
    queryFn: () => fetchBuildings(filters),
    enabled: !!filters.accountId,
  })
}
```

### Component Usage

```typescript
import { useBuildings } from '@/hooks/query'
import { useUserProfile } from '@/hooks/auth/use-user-profile'

export function BuildingList() {
  const { profile } = useUserProfile()
  const accountId = profile?.account?.id_prefix

  const { data: buildings } = useBuildings({
    accountId: accountId!,
    status: 'active',
  })

  return (
    <div>
      {buildings?.map(building => (
        <div key={building.id}>{building.name}</div>
      ))}
    </div>
  )
}
```

---

## Pattern 2: Query Key Scoping

### Why It Matters

Cache must be separated by account to prevent data leakage:

```typescript
// ❌ WRONG: Same cache for all accounts
queryKey: ['buildings', filters]

// If user switches accounts, they see old data from previous account!
```

### The Solution

Include `accountId` in query key:

```typescript
// ✅ CORRECT: Separate cache per account
queryKey: ['buildings', 'account', accountId, filters]

// Each account has its own cache
```

### Implementation

```typescript
export const buildingKeys = {
  all: ['buildings'] as const,
  byAccount: (accountId: string) => [...buildingKeys.all, 'account', accountId] as const,
  lists: (accountId: string) => [...buildingKeys.byAccount(accountId), 'list'] as const,
  list: (accountId: string, filters: Filters) =>
    [...buildingKeys.lists(accountId), filters] as const,
  detail: (accountId: string, id: string) =>
    [...buildingKeys.byAccount(accountId), 'detail', id] as const,
}

// Usage
useQuery({
  queryKey: buildingKeys.list(accountId, { status: 'active' }),
  queryFn: () => fetchBuildings({ accountId, status: 'active' }),
})
```

---

## Pattern 3: The `!inner()` Modifier

### What is `!inner()`?

The `!inner()` modifier performs an **inner join**, ensuring only rows with matching foreign keys are returned.

### Without `!inner()` (❌ Wrong)

```typescript
// ❌ Returns all buildings, even if account doesn't exist
const { data } = await supabase
  .from('buildings')
  .select('*, accounts(id, name)')
  .eq('accounts.id_prefix', accountId)
```

**Problem**: If account FK is NULL or invalid, buildings are still returned.

### With `!inner()` (✅ Correct)

```typescript
// ✅ Only returns buildings with valid account FK
const { data } = await supabase
  .from('buildings')
  .select('*, accounts!inner(id, id_prefix, name)')
  .eq('accounts.id_prefix', accountId)
```

**Benefit**: Guarantees account exists and filtering works correctly.

### When to Use `!inner()`

Use `!inner()` for:
- ✅ Account filtering (multi-tenant isolation)
- ✅ Required relationships (user must have account)
- ✅ Filtering by related table fields

Don't use for:
- ❌ Optional relationships (contact may be NULL)
- ❌ Counting related records

---

## Pattern 4: Feed Field Pattern

### What is the Feed Field?

The `feed` field links entities to the entity registry for cross-account access control.

```sql
-- Example: User with feed field
CREATE TABLE users (
  id UUID PRIMARY KEY,
  account_id UUID REFERENCES accounts(id),
  feed UUID REFERENCES entity_registry(id),  -- Cross-account access
  email TEXT,
  ...
);
```

### Use Case: Cross-Account Access

Some users need access to multiple accounts (e.g., HQ staff managing franchises).

### Implementation

```typescript
// Check if user has cross-account access
export async function getUserAccessibleAccounts(userId: string): Promise<string[]> {
  const supabase = createClient()

  // Get user with feed
  const { data: user } = await supabase
    .from('users')
    .select('feed')
    .eq('id', userId)
    .single()

  if (!user?.feed) {
    // No cross-account access, only user's account
    return [user.account_id]
  }

  // Get entity registry metadata
  const { data: registry } = await supabase
    .from('entity_registry')
    .select('metadata')
    .eq('id', user.feed)
    .single()

  // Extract accessible accounts from metadata
  const accessibleAccounts = registry?.metadata?.accessible_accounts || []

  return accessibleAccounts
}

// Query with feed-based access
async function fetchBuildingsWithFeedAccess(userId: string): Promise<BuildingRow[]> {
  const supabase = createClient()

  // Get accessible accounts
  const accountIds = await getUserAccessibleAccounts(userId)

  // Query buildings for all accessible accounts
  const { data, error } = await supabase
    .from('buildings')
    .select('*')
    .in('account_id', accountIds)

  if (error) throw error
  return data
}
```

---

## Pattern 5: Account Switching

### Use Case

Users with access to multiple accounts need to switch between them.

### Implementation

```typescript
// src/hooks/auth/use-account-switcher.ts

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface AccountSwitcherStore {
  currentAccountId: string | null
  setCurrentAccountId: (accountId: string) => void
}

export const useAccountSwitcher = create<AccountSwitcherStore>()(
  persist(
    (set) => ({
      currentAccountId: null,
      setCurrentAccountId: (accountId) => set({ currentAccountId: accountId }),
    }),
    {
      name: 'current-account',
    }
  )
)
```

### Query Integration

```typescript
export function useBuildings(filters: Omit<BuildingFilters, 'accountId'>) {
  const { currentAccountId } = useAccountSwitcher()

  return useQuery({
    queryKey: buildingKeys.list(currentAccountId!, filters),
    queryFn: () => fetchBuildings({ ...filters, accountId: currentAccountId! }),
    enabled: !!currentAccountId,
  })
}
```

### Component Usage

```typescript
import { useAccountSwitcher } from '@/hooks/auth/use-account-switcher'
import { useUserProfile } from '@/hooks/auth/use-user-profile'

export function AccountSwitcher() {
  const { profile } = useUserProfile()
  const { currentAccountId, setCurrentAccountId } = useAccountSwitcher()

  // Get accessible accounts from feed
  const accessibleAccounts = profile?.accessible_accounts || []

  return (
    <Select
      value={currentAccountId || ''}
      onValueChange={setCurrentAccountId}
    >
      {accessibleAccounts.map(account => (
        <option key={account.id} value={account.id_prefix}>
          {account.name}
        </option>
      ))}
    </Select>
  )
}
```

---

## Pattern 6: RLS (Row Level Security)

### What is RLS?

RLS enforces data access rules at the database level, providing an additional security layer.

### Example RLS Policy

```sql
-- Only allow users to see buildings for their account
CREATE POLICY "Users can only view buildings for their account"
  ON buildings
  FOR SELECT
  USING (
    account_id IN (
      SELECT account_id
      FROM users
      WHERE auth_user_id = auth.uid()
    )
  );
```

### Hook Implementation with RLS

```typescript
// RLS handles filtering automatically
async function fetchBuildings(): Promise<BuildingRow[]> {
  const supabase = createClient()

  // No explicit account filter needed - RLS handles it
  const { data, error } = await supabase
    .from('buildings')
    .select('*')

  if (error) throw error
  return data
}

// But we still include accountId in queryKey for cache scoping
export function useBuildings() {
  const { profile } = useUserProfile()
  const accountId = profile?.account?.id_prefix

  return useQuery({
    queryKey: buildingKeys.list(accountId!, {}),
    queryFn: fetchBuildings,
    enabled: !!accountId,
  })
}
```

**Best Practice**: Use both RLS AND explicit filtering for defense in depth.

---

## Pattern 7: Multi-Tenant Mutations

### The Problem

Mutations must respect account boundaries:

```typescript
// ❌ WRONG: Could create building for any account
await supabase
  .from('buildings')
  .insert({ name: 'New Building', account_id: 'any-account-id' })
```

### The Solution

Validate account ownership:

```typescript
// ✅ CORRECT: Ensure user owns the account
export function useCreateBuilding() {
  const { profile } = useUserProfile()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: BuildingInsert) => {
      const supabase = createClient()

      // Enforce user's account
      const buildingData = {
        ...data,
        account_id: profile!.account_id,
      }

      const { data: result, error } = await supabase
        .from('buildings')
        .insert(buildingData)
        .select()
        .single()

      if (error) throw error
      return result as BuildingRow
    },
    onSuccess: () => {
      // Invalidate only current account's cache
      queryClient.invalidateQueries({
        queryKey: buildingKeys.byAccount(profile!.account.id_prefix),
      })
    },
  })
}
```

---

## Pattern 8: Testing Multi-Tenant Queries

### Test Isolation

```typescript
// test/hooks/use-buildings.test.ts

import { renderHook } from '@testing-library/react'
import { useBuildings } from '@/hooks/query'

describe('useBuildings', () => {
  it('only returns buildings for specified account', async () => {
    const accountId = 'acc_test'

    const { result } = renderHook(() => useBuildings({ accountId }))

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    // Verify all buildings belong to account
    const buildings = result.current.data
    expect(buildings?.every(b => b.account_id === accountId)).toBe(true)
  })

  it('uses separate cache for different accounts', async () => {
    const account1 = 'acc_1'
    const account2 = 'acc_2'

    // Fetch for account 1
    const { result: result1 } = renderHook(() => useBuildings({ accountId: account1 }))
    await waitFor(() => expect(result1.current.isSuccess).toBe(true))

    // Fetch for account 2
    const { result: result2 } = renderHook(() => useBuildings({ accountId: account2 }))
    await waitFor(() => expect(result2.current.isSuccess).toBe(true))

    // Data should be different
    expect(result1.current.data).not.toEqual(result2.current.data)
  })
})
```

---

## Common Pitfalls

### ❌ Pitfall 1: Missing Account in Query Key

```typescript
// ❌ WRONG: Cache shared across accounts
queryKey: ['buildings', filters]

// User switches accounts → sees cached data from previous account
```

**Fix**: Always include account in query key

```typescript
// ✅ CORRECT
queryKey: ['buildings', 'account', accountId, filters]
```

---

### ❌ Pitfall 2: Hardcoded Account IDs

```typescript
// ❌ WRONG: Hardcoded UUID breaks in other environments
const accountId = 'cd4062aa-370b-453c-93db-c9f8c45551a6'
```

**Fix**: Always get account from user profile or context

```typescript
// ✅ CORRECT
const { profile } = useUserProfile()
const accountId = profile?.account?.id_prefix
```

---

### ❌ Pitfall 3: Forgetting `!inner()`

```typescript
// ❌ WRONG: May return data without proper account filtering
.select('*, accounts(id)')
.eq('accounts.id_prefix', accountId)
```

**Fix**: Use `!inner()` for required relationships

```typescript
// ✅ CORRECT
.select('*, accounts!inner(id, id_prefix)')
.eq('accounts.id_prefix', accountId)
```

---

## Multi-Tenant Checklist

### Before Deploying

- [ ] All queries include account filtering
- [ ] Query keys include `accountId`
- [ ] Used `!inner()` for account joins
- [ ] Mutations validate account ownership
- [ ] RLS policies configured (if applicable)
- [ ] Cache invalidation scoped to account
- [ ] Tested account switching
- [ ] Tested cross-account access (if using feed)

---

## Summary

### Core Principles

1. **Always filter by account** - No exceptions
2. **Include accountId in query keys** - Prevent cache leakage
3. **Use `!inner()` for isolation** - Enforce database-level filtering
4. **Validate in mutations** - Prevent unauthorized writes
5. **Test thoroughly** - Verify data isolation

### Tools Available

- ✅ Account filtering with `!inner()`
- ✅ Query key scoping
- ✅ Feed field for cross-account access
- ✅ RLS for database-level security
- ✅ Account switcher for multi-account users

---

**Next**: [Troubleshooting Guide](./07-TROUBLESHOOTING.md)
