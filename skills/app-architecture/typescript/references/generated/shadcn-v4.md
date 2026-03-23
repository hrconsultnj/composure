---
name: shadcn/ui v4 Patterns
source: context7
queried_at: 2026-03-23
library_version: "4.x"
context7_library_id: /websites/ui_shadcn
---

# shadcn/ui v4

## Init (Vite)

```bash
npx shadcn@latest init -t vite
```

`components.json` uses style `base-nova` or `radix-nova` (not `new-york` or `default`).

## Base CSS Structure

```css
@import "tailwindcss";
@import "tw-animate-css";
@import "shadcn/tailwind.css";

@custom-variant dark (&:is(.dark *));
```

## Base Layer

```css
@layer base {
  * {
    @apply border-border outline-ring/50;
  }
  body {
    @apply bg-background text-foreground;
  }
}
```

## CSS Variables — oklch() Format

All color tokens use `oklch()`. Hex and rgba are NOT used.

### Light Mode

```css
@theme inline {
  --color-background: oklch(1 0 0);
  --color-foreground: oklch(0.141 0.005 285.823);
  --color-card: oklch(1 0 0);
  --color-card-foreground: oklch(0.141 0.005 285.823);
  --color-popover: oklch(1 0 0);
  --color-popover-foreground: oklch(0.141 0.005 285.823);
  --color-primary: oklch(0.21 0.006 285.885);
  --color-primary-foreground: oklch(0.985 0.002 285.823);
  --color-secondary: oklch(0.967 0.001 286.375);
  --color-secondary-foreground: oklch(0.21 0.006 285.885);
  --color-muted: oklch(0.967 0.001 286.375);
  --color-muted-foreground: oklch(0.552 0.016 285.938);
  --color-accent: oklch(0.967 0.001 286.375);
  --color-accent-foreground: oklch(0.21 0.006 285.885);
  --color-destructive: oklch(0.577 0.245 27.325);
  --color-destructive-foreground: oklch(0.577 0.245 27.325);
  --color-border: oklch(0.92 0.004 286.32);
  --color-input: oklch(0.92 0.004 286.32);
  --color-ring: oklch(0.871 0.006 286.286);
  --color-chart-1: oklch(0.646 0.222 41.116);
  --color-chart-2: oklch(0.6 0.118 184.714);
  --color-chart-3: oklch(0.398 0.07 227.392);
  --color-chart-4: oklch(0.828 0.189 84.429);
  --color-chart-5: oklch(0.769 0.188 70.08);
  --color-sidebar-background: oklch(0.985 0.002 285.823);
  --color-sidebar-foreground: oklch(0.141 0.005 285.823);
  --color-sidebar-primary: oklch(0.21 0.006 285.885);
  --color-sidebar-primary-foreground: oklch(0.985 0.002 285.823);
  --color-sidebar-accent: oklch(0.967 0.001 286.375);
  --color-sidebar-accent-foreground: oklch(0.21 0.006 285.885);
  --color-sidebar-border: oklch(0.92 0.004 286.32);
  --radius: 0.625rem;
  --radius-sm: calc(var(--radius) - 4px);
  --radius-md: calc(var(--radius) - 2px);
  --radius-lg: var(--radius);
  --radius-xl: calc(var(--radius) + 4px);
  --radius-2xl: calc(var(--radius) + 8px);
  --radius-3xl: calc(var(--radius) + 12px);
  --radius-4xl: calc(var(--radius) + 16px);
}
```

### Dark Mode

```css
.dark {
  --color-background: oklch(0.141 0.005 285.823);
  --color-foreground: oklch(0.985 0.002 285.823);
  --color-card: oklch(0.141 0.005 285.823);
  --color-card-foreground: oklch(0.985 0.002 285.823);
  --color-popover: oklch(0.141 0.005 285.823);
  --color-popover-foreground: oklch(0.985 0.002 285.823);
  --color-primary: oklch(0.985 0.002 285.823);
  --color-primary-foreground: oklch(0.21 0.006 285.885);
  --color-secondary: oklch(0.274 0.006 286.033);
  --color-secondary-foreground: oklch(0.985 0.002 285.823);
  --color-muted: oklch(0.274 0.006 286.033);
  --color-muted-foreground: oklch(0.705 0.015 286.067);
  --color-accent: oklch(0.274 0.006 286.033);
  --color-accent-foreground: oklch(0.985 0.002 285.823);
  --color-destructive: oklch(0.396 0.141 25.723);
  --color-destructive-foreground: oklch(0.985 0.002 285.823);
  --color-border: oklch(0.274 0.006 286.033);
  --color-input: oklch(0.274 0.006 286.033);
  --color-ring: oklch(0.442 0.017 285.786);
  --color-chart-1: oklch(0.488 0.243 264.376);
  --color-chart-2: oklch(0.696 0.17 162.48);
  --color-chart-3: oklch(0.769 0.188 70.08);
  --color-chart-4: oklch(0.627 0.265 303.9);
  --color-chart-5: oklch(0.645 0.246 16.439);
  --color-sidebar-background: oklch(0.176 0.005 285.823);
  --color-sidebar-foreground: oklch(0.985 0.002 285.823);
  --color-sidebar-primary: oklch(0.488 0.243 264.376);
  --color-sidebar-primary-foreground: oklch(0.985 0.002 285.823);
  --color-sidebar-accent: oklch(0.274 0.006 286.033);
  --color-sidebar-accent-foreground: oklch(0.985 0.002 285.823);
  --color-sidebar-border: oklch(0.274 0.006 286.033);
}
```

## Key Differences from v0/v1

- Colors are oklch, not hsl or hex
- `@theme inline { }` replaces CSS `:root` blocks for Tailwind 4
- Styles are `base-nova` / `radix-nova`, not `new-york` / `default`
- Radius uses computed calc() tokens from a single `--radius` base
- Sidebar gets its own 7-variable color set
