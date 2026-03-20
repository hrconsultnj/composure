# 13 - Icon Patterns (React Native)

## Overview

Icons in React Native (via `react-native-iconify`) require a **safe wrapper** to prevent app crashes. The raw `Iconify` component throws in dev mode when icon data is missing from `globalThis.__ICONIFY__` (stale cache, timing issue, polyfill race). This crashes the entire screen.

**Rule: NEVER import from `react-native-iconify` directly in components.**

---

## The Safe Icon Wrapper (Required)

Every React Native project using `react-native-iconify` MUST have this wrapper:

```tsx
// src/components/common/icon.tsx
import React from "react";
import { View } from "react-native";
import { Iconify } from "react-native-iconify";

interface IconProps {
  icon: string;
  size?: number;
  color?: string;
}

const __ICONIFY__ = () => (globalThis as any).__ICONIFY__;

export function Icon({ icon, size = 24, color }: IconProps) {
  const registry = __ICONIFY__();

  if (!registry || !registry[icon]) {
    if (__DEV__) {
      console.warn(
        `[Icon] "${icon}" unavailable — nuke caches & restart Metro`
      );
    }
    // Invisible placeholder — same dimensions, no crash, no layout shift
    return <View style={{ width: size, height: size }} />;
  }

  return <Iconify icon={icon} size={size} color={color} />;
}
```

### Why This Works

- Pre-checks `globalThis.__ICONIFY__` registry before rendering
- Returns an invisible `<View>` placeholder if the icon is missing (same dimensions = no layout shift)
- Logs a dev warning so you know which icon failed
- Never crashes the app regardless of cache state

---

## Dynamic Icons Work

The babel plugin loads ALL icons from `babel.config.js` into `globalThis.__ICONIFY__` at build time. **It does NOT scan source code.** Dynamic icon props work perfectly:

```tsx
import { Icon } from "../common/icon";

// ALL of these work — as long as the icon is in babel.config.js
<Icon icon="mdi:home" />
<Icon icon={isActive ? "mdi:home" : "mdi:home-outline"} />
<Icon icon={iconMap[key]} />
<Icon icon={tab.icon} />      // from shared navigation config
<Icon icon={getIcon()} />     // from any function
```

This means icons from shared configs (navigation, tenant types, etc.) work seamlessly — no switch/case needed.

---

## Icon Map Pattern

For components that map IDs to icons (like drawer navigation), use a map instead of switch/case:

```tsx
import { Icon } from "../common/icon";

const ICON_MAP: Record<string, string> = {
  dashboard: "mdi:view-dashboard-outline",
  accounts: "mdi:domain",
  settings: "mdi:cog-outline",
};

function NavIcon({ id, size, color }: { id: string; size: number; color: string }) {
  const iconName = ICON_MAP[id];
  if (!iconName) {
    return <View style={{ width: size, height: size }} />;
  }
  return <Icon icon={iconName} size={size} color={color} />;
}
```

---

## Setup Checklist (New Projects)

1. `pnpm add react-native-iconify`
2. Create `src/components/common/icon.tsx` (safe wrapper above)
3. Create `src/icon-polyfill.js` with `// @@iconify-code-gen` marker
4. Add `// @@iconify-code-gen` as line 1 of `app/_layout.tsx`
5. Configure `babel.config.js` with icons array (NO `entry` option)
6. Register polyfill in `metro.config.js` via `config.serializer.getPolyfills`
7. Migrate ALL component imports to use `Icon` from the wrapper
8. Update project `CLAUDE.md` with "never import Iconify directly" rule
9. Validate all icons exist in `@iconify/json` before adding

## Migration Checklist (Existing Projects)

1. Create `src/components/common/icon.tsx` wrapper
2. Find all files: `grep -rl 'from "react-native-iconify"' src/`
3. Replace imports: `"react-native-iconify"` -> relative path to `common/icon`
4. Replace JSX: `<Iconify` -> `<Icon` (replace_all in each file)
5. Use **relative imports only** — `@/` aliases may not resolve in all Metro configs
6. Update CLAUDE.md and README critical rules

---

## Anti-Patterns

| Anti-Pattern | Why It's Bad | Correct Approach |
|-------------|-------------|-----------------|
| Raw `Iconify` import | Crashes app when icon data missing | Use `Icon` wrapper |
| `mdi:circle` fallback | Fallback itself can fail | Invisible `<View>` placeholder |
| 100-line switch/case for icons | Unmaintainable | `Record<string, string>` map |
| `@/` path alias for icon import | May not resolve in Metro monorepo | Relative imports |
| `entry` option in babel plugin | Disables `@@iconify-code-gen` marker | Use marker only, no `entry` |

---

## Full Reference

For complete details including babel plugin internals, Metro polyfill pattern, cache locations, and troubleshooting:

See `~/.claude/examples/mobile-patterns/06-iconify-patterns.md`
