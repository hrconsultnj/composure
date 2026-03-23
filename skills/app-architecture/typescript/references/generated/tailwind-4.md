---
name: Tailwind CSS 4 Patterns
source: context7
queried_at: 2026-03-23
library_version: "4.x"
context7_library_id: n/a
---

# Tailwind CSS 4

## No More Config File

`tailwind.config.js` is gone. All configuration lives in CSS.

### Before (Tailwind 3)

```js
// tailwind.config.js
module.exports = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: "#6366f1",
      },
    },
  },
  darkMode: "class",
};
```

### After (Tailwind 4)

```css
/* app.css */
@import "tailwindcss";

@custom-variant dark (&:is(.dark *));

@theme inline {
  --color-brand: oklch(0.585 0.233 277.117);
}
```

## Import Structure

Single import replaces the old three-layer system:

```css
/* Old: @tailwind base; @tailwind components; @tailwind utilities; */
/* New: */
@import "tailwindcss";
```

Content detection is automatic — no `content` array needed.

## @theme inline { }

The `@theme inline` block defines design tokens as CSS custom properties that Tailwind maps to utility classes automatically:

```css
@theme inline {
  /* Colors become bg-brand, text-brand, border-brand, etc. */
  --color-brand: oklch(0.585 0.233 277.117);
  --color-brand-light: oklch(0.75 0.15 277.117);

  /* Spacing becomes p-18, m-18, gap-18, etc. */
  --spacing-18: 4.5rem;

  /* Font families become font-display */
  --font-display: "Inter", sans-serif;

  /* Radius tokens */
  --radius: 0.625rem;
  --radius-sm: calc(var(--radius) - 4px);
  --radius-lg: var(--radius);
}
```

The `inline` keyword prevents Tailwind from generating fallback `@property` rules, keeping the output smaller.

## Dark Mode

```css
@custom-variant dark (&:is(.dark *));
```

Usage in components is unchanged:

```tsx
<div className="bg-background dark:bg-background" />
```

With CSS variables mapped through `@theme inline`, dark mode swaps variable values:

```css
.dark {
  --color-background: oklch(0.141 0.005 285.823);
  --color-foreground: oklch(0.985 0.002 285.823);
}
```

## Using CSS Variables Directly

Reference any CSS variable in utility classes:

```tsx
{/* Via theme mapping (preferred — generates utilities) */}
<div className="bg-brand" />

{/* Via arbitrary value (for one-off vars) */}
<div className="bg-[var(--my-color)]" />

{/* Via theme() function in CSS */}
<style>
  .custom { background: theme(--color-brand); }
</style>
```

## Plugins as CSS

Tailwind 4 plugins are also CSS-first. Animation plugins import directly:

```css
@import "tailwindcss";
@import "tw-animate-css";
```

## Migration Checklist

1. Remove `tailwind.config.js`
2. Replace `@tailwind` directives with `@import "tailwindcss"`
3. Move theme extensions into `@theme inline { }` using CSS variables
4. Replace `darkMode: "class"` with `@custom-variant dark (&:is(.dark *))`
5. Remove `content` array — detection is automatic
6. Update color values to oklch format (recommended, not required)
