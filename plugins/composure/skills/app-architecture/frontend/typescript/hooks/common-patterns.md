# Common Patterns - Real-World Examples

**Proven patterns for building production-ready query hooks**

---

## Pattern 1: Paginated List with Filters

### Use Case
Display a list of users with filtering, sorting, and "Load More" pagination.

### Implementation

```typescript
// src/hooks/query/entities/core/users/use-users.ts

import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/infrastructure/supabase/client'
import type { Database } from '@/types/database.types'

type UserRow = Database['public']['Tables']['users']['Row']
type EntityStatus = Database['public']['Enums']['entity_status']

// Query keys
export const userKeys = {
  all: ['users'] as const,
  lists: () => [...userKeys.all, 'list'] as const,
  list: (filters: UserFilters) => [...userKeys.lists(), filters] as const,
}

// Filters interface
export interface UserFilters {
  status?: EntityStatus | 'all'
  search?: string
  page?: number
  pageSize?: number
}

// Paginated result
export interface PaginatedUsersResult {
  users: UserRow[]
  totalCount: number
  hasMore: boolean
}

// Fetch function
export async function fetchUsers(filters: UserFilters = {}): Promise<PaginatedUsersResult> {
  const supabase = createClient()
  const { status, search, page = 1, pageSize = 20 } = filters

  // Count query
  let countQuery = supabase
    .from('users')
    .select('*', { count: 'exact', head: true })

  if (status && status !== 'all') {
    countQuery = countQuery.eq('status', status)
  }

  if (search) {
    countQuery = countQuery.or(`full_name.ilike.%${search}%,email.ilike.%${search}%`)
  }

  const { count } = await countQuery
  const totalCount = count || 0

  // Data query with pagination
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  let dataQuery = supabase
    .from('users')
    .select('id, email, full_name, role, status, created_at')
    .order('created_at', { ascending: false })
    .range(from, to)

  if (status && status !== 'all') {
    dataQuery = dataQuery.eq('status', status)
  }

  if (search) {
    dataQuery = dataQuery.or(`full_name.ilike.%${search}%,email.ilike.%${search}%`)
  }

  const { data, error } = await dataQuery
  if (error) throw error

  const hasMore = (data?.length || 0) === pageSize

  return {
    users: data as UserRow[],
    totalCount,
    hasMore,
  }
}

// Hook
export function useUsers(filters: UserFilters = {}) {
  return useQuery({
    queryKey: userKeys.list(filters),
    queryFn: () => fetchUsers(filters),
    staleTime: 30 * 1000,
  })
}
```

### Component Usage

```typescript
'use client'

import { useState } from 'react'
import { useUsers } from '@/hooks/query'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Button } from '@/components/ui/button'

export function UserList() {
  const [page, setPage] = useState(1)
  const [status, setStatus] = useState<'all' | 'active' | 'inactive'>('all')
  const [search, setSearch] = useState('')

  const { data, isLoading } = useUsers({ page, pageSize: 20, status, search })

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex gap-2">
        <Input
          placeholder="Search by name or email..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value)
            setPage(1) // Reset to page 1 on search
          }}
        />
        <Select value={status} onValueChange={(v) => {
          setStatus(v as any)
          setPage(1) // Reset to page 1 on filter
        }}>
          <option value="all">All</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </Select>
      </div>

      {/* User List */}
      {isLoading && page === 1 ? (
        <div>Loading...</div>
      ) : (
        <>
          <div className="space-y-2">
            {data?.users.map(user => (
              <div key={user.id} className="p-4 border rounded">
                <div className="font-medium">{user.full_name}</div>
                <div className="text-sm text-muted-foreground">{user.email}</div>
              </div>
            ))}
          </div>

          {/* Load More */}
          {data?.hasMore && (
            <Button
              onClick={() => setPage(prev => prev + 1)}
              disabled={isLoading}
            >
              {isLoading ? 'Loading...' : 'Load More'}
            </Button>
          )}

          {/* Total Count */}
          <div className="text-sm text-muted-foreground">
            Showing {data?.users.length || 0} of {data?.totalCount || 0} users
          </div>
        </>
      )}
    </div>
  )
}
```

---

## Pattern 2: Detail View with Related Data

### Use Case
Display user details with related account and role information.

### Implementation

```typescript
// src/hooks/query/entities/core/users/use-user.ts

type UserRow = Database['public']['Tables']['users']['Row']
type AccountRow = Database['public']['Tables']['accounts']['Row']
type UserRoleRow = Database['public']['Tables']['user_roles']['Row']

// Extended user with relations
export interface UserWithRelations extends UserRow {
  account: Pick<AccountRow, 'id' | 'name' | 'logo' | 'business_model'>
  user_role: Pick<UserRoleRow, 'id' | 'role_name' | 'role_code'> | null
}

export const userKeys = {
  all: ['users'] as const,
  details: () => [...userKeys.all, 'detail'] as const,
  detail: (id: string) => [...userKeys.details(), id] as const,
}

async function fetchUser(id: string): Promise<UserWithRelations> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('users')
    .select(`
      *,
      account:account_id (
        id,
        name,
        logo,
        business_model
      ),
      user_role:user_role_id (
        id,
        role_name,
        role_code
      )
    `)
    .eq('id', id)
    .single()

  if (error) throw error
  return data as UserWithRelations
}

export function useUser(id: string) {
  return useQuery({
    queryKey: userKeys.detail(id),
    queryFn: () => fetchUser(id),
    enabled: !!id,
    staleTime: 60 * 1000, // 1 minute
  })
}
```

### Component Usage

```typescript
import { useUser } from '@/hooks/query'

export function UserProfile({ userId }: { userId: string }) {
  const { data: user, isLoading } = useUser(userId)

  if (isLoading) return <div>Loading...</div>

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <img
          src={user?.avatar_photo || '/default-avatar.png'}
          className="w-16 h-16 rounded-full"
        />
        <div>
          <h2 className="text-2xl font-bold">{user?.full_name}</h2>
          <p className="text-muted-foreground">{user?.email}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <div className="text-sm text-muted-foreground">Account</div>
          <div className="font-medium">{user?.account?.name}</div>
        </div>
        <div>
          <div className="text-sm text-muted-foreground">Role</div>
          <div className="font-medium">{user?.user_role?.role_name || 'No role'}</div>
        </div>
      </div>
    </div>
  )
}
```

---

## Pattern 3: CRUD Operations with Optimistic Updates

### Use Case
Create, update, delete users with instant UI feedback.

### Implementation

```typescript
// src/hooks/query/entities/core/users/use-users.ts

import { useMutation, useQueryClient } from '@tanstack/react-query'

type UserInsert = Database['public']['Tables']['users']['Insert']
type UserUpdate = Database['public']['Tables']['users']['Update']

// Create
export function useCreateUser() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: UserInsert) => {
      const supabase = createClient()
      const { data: result, error } = await supabase
        .from('users')
        .insert(data)
        .select()
        .single()

      if (error) throw error
      return result as UserRow
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userKeys.all })
    },
  })
}

// Update with optimistic update
export function useUpdateUser() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<UserUpdate> }) => {
      const supabase = createClient()
      const { data: result, error } = await supabase
        .from('users')
        .update(data)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return result as UserRow
    },
    // Optimistic update
    onMutate: async ({ id, data }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: userKeys.detail(id) })

      // Snapshot previous value
      const previousUser = queryClient.getQueryData(userKeys.detail(id))

      // Optimistically update
      queryClient.setQueryData(userKeys.detail(id), (old: UserRow) => ({
        ...old,
        ...data,
      }))

      return { previousUser }
    },
    onError: (err, variables, context) => {
      // Rollback on error
      if (context?.previousUser) {
        queryClient.setQueryData(userKeys.detail(variables.id), context.previousUser)
      }
    },
    onSettled: (data, error, variables) => {
      // Refetch after mutation
      queryClient.invalidateQueries({ queryKey: userKeys.detail(variables.id) })
      queryClient.invalidateQueries({ queryKey: userKeys.lists() })
    },
  })
}

// Delete
export function useDeleteUser() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const supabase = createClient()
      const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', id)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userKeys.all })
    },
  })
}
```

### Component Usage

```typescript
import { useCreateUser, useUpdateUser, useDeleteUser } from '@/hooks/query'

export function UserActions({ user }: { user: UserRow }) {
  const updateUser = useUpdateUser()
  const deleteUser = useDeleteUser()

  const handleToggleStatus = async () => {
    const newStatus = user.status === 'active' ? 'inactive' : 'active'

    await updateUser.mutateAsync({
      id: user.id,
      data: { status: newStatus },
    })
  }

  const handleDelete = async () => {
    if (confirm('Delete this user?')) {
      await deleteUser.mutateAsync(user.id)
    }
  }

  return (
    <div className="flex gap-2">
      <Button
        onClick={handleToggleStatus}
        disabled={updateUser.isPending}
      >
        {updateUser.isPending ? 'Updating...' : 'Toggle Status'}
      </Button>
      <Button
        onClick={handleDelete}
        variant="destructive"
        disabled={deleteUser.isPending}
      >
        {deleteUser.isPending ? 'Deleting...' : 'Delete'}
      </Button>
    </div>
  )
}
```

---

## Pattern 4: Dependent Queries

### Use Case
Fetch building details, then fetch units for that building.

### Implementation

```typescript
// src/hooks/query/entities/properties/buildings/use-building.ts

export function useBuilding(buildingId: string) {
  return useQuery({
    queryKey: ['buildings', 'detail', buildingId],
    queryFn: () => fetchBuilding(buildingId),
    enabled: !!buildingId,
  })
}

// src/hooks/query/entities/properties/units/use-building-units.ts

export function useBuildingUnits(buildingId: string) {
  return useQuery({
    queryKey: ['units', 'building', buildingId],
    queryFn: () => fetchBuildingUnits(buildingId),
    enabled: !!buildingId, // Only fetch if buildingId exists
  })
}
```

### Component Usage

```typescript
export function BuildingDetails({ buildingId }: { buildingId: string }) {
  // Fetch building first
  const { data: building, isLoading: buildingLoading } = useBuilding(buildingId)

  // Fetch units (only runs when buildingId exists)
  const { data: units, isLoading: unitsLoading } = useBuildingUnits(buildingId)

  if (buildingLoading) return <div>Loading building...</div>

  return (
    <div>
      <h2>{building?.name}</h2>

      {unitsLoading ? (
        <div>Loading units...</div>
      ) : (
        <div>{units?.length || 0} units</div>
      )}
    </div>
  )
}
```

---

## Pattern 5: Infinite Scroll

### Use Case
Load more data as user scrolls down.

### Implementation

```typescript
import { useInfiniteQuery } from '@tanstack/react-query'

export function useInfiniteUsers(filters: UserFilters = {}) {
  return useInfiniteQuery({
    queryKey: userKeys.list(filters),
    queryFn: ({ pageParam = 1 }) => fetchUsers({ ...filters, page: pageParam }),
    initialPageParam: 1,
    getNextPageParam: (lastPage, allPages) => {
      return lastPage.hasMore ? allPages.length + 1 : undefined
    },
  })
}
```

### Component Usage

```typescript
import { useInfiniteUsers } from '@/hooks/query'
import { useInView } from 'react-intersection-observer'

export function InfiniteUserList() {
  const { ref, inView } = useInView()

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteUsers({ status: 'active' })

  // Fetch next page when sentinel comes into view
  useEffect(() => {
    if (inView && hasNextPage) {
      fetchNextPage()
    }
  }, [inView, hasNextPage, fetchNextPage])

  return (
    <div>
      {data?.pages.map((page, i) => (
        <div key={i}>
          {page.users.map(user => (
            <div key={user.id}>{user.full_name}</div>
          ))}
        </div>
      ))}

      {/* Sentinel element */}
      <div ref={ref}>
        {isFetchingNextPage && <div>Loading more...</div>}
      </div>
    </div>
  )
}
```

---

## Pattern 6: Search with Debouncing

### Use Case
Search users with debounced input to avoid excessive queries.

### Implementation

```typescript
import { useState, useEffect } from 'react'
import { useUsers } from '@/hooks/query'

export function UserSearch() {
  const [searchInput, setSearchInput] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput)
    }, 300) // 300ms delay

    return () => clearTimeout(timer)
  }, [searchInput])

  // Query only runs when debouncedSearch changes
  const { data, isLoading } = useUsers({
    search: debouncedSearch,
    page: 1,
    pageSize: 10,
  })

  return (
    <div>
      <Input
        placeholder="Search users..."
        value={searchInput}
        onChange={(e) => setSearchInput(e.target.value)}
      />

      {isLoading && <div>Searching...</div>}

      <div className="mt-4">
        {data?.users.map(user => (
          <div key={user.id}>{user.full_name}</div>
        ))}
      </div>
    </div>
  )
}
```

---

## Pattern 7: Conditional Fetching

### Use Case
Only fetch data when certain conditions are met.

### Implementation

```typescript
export function useConditionalUsers({ enabled, ...filters }: UserFilters & { enabled: boolean }) {
  return useQuery({
    queryKey: userKeys.list(filters),
    queryFn: () => fetchUsers(filters),
    enabled: enabled, // Only fetch when enabled is true
    staleTime: 30 * 1000,
  })
}
```

### Component Usage

```typescript
export function ConditionalUserList() {
  const [showUsers, setShowUsers] = useState(false)

  // Only fetches when showUsers is true
  const { data, isLoading } = useConditionalUsers({
    enabled: showUsers,
    status: 'active',
  })

  return (
    <div>
      <Button onClick={() => setShowUsers(!showUsers)}>
        {showUsers ? 'Hide' : 'Show'} Users
      </Button>

      {showUsers && (
        <>
          {isLoading && <div>Loading...</div>}
          {data?.users.map(user => (
            <div key={user.id}>{user.full_name}</div>
          ))}
        </>
      )}
    </div>
  )
}
```

---

## Pattern 8: Prefetching

### Use Case
Prefetch data on hover for instant navigation.

### Implementation

```typescript
import { useQueryClient } from '@tanstack/react-query'

export function UserListItem({ user }: { user: UserRow }) {
  const queryClient = useQueryClient()

  const prefetchUser = () => {
    queryClient.prefetchQuery({
      queryKey: userKeys.detail(user.id),
      queryFn: () => fetchUser(user.id),
      staleTime: 60 * 1000,
    })
  }

  return (
    <Link
      href={`/users/${user.id}`}
      onMouseEnter={prefetchUser} // Prefetch on hover
    >
      {user.full_name}
    </Link>
  )
}
```

---

## Pattern 9: Background Refetching

### Use Case
Keep data fresh with automatic background refetching.

### Implementation

```typescript
export function useUsers(filters: UserFilters = {}) {
  return useQuery({
    queryKey: userKeys.list(filters),
    queryFn: () => fetchUsers(filters),
    staleTime: 30 * 1000,          // Consider fresh for 30s
    refetchInterval: 60 * 1000,    // Refetch every 60s
    refetchOnWindowFocus: true,    // Refetch on window focus
    refetchOnReconnect: true,      // Refetch on reconnect
  })
}
```

---

## Pattern 10: Error Handling with Retry

### Use Case
Automatically retry failed queries with exponential backoff.

### Implementation

```typescript
export function useUsers(filters: UserFilters = {}) {
  return useQuery({
    queryKey: userKeys.list(filters),
    queryFn: () => fetchUsers(filters),
    retry: 3,                       // Retry 3 times
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff
  })
}
```

### Component Usage with Error Boundary

```typescript
export function UserList() {
  const { data, isLoading, error, refetch } = useUsers()

  if (error) {
    return (
      <div className="text-red-500">
        <p>Error: {error.message}</p>
        <Button onClick={() => refetch()}>Try Again</Button>
      </div>
    )
  }

  // ... rest of component
}
```

---

## Summary

These patterns cover:
- ✅ Pagination with filters
- ✅ Detail views with relations
- ✅ CRUD with optimistic updates
- ✅ Dependent queries
- ✅ Infinite scroll
- ✅ Debounced search
- ✅ Conditional fetching
- ✅ Prefetching
- ✅ Background refetching
- ✅ Error handling

**Next**: [Multi-Tenant Patterns](./06-MULTI-TENANT-PATTERNS.md)
