---
name: Tailwind CSS 4 Patterns
source: context7
queried_at: 2026-03-24
library_version: "4.2"
context7_library_id: /websites/tailwindcss
---

# Tailwind CSS 4

## Setup

### Import Structure

Single import replaces the old three-layer system:

```css
/* Old (v3): */
@tailwind base;
@tailwind components;
@tailwind utilities;

/* New (v4): */
@import "tailwindcss";
```

Content detection is automatic — no `content` array needed.

### Vite Plugin

Use the dedicated Vite plugin (recommended over PostCSS):

```typescript
import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [tailwindcss()],
});
```

### PostCSS (non-Vite projects)

In v4, `postcss-import` and `autoprefixer` are handled automatically. Use the new package name:

```javascript
// postcss.config.mjs
export default {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};
```

### Prefix Support

```css
@import "tailwindcss" prefix(tw);

@theme {
  --font-display: "Satoshi", "sans-serif";
  /* Generated CSS vars include prefix: --tw-font-display */
}
```

---

## @theme

The `@theme` directive defines design tokens as CSS custom properties. Tailwind maps them to utility classes automatically.

### @theme (standard)

Generates `@property` fallback rules for each token. Use when you need full browser compatibility:

```css
@theme {
  --color-midnight: #121063;
  --color-tahiti: #3ab7bf;
  --color-bermuda: #78dcca;
  --font-display: "Satoshi", "sans-serif";
  --breakpoint-3xl: 120rem;
  --ease-fluid: cubic-bezier(0.3, 0, 0, 1);
  --ease-snappy: cubic-bezier(0.2, 0, 0, 1);
}
```

These become utilities automatically: `bg-midnight`, `font-display`, `ease-fluid`, `3xl:hidden`.

### @theme inline

The `inline` keyword prevents Tailwind from generating fallback `@property` rules, keeping the output smaller. Use when your tokens are already defined as CSS variables (e.g., by shadcn/ui):

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

### oklch Color Palette

Default theme colors use `oklch()`. Example from `tailwindcss/theme.css`:

```css
@theme {
  --color-red-50: oklch(0.971 0.013 17.38);
  --color-red-100: oklch(0.936 0.032 17.717);
  --color-red-200: oklch(0.885 0.062 18.334);
  --color-red-300: oklch(0.808 0.114 19.571);
  --color-red-400: oklch(0.704 0.191 22.216);
  --color-red-500: oklch(0.637 0.237 25.331);
  /* ... */

  --shadow-2xs: 0 1px rgb(0 0 0 / 0.05);
  --shadow-xs: 0 1px 2px 0 rgb(0 0 0 / 0.05);
  --shadow-sm: 0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1);
}
```

### Ring Default Behavior

v4 changed ring defaults. To preserve v3 behavior:

```css
@theme {
  --default-ring-width: 3px;
  --default-ring-color: var(--color-blue-500);
}
```

---

## Dark Mode

### @custom-variant

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

### Custom Variants

Define any selector-based variant:

```css
@custom-variant theme-midnight (&:where([data-theme="midnight"] *));
```

Usage: `theme-midnight:bg-blue-900`

---

## @utility Directive

Register custom utilities that support Tailwind's variant system (hover, responsive, etc.):

```css
@utility tab-4 {
  tab-size: 4;
}
```

Usage: `hover:tab-4`, `md:tab-4`

---

## @reference Directive

Import theme variables into scoped style blocks (Vue/Svelte) without duplicating CSS in the final bundle:

```vue
<template>
  <h1>Hello world!</h1>
</template>

<style>
  @reference "tailwindcss";
  h1 {
    @apply text-2xl font-bold text-red-500;
  }
</style>
```

Or reference your project's CSS file:

```vue
<style>
  @reference "../../app.css";
  h1 {
    @apply text-2xl font-bold text-red-500;
  }
</style>
```

---

## @source Directive

### Safelisting with Variants

Generate classes with specific variant combinations:

```css
@import "tailwindcss";
@source inline("{hover:,focus:,}underline");
```

---

## Using CSS Variables Directly

```tsx
{/* Via theme mapping (preferred — generates utilities) */}
<div className="bg-brand" />

{/* Via arbitrary value (for one-off vars) */}
<div className="bg-[var(--my-color)]" />
```

### theme() Function in CSS

Use CSS variables instead of `theme()` where possible. When `theme()` is needed (e.g., media queries), use the CSS variable name:

```css
/* Preferred: use CSS variables directly */
.my-class {
  background-color: var(--color-red-500);
}

/* When theme() is required (media queries): use -- notation, not dots */
@media (width >= theme(--breakpoint-xl)) {
  /* ... */
}
```

---

## Plugins as CSS

Tailwind 4 plugins import directly as CSS:

```css
@import "tailwindcss";
@import "tw-animate-css";
```

---

## Migration Checklist

### Automated Upgrade Tool

```bash
npx @tailwindcss/upgrade
```

Requires Node.js 20+. Run in a new branch and review changes.

### Manual Steps

1. Remove `tailwind.config.js`
2. Replace `@tailwind` directives with `@import "tailwindcss"`
3. Move theme extensions into `@theme inline { }` using CSS variables
4. Replace `darkMode: "class"` with `@custom-variant dark (&:is(.dark *))`
5. Remove `content` array — detection is automatic
6. Update color values to oklch format (recommended, not required)
7. Switch from PostCSS plugin to `@tailwindcss/vite` (for Vite projects)
8. Remove `postcss-import` and `autoprefixer` from PostCSS config (handled automatically)
9. Replace `theme()` dot notation with `theme(--variable-name)` or `var(--variable-name)`
10. Review renamed shadow utilities (`shadow-sm` -> `shadow-xs`, old `shadow` -> `shadow-2xs`)
