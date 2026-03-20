# Component Decomposition Pattern

## Overview

**No inline thousand+ line files.** Features are decomposed into focused, single-responsibility files organized by feature folder.

## The Problem

```typescript
// ❌ BAD: 1000+ line monolith
// ai-models-page.tsx
export function AIModelsPage() {
  // 8 data fetching functions
  // 4 CRUD operations
  // 7 pieces of state
  // Edit dialog UI
  // Version history dialog UI
  // Grid view UI
  // Grouped view UI
  // 7 utility functions
  // ... 1000+ lines
}
```

## The Solution

```
feature/
├── index.ts              # Barrel export
├── types.ts              # Feature types + type guards
├── constants.ts          # Feature constants
├── FeatureContainer.tsx  # Container (hooks + orchestration)
├── FeatureHeader.tsx     # Header component
├── FeatureList.tsx       # List/grid component
├── FeatureCard.tsx       # Card component
├── FeatureDialog.tsx     # Create/edit dialog
└── hooks/
    ├── useFeatureQuery.ts
    └── useFeatureMutation.ts
```

## Decomposition Rules

### Rule 1: Container vs Presentation

**Container Component** (~50-100 lines):
- Uses hooks for data fetching
- Manages local UI state
- Orchestrates child components
- Handles loading/error states

**Presentation Components** (~30-150 lines each):
- Receive data via props
- Render UI
- Emit events via callbacks
- No direct data fetching

```typescript
// FeatureContainer.tsx (Container)
export function FeatureContainer() {
  const { data, isLoading } = useFeatureQuery();
  const [selectedItem, setSelectedItem] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  if (isLoading) return <FeatureSkeleton />;

  return (
    <>
      <FeatureHeader onAdd={() => setDialogOpen(true)} />
      <FeatureList
        items={data}
        onSelect={setSelectedItem}
      />
      <FeatureDialog
        open={dialogOpen}
        item={selectedItem}
        onClose={() => setDialogOpen(false)}
      />
    </>
  );
}

// FeatureList.tsx (Presentation)
export function FeatureList({ items, onSelect }: FeatureListProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {items.map(item => (
        <FeatureCard
          key={item.id}
          item={item}
          onClick={() => onSelect(item)}
        />
      ))}
    </div>
  );
}
```

### Rule 2: Types in Dedicated File

```typescript
// types.ts
export interface Feature {
  id: string;
  name: string;
  status: FeatureStatus;
  config: FeatureConfig;
}

export type FeatureStatus = 'active' | 'inactive' | 'pending';

export interface FeatureConfig {
  enabled: boolean;
  options: string[];
}

// Type guards (co-located with types)
export function isActiveFeature(feature: Feature): boolean {
  return feature.status === 'active';
}

export function hasConfig(feature: Feature): feature is Feature & { config: Required<FeatureConfig> } {
  return feature.config !== null && feature.config.enabled;
}
```

### Rule 3: Constants in Dedicated File

```typescript
// constants.ts
export const FEATURE_STATUS_LABELS: Record<FeatureStatus, string> = {
  active: 'Active',
  inactive: 'Inactive',
  pending: 'Pending Review',
};

export const FEATURE_STATUS_COLORS: Record<FeatureStatus, string> = {
  active: 'bg-green-500',
  inactive: 'bg-gray-500',
  pending: 'bg-yellow-500',
};

export const DEFAULT_FEATURE_CONFIG: FeatureConfig = {
  enabled: false,
  options: [],
};

export const MAX_FEATURES_PER_PAGE = 20;
```

### Rule 4: Hooks in Dedicated Files

```typescript
// hooks/useFeatureQuery.ts
export function useFeatureQuery(accountId: string) {
  return useQuery({
    queryKey: featureKeys.list(accountId),
    queryFn: () => getFeatures(accountId),
  });
}

// hooks/useFeatureMutation.ts
export function useCreateFeature(accountId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createFeature,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: featureKeys.list(accountId),
      });
    },
  });
}
```

### Rule 5: Barrel Export

```typescript
// index.ts
export { FeatureContainer } from './FeatureContainer';
export { FeatureList } from './FeatureList';
export { FeatureCard } from './FeatureCard';
export { FeatureDialog } from './FeatureDialog';
export { useFeatureQuery } from './hooks/useFeatureQuery';
export { useCreateFeature } from './hooks/useFeatureMutation';
export type { Feature, FeatureStatus, FeatureConfig } from './types';
```

## Real Example: Workflows Feature

```
workflows/
├── index.ts                           # Barrel export
├── workflow-editor.tsx                # Container (~100 lines)
├── workflow-builder.tsx               # Canvas component
├── workflows-list.tsx                 # List view
├── workflow-toolbar.tsx               # Toolbar
├── publish-dialog.tsx                 # Publish modal
├── version-history-panel.tsx          # Version display
│
├── workflow-builder/
│   └── types.ts                       # Workflow types + type guards
│
├── nodes/                             # Node components (1 per type)
│   ├── core/
│   │   ├── StartNode.tsx              # ~50 lines
│   │   ├── EndNode.tsx                # ~50 lines
│   │   └── AgentNode.tsx              # ~80 lines
│   ├── logic/
│   │   ├── ConditionNode.tsx
│   │   └── TriageNode.tsx
│   ├── tools/
│   │   ├── SkillNode.tsx
│   │   ├── CDLRuleNode.tsx
│   │   └── GuardrailNode.tsx
│   └── discovery/
│       ├── DiscoveryPhaseNode.tsx
│       ├── SkillLoaderNode.tsx
│       └── HandoffNode.tsx
│
├── node-config-panel/                 # Config panels (1 per node)
│   ├── core/
│   │   ├── StartNodeConfig.tsx
│   │   ├── EndNodeConfig.tsx
│   │   └── AgentNodeConfig.tsx
│   ├── shared/
│   │   ├── constants.ts               # Styling, phase config
│   │   └── types.ts                   # Shared config types
│   └── index.tsx                      # Config panel router
│
├── testing/                           # Test UI components
│   ├── components/
│   │   ├── NodeTestSection.tsx
│   │   ├── NodeTestResultPanel.tsx
│   │   └── NodeDataTabs.tsx
│   └── types.ts
│
└── version-history/
    └── types.ts
```

## Component Size Guidelines

| Component Type | Target Lines | HARD LIMIT | Split Pattern |
|----------------|--------------|------------|---------------|
| Container | 50-100 | 150 | Child presentation components |
| Presentation | 30-100 | 150 | Focused sub-components |
| Dialog/Modal | 50-150 | 200 | `steps/Step1.tsx` + shared `types.ts` |
| Form | 100-200 | 300 | Sub-forms by field group |
| Hook (reads) | 40-80 | 120 | One entity's queries |
| Hook (reads+writes) | 60-100 | 150 | `queries.ts` + `mutations.ts` |
| Types file | 50-200 | 300 | Group by domain |
| Constants file | 20-50 | 100 | — |

> **These are enforced by the PostToolUse decomposition hook.** Files exceeding these limits trigger automatic warnings with specific extraction instructions. At CRITICAL level (800+ lines), Claude is instructed to stop and decompose before continuing.

## When to Split

Split a component when:
- It exceeds 150 lines
- It handles multiple concerns (data + UI + forms)
- It has multiple view modes (list + grid + grouped)
- It contains reusable pieces (cards, dialogs)
- It has complex state logic (extract to hook)

## File Naming

```
# Components: PascalCase
FeatureList.tsx
FeatureCard.tsx
FeatureDialog.tsx

# Hooks: camelCase with "use" prefix
useFeatureQuery.ts
useFeatureMutation.ts
useFeatureState.ts

# Types/Constants: lowercase
types.ts
constants.ts
utils.ts

# Index: barrel export
index.ts
```

## Import Organization

```typescript
// 1. React/Next
import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';

// 2. External libraries
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';

// 3. Internal shared
import { Button } from '@/components/ui/button';
import { featureKeys } from '@cipher/shared';

// 4. Feature-local
import { FeatureCard } from './FeatureCard';
import { useFeatureQuery } from './hooks/useFeatureQuery';
import { FEATURE_STATUS_LABELS } from './constants';
import type { Feature, FeatureStatus } from './types';
```

## Summary

| Principle | Implementation |
|-----------|---------------|
| Single Responsibility | One component = one job |
| Types Extraction | `types.ts` per feature |
| Constants Extraction | `constants.ts` per feature |
| Hook Extraction | `hooks/` folder per feature |
| Container/Presentation | Container orchestrates, presentation renders |
| Barrel Exports | `index.ts` for clean imports |
| Size Limits | 150 lines max per component |
