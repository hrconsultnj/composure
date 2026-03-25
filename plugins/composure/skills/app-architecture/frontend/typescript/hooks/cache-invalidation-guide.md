# Cache Invalidation Guide

**Critical patterns for ensuring data consistency in TanStack Query hooks**

---

## Why Cache Invalidation Matters

When you mutate data (create, update, delete), related cached queries become stale. Proper invalidation ensures:
- UI shows latest data immediately
- Users don't see outdated information
- Related queries stay synchronized

---

## Core Invalidation Patterns

### Pattern 1: Invalidate All Related Queries

After creating/updating/deleting, invalidate the entire resource family:

```typescript
export function useCreateUser() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: UserInsert) => {
      // ... create user
    },
    onSuccess: () => {
      // ✅ Invalidate ALL user queries (lists and details)
      queryClient.invalidateQueries({ queryKey: userKeys.all })
    },
  })
}
```

**Why**: `userKeys.all` is `['users']`, so this invalidates:
- `['users', 'list', ...]` - all user lists
- `['users', 'detail', '...']` - all user details

### Pattern 2: Invalidate Specific Query + Related Lists

After updating a single resource, invalidate its detail AND all lists:

```typescript
export function useUpdateUser() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, data }) => {
      // ... update user
    },
    onSuccess: (_, variables) => {
      // Invalidate this specific user's detail
      queryClient.invalidateQueries({
        queryKey: userKeys.detail(variables.id)
      })

      // Invalidate all user lists (this user might appear in lists)
      queryClient.invalidateQueries({
        queryKey: userKeys.lists()
      })
    },
  })
}
```

---

## Critical: Invalidate Dependent Queries

### Example Problem

```typescript
// ❌ INCOMPLETE: Only invalidates account
export function useDelegateUsers() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ accountId, userIds }) => {
      // ... delegate users to account
    },
    onSuccess: (result, variables) => {
      // Invalidates account data
      queryClient.refetchQueries({
        queryKey: ['account', variables.accountIdPrefix]
      })

      // ❌ MISSING: available-hq-users query is now stale!
      // After delegating users, the list of available users changes
    },
  })
}
```

### Solution: Invalidate All Related Queries

```typescript
// ✅ COMPLETE: Invalidates all related queries
export function useDelegateUsers() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ accountId, userIds }) => {
      // ... delegate users to account
    },
    onSuccess: (result, variables) => {
      // Primary query: account data
      queryClient.refetchQueries({
        queryKey: ['account', variables.accountIdPrefix]
      })

      // ✅ Dependent query: available HQ users changed
      queryClient.invalidateQueries({
        queryKey: ['available-hq-users', variables.accountId]
      })

      // ✅ If there are user lists showing delegated users
      queryClient.invalidateQueries({
        queryKey: ['users', 'account', variables.accountId]
      })
    },
  })
}
```

---

## Identifying Dependent Queries

Ask these questions when writing a mutation:

1. **What data did I change?**
   - Example: Added users to account

2. **What queries display this data?**
   - Account detail query
   - Account users list query

3. **What queries filter or compute based on this data?**
   - Available HQ users (filters out users already assigned)
   - Account stats (counts of users)

4. **What parent/child relationships exist?**
   - Building changes → invalidate units query
   - Account changes → invalidate building queries for that account

---

## Common Invalidation Scenarios

### Scenario 1: Create Entity

```typescript
export function useCreateBuilding() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: BuildingInsert) => {
      // ... create building
    },
    onSuccess: () => {
      // Invalidate all building queries
      queryClient.invalidateQueries({ queryKey: buildingKeys.all })

      // If buildings affect account stats, invalidate those too
      queryClient.invalidateQueries({ queryKey: ['account-stats'] })
    },
  })
}
```

### Scenario 2: Update Entity

```typescript
export function useUpdateBuilding() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, data }) => {
      // ... update building
    },
    onSuccess: (_, variables) => {
      // Invalidate specific building
      queryClient.invalidateQueries({
        queryKey: buildingKeys.detail(variables.id)
      })

      // Invalidate all building lists
      queryClient.invalidateQueries({
        queryKey: buildingKeys.lists()
      })

      // If building has units, invalidate unit queries
      queryClient.invalidateQueries({
        queryKey: ['units', 'building', variables.id]
      })
    },
  })
}
```

### Scenario 3: Delete Entity

```typescript
export function useDeleteBuilding() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      // ... delete building
    },
    onSuccess: () => {
      // Invalidate all building queries
      queryClient.invalidateQueries({ queryKey: buildingKeys.all })

      // Orphaned units might need attention
      queryClient.invalidateQueries({ queryKey: ['units'] })

      // Account stats will change
      queryClient.invalidateQueries({ queryKey: ['account-stats'] })
    },
  })
}
```

### Scenario 4: Relationship Changes

```typescript
export function useAssignUsersToAccount() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ accountId, userIds }) => {
      // ... assign users
    },
    onSuccess: (_, variables) => {
      // Account's user list changed
      queryClient.invalidateQueries({
        queryKey: ['users', 'account', variables.accountId]
      })

      // Each user's account relationship changed
      variables.userIds.forEach(userId => {
        queryClient.invalidateQueries({
          queryKey: userKeys.detail(userId)
        })
      })

      // Available users for assignment changed
      queryClient.invalidateQueries({
        queryKey: ['available-users', variables.accountId]
      })

      // Account metadata changed
      queryClient.invalidateQueries({
        queryKey: ['account', variables.accountId]
      })
    },
  })
}
```

---

## Invalidation Methods

### invalidateQueries (Most Common)
Marks queries as stale and refetches if they're currently active.

```typescript
queryClient.invalidateQueries({ queryKey: userKeys.all })
```

### refetchQueries
Immediately refetches matching queries, regardless of staleness.

```typescript
queryClient.refetchQueries({
  queryKey: ['account', accountId],
  type: 'active' // Only refetch active queries
})
```

### removeQueries
Removes queries from cache entirely.

```typescript
queryClient.removeQueries({ queryKey: ['temp-data'] })
```

### setQueryData
Manually update cache (for optimistic updates).

```typescript
queryClient.setQueryData(userKeys.detail(userId), updatedUser)
```

---

## Debugging Checklist

When data seems stale after a mutation:

- [ ] Is the mutation's `onSuccess` being called?
- [ ] Are you invalidating the correct query keys?
- [ ] Did you include all dependent queries?
- [ ] Are query keys exactly matching (account for filters)?
- [ ] Is the component using the correct query key?
- [ ] Check React Query DevTools to see cache state

---

## Best Practices

1. **Use Query Key Factories**: Ensures consistent keys across hooks
2. **Invalidate Broadly**: When in doubt, invalidate more rather than less
3. **Think Relationships**: Consider parent-child and filter relationships
4. **Test After Mutations**: Verify UI updates immediately
5. **Use DevTools**: React Query DevTools show cache state in real-time

---

## Anti-Patterns

### ❌ Missing Dependent Invalidation
```typescript
// Only invalidates account, forgets about related queries
onSuccess: () => {
  queryClient.invalidateQueries({ queryKey: ['account'] })
  // Missing: users, stats, available users, etc.
}
```

### ❌ Hardcoded Query Keys
```typescript
// Can't invalidate consistently
queryKey: ['users', accountId] // Not using factory

// Should be:
queryKey: userKeys.list({ accountId })
```

### ❌ Forgetting Lists When Updating Detail
```typescript
onSuccess: (_, variables) => {
  // Only invalidates detail
  queryClient.invalidateQueries({
    queryKey: userKeys.detail(variables.id)
  })
  // Missing: User lists that show this user
}
```

---

## Success Criteria

After implementing cache invalidation:

- ✅ UI updates immediately after mutations
- ✅ No stale data visible to users
- ✅ Related queries stay synchronized
- ✅ No manual page refreshes needed
- ✅ React Query DevTools shows correct cache state
