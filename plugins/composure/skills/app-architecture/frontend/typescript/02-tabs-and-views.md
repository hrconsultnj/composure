# Tabs & Layout Views Pattern

## Overview

Tabs and layout views (grid/card/grouped) are **not inline**. Tab configurations are external, and each tab is a separate route or component.

## Tabs Pattern

### External Tab Configuration

```typescript
// components/navigation/tab-config.ts

export interface TabConfig {
  name: string;
  href: string;
  icon: string;
  description?: string;
}

// Generate tabs for account settings
export function generateAccountTabs(
  tenantIdPrefix: string,
  accountIdPrefix: string
): TabConfig[] {
  const basePath = `/org/${tenantIdPrefix}/accounts/${accountIdPrefix}`;

  return [
    {
      name: 'Overview',
      href: basePath,
      icon: 'mdi:view-dashboard',
      description: 'Account overview and stats'
    },
    {
      name: 'Plan',
      href: `${basePath}/plan`,
      icon: 'mdi:credit-card',
      description: 'Subscription and billing'
    },
    {
      name: 'Team',
      href: `${basePath}/team`,
      icon: 'mdi:account-group',
      description: 'Team members and roles'
    },
    {
      name: 'Shops',
      href: `${basePath}/shops`,
      icon: 'mdi:store',
      description: 'Connected shops'
    },
    {
      name: 'Settings',
      href: `${basePath}/settings`,
      icon: 'mdi:cog',
      description: 'Account settings'
    },
  ];
}

// Generate tabs for admin dashboard
export function generateAdminTabs(adminIdPrefix: string): TabConfig[] {
  const basePath = `/admin/${adminIdPrefix}`;

  return [
    { name: 'Dashboard', href: basePath, icon: 'mdi:view-dashboard' },
    { name: 'Accounts', href: `${basePath}/accounts`, icon: 'mdi:domain' },
    { name: 'Users', href: `${basePath}/users`, icon: 'mdi:account-multiple' },
    { name: 'Vehicles', href: `${basePath}/vehicles`, icon: 'mdi:car' },
    { name: 'AI Models', href: `${basePath}/ai-models`, icon: 'mdi:robot' },
    { name: 'Audit', href: `${basePath}/audit`, icon: 'mdi:history' },
  ];
}
```

### Tab Navigation Component

```typescript
// components/navigation/TabNavigation.tsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import type { TabConfig } from './tab-config';

interface TabNavigationProps {
  tabs: TabConfig[];
  className?: string;
}

export function TabNavigation({ tabs, className }: TabNavigationProps) {
  const pathname = usePathname();

  return (
    <nav className={cn("border-b", className)}>
      <div className="flex space-x-8">
        {tabs.map((tab) => {
          const isActive = pathname === tab.href ||
            (tab.href !== tabs[0].href && pathname.startsWith(tab.href));

          return (
            <Link
              key={tab.name}
              href={tab.href}
              className={cn(
                "py-4 px-1 border-b-2 font-medium text-sm",
                isActive
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              {tab.name}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
```

### Usage in Layout

```typescript
// app/(protected)/(tenant)/org/[org_id_prefix]/accounts/[account_id_prefix]/layout.tsx
import { generateAccountTabs } from '@/components/navigation/tab-config';
import { TabNavigation } from '@/components/navigation/TabNavigation';

export default async function AccountLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { org_id_prefix: string; account_id_prefix: string };
}) {
  const tabs = generateAccountTabs(
    params.org_id_prefix,
    params.account_id_prefix
  );

  return (
    <div className="space-y-6">
      <TabNavigation tabs={tabs} />
      {children}
    </div>
  );
}
```

### Each Tab = Separate Page

```
accounts/[account_id_prefix]/
├── layout.tsx              # Tab navigation
├── page.tsx                # Overview tab content
├── plan/
│   └── page.tsx            # Plan tab content
├── team/
│   └── page.tsx            # Team tab content
├── shops/
│   └── page.tsx            # Shops tab content
└── settings/
    └── page.tsx            # Settings tab content
```

## Tab Components (Standalone)

For complex tab UIs, extract to dedicated components:

```
components/admin/
├── ai-models-tab.tsx       # Full AI models management UI
├── users-tab.tsx           # User management UI
├── vehicles-tab.tsx        # Vehicle management UI
├── integrations-tab.tsx    # Integration settings UI
└── audit-tab.tsx           # Audit log UI
```

```typescript
// app/(protected)/(internal)/admin/[id_prefix]/ai-models/page.tsx
import { AIModelsTab } from '@/components/admin/ai-models-tab';

export default function AIModelsPage() {
  return <AIModelsTab />;
}
```

## Layout Views Pattern

### View Mode State

```typescript
// hooks/useViewMode.ts
import { useState } from 'react';
import { useLocalStorage } from '@/hooks/useLocalStorage';

export type ViewMode = 'grid' | 'list' | 'grouped';

export function useViewMode(
  key: string,
  defaultMode: ViewMode = 'grid'
) {
  const [viewMode, setViewMode] = useLocalStorage<ViewMode>(
    `view-mode-${key}`,
    defaultMode
  );

  return { viewMode, setViewMode };
}
```

### View Toggle Component

```typescript
// components/ui/ViewToggle.tsx
'use client';

import { Button } from '@/components/ui/button';
import {
  LayoutGrid,
  List,
  LayoutList
} from 'lucide-react';
import type { ViewMode } from '@/hooks/useViewMode';

interface ViewToggleProps {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  availableModes?: ViewMode[];
}

export function ViewToggle({
  viewMode,
  onViewModeChange,
  availableModes = ['grid', 'list'],
}: ViewToggleProps) {
  const icons: Record<ViewMode, React.ReactNode> = {
    grid: <LayoutGrid className="h-4 w-4" />,
    list: <List className="h-4 w-4" />,
    grouped: <LayoutList className="h-4 w-4" />,
  };

  return (
    <div className="flex border rounded-md">
      {availableModes.map((mode) => (
        <Button
          key={mode}
          variant={viewMode === mode ? 'secondary' : 'ghost'}
          size="sm"
          onClick={() => onViewModeChange(mode)}
        >
          {icons[mode]}
        </Button>
      ))}
    </div>
  );
}
```

### Conditional View Rendering

```typescript
// components/features/FeatureList.tsx
'use client';

import { useViewMode } from '@/hooks/useViewMode';
import { ViewToggle } from '@/components/ui/ViewToggle';
import { FeatureCard } from './FeatureCard';
import { FeatureRow } from './FeatureRow';
import { FeatureGroup } from './FeatureGroup';

interface FeatureListProps {
  items: Feature[];
  groupBy?: (items: Feature[]) => Record<string, Feature[]>;
}

export function FeatureList({ items, groupBy }: FeatureListProps) {
  const { viewMode, setViewMode } = useViewMode('features');

  return (
    <div className="space-y-4">
      {/* Header with view toggle */}
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">
          {items.length} Features
        </h2>
        <ViewToggle
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          availableModes={groupBy ? ['grid', 'list', 'grouped'] : ['grid', 'list']}
        />
      </div>

      {/* Conditional view rendering */}
      {viewMode === 'grid' && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {items.map(item => (
            <FeatureCard key={item.id} item={item} />
          ))}
        </div>
      )}

      {viewMode === 'list' && (
        <div className="divide-y">
          {items.map(item => (
            <FeatureRow key={item.id} item={item} />
          ))}
        </div>
      )}

      {viewMode === 'grouped' && groupBy && (
        <div className="space-y-8">
          {Object.entries(groupBy(items)).map(([groupName, groupItems]) => (
            <FeatureGroup
              key={groupName}
              name={groupName}
              items={groupItems}
            />
          ))}
        </div>
      )}
    </div>
  );
}
```

### Grid View Component

```typescript
// components/features/views/GridView.tsx
interface GridViewProps<T> {
  items: T[];
  renderItem: (item: T) => React.ReactNode;
  columns?: {
    sm?: number;
    md?: number;
    lg?: number;
  };
}

export function GridView<T extends { id: string }>({
  items,
  renderItem,
  columns = { sm: 1, md: 2, lg: 3 },
}: GridViewProps<T>) {
  const gridCols = `grid-cols-${columns.sm} md:grid-cols-${columns.md} lg:grid-cols-${columns.lg}`;

  return (
    <div className={`grid gap-4 ${gridCols}`}>
      {items.map(item => (
        <div key={item.id}>
          {renderItem(item)}
        </div>
      ))}
    </div>
  );
}
```

### Grouped View Component

```typescript
// components/features/views/GroupedView.tsx
interface GroupedViewProps<T> {
  groups: Record<string, T[]>;
  renderItem: (item: T) => React.ReactNode;
  renderGroupHeader?: (groupName: string, items: T[]) => React.ReactNode;
}

export function GroupedView<T extends { id: string }>({
  groups,
  renderItem,
  renderGroupHeader,
}: GroupedViewProps<T>) {
  return (
    <div className="space-y-8">
      {Object.entries(groups).map(([groupName, items]) => (
        <div key={groupName}>
          {/* Group header */}
          {renderGroupHeader ? (
            renderGroupHeader(groupName, items)
          ) : (
            <h3 className="text-lg font-semibold mb-4">
              {groupName} ({items.length})
            </h3>
          )}

          {/* Group items */}
          <div className="grid gap-4 md:grid-cols-2">
            {items.map(item => (
              <div key={item.id}>
                {renderItem(item)}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
```

## File Structure

```
components/
├── navigation/
│   ├── tab-config.ts           # Tab definitions (external)
│   ├── TabNavigation.tsx       # Tab navigation component
│   └── TabLink.tsx             # Individual tab link
│
├── ui/
│   ├── ViewToggle.tsx          # Grid/list/grouped toggle
│   └── views/
│       ├── GridView.tsx        # Generic grid view
│       ├── ListView.tsx        # Generic list view
│       └── GroupedView.tsx     # Generic grouped view
│
└── features/
    ├── FeatureList.tsx         # Uses view mode
    ├── FeatureCard.tsx         # Card for grid view
    ├── FeatureRow.tsx          # Row for list view
    └── FeatureGroup.tsx        # Group for grouped view
```

## Summary

| Pattern | Implementation |
|---------|---------------|
| Tab Config | External file (`tab-config.ts`) |
| Tab Navigation | Component with active state detection |
| Tab Content | Separate page per tab (`page.tsx`) |
| Tab Components | Standalone files (`*-tab.tsx`) |
| View Mode | Hook with localStorage persistence |
| View Toggle | Button group component |
| View Rendering | Conditional based on viewMode state |
| View Components | Generic Grid/List/Grouped components |
