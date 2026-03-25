# TanStack Query Pattern Examples

Complete working examples for all 5 TanStack Query patterns used in Happy to Deliver.

## Table of Contents

1. [Pattern A: Simple Page](#pattern-a-simple-page)
2. [Pattern B: Dashboard (Complex Page)](#pattern-b-dashboard-complex-page)
3. [Pattern C: SEO/SSR Page](#pattern-c-seosssr-page)
4. [Pattern D: Multi-Tenant Page](#pattern-d-multi-tenant-page)

---

## Pattern A: Simple Page

```tsx
/**
 * Pattern A: Simple Page (One Data Source)
 *
 * Use when:
 * - Single list/table/view
 * - No SEO needed
 * - Basic CRUD operations
 * - All data related to one main entity
 *
 * File: app/buildings/page.tsx
 */

'use client'

import { useBuildings, useCreateBuilding, useDeleteBuilding } from '@/hooks/query'
import { useState } from 'react'
import type { Database } from '@/lib/infrastructure/supabase/database.types'

// Database-first type pattern (✅ Best Practice)
// In production, import from auto-generated database.types.ts:
// type Building = Database['public']['Tables']['buildings']['Row']

// For this example, we use a simplified illustrative type:
// In production, import the exact type from your auto-generated database.types.ts
interface BuildingExample {
  id: string
  name: string
  address: string
  status: 'active' | 'inactive'
  created_at: string
}

// ============================================================================
// MAIN PAGE COMPONENT (Client Component)
// ============================================================================

export default function BuildingsPage() {
  // All TanStack Query hooks in one place
  const { data: buildings = [], isLoading, error } = useBuildings()
  const createMutation = useCreateBuilding()
  const deleteMutation = useDeleteBuilding()

  const [isFormOpen, setIsFormOpen] = useState(false)

  // Derived state (no useState needed!)
  const buildingCount = buildings.length
  const hasBuildings = buildingCount > 0

  if (error) {
    return (
      <div className="p-4">
        <h1 className="text-2xl font-bold mb-4">Error Loading Buildings</h1>
        <p className="text-red-600">{error.message}</p>
      </div>
    )
  }

  return (
    <div className="p-6">
      {/* Header Section */}
      <BuildingsHeader
        count={buildingCount}
        onCreateClick={() => setIsFormOpen(true)}
        isLoading={isLoading}
      />

      {/* Main Content */}
      {isLoading ? (
        <BuildingsLoading />
      ) : (
        <BuildingsList
          buildings={buildings}
          onDelete={deleteMutation.mutate}
          isDeleting={deleteMutation.isPending}
        />
      )}

      {/* Create Form Modal */}
      {isFormOpen && (
        <CreateBuildingForm
          onSubmit={(data) => {
            createMutation.mutate(data, {
              onSuccess: () => setIsFormOpen(false)
            })
          }}
          onCancel={() => setIsFormOpen(false)}
          isPending={createMutation.isPending}
          error={createMutation.error}
        />
      )}
    </div>
  )
}

// ============================================================================
// PRESENTATIONAL COMPONENTS (No data fetching - just props)
// ============================================================================

function BuildingsHeader({
  count,
  onCreateClick,
  isLoading
}: {
  count: number
  onCreateClick: () => void
  isLoading: boolean
}) {
  return (
    <div className="flex justify-between items-center mb-6">
      <div>
        <h1 className="text-3xl font-bold">Buildings</h1>
        {!isLoading && (
          <p className="text-gray-600">{count} total buildings</p>
        )}
      </div>
      <button
        onClick={onCreateClick}
        className="px-4 py-2 bg-blue-600 text-white rounded"
      >
        Create Building
      </button>
    </div>
  )
}

function BuildingsList({
  buildings,
  onDelete,
  isDeleting
}: {
  buildings: BuildingExample[]
  onDelete: (id: string) => void
  isDeleting: boolean
}) {
  if (buildings.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        No buildings yet. Create your first building!
      </div>
    )
  }

  return (
    <div className="grid gap-4">
      {buildings.map(building => (
        <div
          key={building.id}
          className="p-4 border rounded-lg flex justify-between items-center"
        >
          <div>
            <h3 className="font-semibold">{building.name}</h3>
            <p className="text-sm text-gray-600">{building.address}</p>
          </div>
          <button
            onClick={() => onDelete(building.id)}
            disabled={isDeleting}
            className="px-3 py-1 text-red-600 border border-red-600 rounded hover:bg-red-50"
          >
            Delete
          </button>
        </div>
      ))}
    </div>
  )
}

function BuildingsLoading() {
  return (
    <div className="grid gap-4">
      {[1, 2, 3].map(i => (
        <div key={i} className="p-4 border rounded-lg animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-2" />
          <div className="h-4 bg-gray-200 rounded w-1/2" />
        </div>
      ))}
    </div>
  )
}

function CreateBuildingForm({
  onSubmit,
  onCancel,
  isPending,
  error
}: {
  onSubmit: (data: { name: string; address: string }) => void
  onCancel: () => void
  isPending: boolean
  error: Error | null
}) {
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    onSubmit({
      name: formData.get('name') as string,
      address: formData.get('address') as string,
    })
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center">
      <div className="bg-white p-6 rounded-lg w-96">
        <h2 className="text-xl font-bold mb-4">Create Building</h2>

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block mb-2">Name</label>
            <input
              name="name"
              required
              className="w-full border rounded px-3 py-2"
            />
          </div>

          <div className="mb-4">
            <label className="block mb-2">Address</label>
            <input
              name="address"
              required
              className="w-full border rounded px-3 py-2"
            />
          </div>

          {error && (
            <div className="mb-4 p-2 bg-red-50 text-red-600 rounded">
              {error.message}
            </div>
          )}

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={isPending}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50"
            >
              {isPending ? 'Creating...' : 'Create'}
            </button>
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 border rounded"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
```

---

## Pattern B: Dashboard (Complex Page)

See `pattern-b-complex-page.tsx` for the complete dashboard pattern with multiple independent sections.

---

## Pattern C: SEO/SSR Page

See `pattern-c-seo-page.tsx` for the complete SSR pattern with server and client components.

---

## Pattern D: Multi-Tenant Page

See `pattern-d-multi-tenant.tsx` for the complete multi-tenant pattern with account scoping.
