# Expo Frontend — React Native Navigation & Components

> **Only load this file when `frontend: "expo"` in `.claude/no-bandaids.json`.**

## Phase 5: Expo Router Layout (Overlay Guards)

**Rule: Always render navigators — use overlay pattern for auth/loading guards.**

```tsx
// ✅ Auth/loading guards as overlays — navigator always mounted
<View style={{ flex: 1 }}>
  <Stack>...</Stack>
  {showLoading && (
    <View style={{ ...StyleSheet.absoluteFillObject, zIndex: 10 }}>
      <LoadingScreen />
    </View>
  )}
</View>
```

**NEVER** return `<LoadingScreen>` or `<OnboardingScreen>` INSTEAD of `<Slot>`/`<Stack>`/`<Tabs>`. This unmounts the navigator → "Maximum update depth exceeded".

---

## Phase 7: Expo Router Navigation

### Every route group needs `_layout.tsx`

```
(tabs)/
├── (dashboard)/
│   ├── _layout.tsx    <- REQUIRED (Stack wrapping index)
│   └── index.tsx
├── (my-foods)/
│   ├── _layout.tsx    <- REQUIRED
│   └── index.tsx
└── (hidden-route)/
    ├── _layout.tsx    <- REQUIRED (even for hidden routes!)
    └── index.tsx
```

Without `_layout.tsx`, expo-router sees `(dashboard)/index` as the route name, not `(dashboard)`. The `<Tabs.Screen name="(dashboard)">` won't match → tabs break.

**Deep Dive**: See `~/.claude/examples/mobile-patterns/09-route-groups-tabs.md`

---

## Anti-Patterns (Expo)

### ❌ Icons (React Native)
- Raw `Iconify` import (crashes when icon data missing — use safe `Icon` wrapper)
- Switch/case for icon mapping (use `Record<string, string>` map)
- `@/` path alias for icon wrapper (may not resolve in Metro monorepo — use relative imports)

### ❌ Bottom Sheets (React Native)
- **Horizontal slider + `enableDynamicSizing`** — All steps render side-by-side, gorhom measures tallest step, never re-measures on slide. Use conditional rendering instead.
- **Fixed footer outside scroll view + `enableDynamicSizing`** — `flex: 1` has no natural height, footer floats in middle with empty space below. Put buttons inside `BottomSheetScrollView`.
- **Percentage-based `maxDynamicContentSize`** — Doesn't account for status bar, stack header, orientation. Use `screenHeight - insets.top - 56 - 16`.

### ❌ Navigation (expo-router)
- **Missing `_layout.tsx` in route groups** — Causes "No route named" warnings and broken tab rendering.
- **Conditionally replacing navigator with non-navigator** — Use overlay pattern instead.
- Using `router.back()` for list return (unpredictable stack — use `router.replace()`)
- Hardcoded navigation paths (use builder functions like `buildRoutePath()`)

### ❌ Native Modules (Expo Turbo Modules)
- **Writing SDK integration code without compiling against the real SDK** — Always start with a no-op stub, then add real SDK code only when you can compile. **Expect 2-3 EAS build iterations.**
- **Bare `return@AsyncFunction` in Kotlin** — Always use `return@AsyncFunction null` for void async functions.
- **Nullable API chains in streaming methods** — Use non-null assertion early: `val a = api ?: return@AsyncFunction null`
- **Assuming SDK callback abstract classes cover all interface methods** — The compiler tells you which are missing.
- **Using `app.json` for EAS file environment variables** — Use `app.config.ts` with `process.env`.
- **Assuming `settings.gradle` structure** — Expo SDK 54+ uses `pluginManagement` + `expoAutolinking`. Always run `npx expo prebuild --no-install` to inspect.
- **Adding SDK dependencies before implementation is ready** — Keep dependencies commented until native implementation is tested.

### ❌ Config Plugins (Expo)
- **Not verifying generated native files** — Always run `npx expo prebuild --no-install` and inspect.
- **Hardcoded regex for Gradle structure** — Use Context7 to check current Expo config plugin docs.
- **Duplicating existing repo declarations** — Check before injecting via config plugin.
- **Import `@expo/config-plugins`** — Use `expo/config-plugins` (no @ prefix) in SDK 54+.

---

## Reference Docs

| Pattern | File |
|---------|------|
| Icon Patterns | `typescript/references/universal/expo/13-icon-patterns.md` |
| Bottom Sheet Sizing | `typescript/references/universal/expo/14-bottom-sheet-dynamic-sizing.md` |
| Custom UI Components | `typescript/references/universal/expo/15-custom-ui-components.md` |
| Native Modules | `~/.claude/examples/mobile-patterns/10-native-modules.md` |
| Route Groups & Tabs | `~/.claude/examples/mobile-patterns/09-route-groups-tabs.md` |

---

## Checklist

- [ ] Auth guard using overlay pattern (not conditional navigator)
- [ ] `_layout.tsx` in every route group under `(tabs)`
- [ ] Safe Icon wrapper (not raw Iconify)
- [ ] Bottom sheets using conditional rendering (not horizontal slider)
