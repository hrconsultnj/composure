---
name: shadcn/ui v4 Patterns
source: context7
queried_at: 2026-03-24
library_version: 4.1
context7_library_id: /websites/ui_shadcn
---

# shadcn/ui v4

## CLI

### Init

```bash
# Init with framework template
npx shadcn@latest init -t vite        # Vite
npx shadcn@latest init -t next        # Next.js
npx shadcn@latest init -t react-router # React Router
npx shadcn@latest init -t astro       # Astro
npx shadcn@latest init -t tanstack-start # TanStack Start

# Monorepo structure
npx shadcn@latest init --monorepo

# Pick primitives (radix or base-ui)
npx shadcn@latest init --base radix
npx shadcn@latest init --base base-ui
```

Interactive init prompts:

```txt
Which style would you like to use? › Default
Which color would you like to use as base color? › Slate
Where is your global CSS file? › app/globals.css
Do you want to use CSS variables for colors? › no / yes
Where is your tailwind.config.js located? › tailwind.config.js
Configure the import alias for components: › @/components
Configure the import alias for utils: › @/lib/utils
Are you using React Server Components? › no / yes
```

### Add Components

```bash
npx shadcn@latest add button card dialog
```

### Build Registry

```bash
# Default: reads registry.json, outputs to ./public/r
npx shadcn@latest build

# Custom output path
npx shadcn@latest build --output ./public/registry

# Custom registry.json path
npx shadcn@latest build ./path/to/registry.json
```

```
Usage: shadcn build [options] [registry]

build components for a shadcn registry

Arguments:
  registry             path to registry.json file (default: "./registry.json")

Options:
  -o, --output <path>  destination directory for json files (default: "./public/r")
  -c, --cwd <cwd>      the working directory. defaults to the current directory.
  -h, --help           display help for command
```

### CLI v4 Flags Summary

| Flag | Purpose |
|---|---|
| `--template`, `-t` | Scaffold full project (next, vite, react-router, astro, tanstack-start, laravel) |
| `--monorepo` | Monorepo setup during init |
| `--base` | Pick primitives: `radix` or `base-ui` |

## Theming

### CSS Imports & Base Setup

All v4 projects start with this CSS structure:

```css
@import "tailwindcss";
@import "tw-animate-css";
@import "shadcn/tailwind.css";

@custom-variant dark (&:is(.dark *));
```

### Base Layer

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

## CSS Variables

All color tokens use `oklch()`. Hex and rgba are NOT used.

### Architecture: Two-Layer Variable System

shadcn v4 uses a two-layer variable system:

1. **Semantic variables** (`:root` / `.dark`) define colors with oklch values
2. **`@theme inline`** maps them to Tailwind color utilities via `var()` references

```css
/* Layer 1: @theme inline maps to Tailwind utilities */
@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-primary: var(--primary);
  --color-primary-foreground: var(--primary-foreground);
  --color-secondary: var(--secondary);
  --color-secondary-foreground: var(--secondary-foreground);
  --color-muted: var(--muted);
  --color-muted-foreground: var(--muted-foreground);
  --color-accent: var(--accent);
  --color-accent-foreground: var(--accent-foreground);
  --color-destructive: var(--destructive);
  --color-destructive-foreground: var(--destructive-foreground);
  --color-border: var(--border);
  --color-input: var(--input);
  --color-ring: var(--ring);
  --color-chart-1: var(--chart-1);
  --color-chart-2: var(--chart-2);
  --color-chart-3: var(--chart-3);
  --color-chart-4: var(--chart-4);
  --color-chart-5: var(--chart-5);
  --color-sidebar: var(--sidebar);
  --color-sidebar-foreground: var(--sidebar-foreground);
  --color-sidebar-primary: var(--sidebar-primary);
  --color-sidebar-primary-foreground: var(--sidebar-primary-foreground);
  --color-sidebar-accent: var(--sidebar-accent);
  --color-sidebar-accent-foreground: var(--sidebar-accent-foreground);
  --color-sidebar-border: var(--sidebar-border);
  --color-sidebar-ring: var(--sidebar-ring);
  --radius-sm: calc(var(--radius) * 0.6);
  --radius-md: calc(var(--radius) * 0.8);
  --radius-lg: var(--radius);
  --radius-xl: calc(var(--radius) * 1.4);
  --radius-2xl: calc(var(--radius) * 1.8);
  --radius-3xl: calc(var(--radius) * 2.2);
  --radius-4xl: calc(var(--radius) * 2.6);
}

/* Layer 2: :root defines actual oklch values */
:root {
  --radius: 0.625rem;
  --background: oklch(1 0 0);
  --foreground: oklch(0.145 0 0);
  --card: oklch(1 0 0);
  --card-foreground: oklch(0.145 0 0);
  --popover: oklch(1 0 0);
  --popover-foreground: oklch(0.145 0 0);
  --primary: oklch(0.205 0 0);
  --primary-foreground: oklch(0.985 0 0);
  --secondary: oklch(0.97 0 0);
  --secondary-foreground: oklch(0.205 0 0);
  --muted: oklch(0.97 0 0);
  --muted-foreground: oklch(0.556 0 0);
  --accent: oklch(0.97 0 0);
  --accent-foreground: oklch(0.205 0 0);
  --destructive: oklch(0.577 0.245 27.325);
  --border: oklch(0.922 0 0);
  --input: oklch(0.922 0 0);
  --ring: oklch(0.708 0 0);
  --chart-1: oklch(0.646 0.222 41.116);
  --chart-2: oklch(0.6 0.118 184.704);
  --chart-3: oklch(0.398 0.07 227.392);
  --chart-4: oklch(0.828 0.189 84.429);
  --chart-5: oklch(0.769 0.188 70.08);
  --sidebar: oklch(0.985 0 0);
  --sidebar-foreground: oklch(0.145 0 0);
  --sidebar-primary: oklch(0.205 0 0);
  --sidebar-primary-foreground: oklch(0.985 0 0);
  --sidebar-accent: oklch(0.97 0 0);
  --sidebar-accent-foreground: oklch(0.205 0 0);
  --sidebar-border: oklch(0.922 0 0);
  --sidebar-ring: oklch(0.708 0 0);
}
```

### Radius Tokens

Radius uses computed `calc()` tokens from a single `--radius` base:

```css
--radius: 0.625rem;
--radius-sm: calc(var(--radius) * 0.6);
--radius-md: calc(var(--radius) * 0.8);
--radius-lg: var(--radius);
--radius-xl: calc(var(--radius) * 1.4);
--radius-2xl: calc(var(--radius) * 1.8);
--radius-3xl: calc(var(--radius) * 2.2);
--radius-4xl: calc(var(--radius) * 2.6);
```

## Dark Mode

### CSS Variables (`.dark` class)

```css
.dark {
  --background: oklch(0.145 0 0);
  --foreground: oklch(0.985 0 0);
  --card: oklch(0.205 0 0);
  --card-foreground: oklch(0.985 0 0);
  --popover: oklch(0.205 0 0);
  --popover-foreground: oklch(0.985 0 0);
  --primary: oklch(0.922 0 0);
  --primary-foreground: oklch(0.205 0 0);
  --secondary: oklch(0.269 0 0);
  --secondary-foreground: oklch(0.985 0 0);
  --muted: oklch(0.269 0 0);
  --muted-foreground: oklch(0.708 0 0);
  --accent: oklch(0.269 0 0);
  --accent-foreground: oklch(0.985 0 0);
  --destructive: oklch(0.704 0.191 22.216);
  --border: oklch(1 0 0 / 10%);
  --input: oklch(1 0 0 / 15%);
  --ring: oklch(0.556 0 0);
  --chart-1: oklch(0.488 0.243 264.376);
  --chart-2: oklch(0.696 0.17 162.48);
  --chart-3: oklch(0.769 0.188 70.08);
  --chart-4: oklch(0.627 0.265 303.9);
  --chart-5: oklch(0.645 0.246 16.439);
  --sidebar: oklch(0.205 0 0);
  --sidebar-foreground: oklch(0.985 0 0);
  --sidebar-primary: oklch(0.488 0.243 264.376);
  --sidebar-primary-foreground: oklch(0.985 0 0);
  --sidebar-accent: oklch(0.269 0 0);
  --sidebar-accent-foreground: oklch(0.985 0 0);
  --sidebar-border: oklch(1 0 0 / 10%);
  --sidebar-ring: oklch(0.556 0 0);
}
```

### Custom Variant Declaration

```css
@custom-variant dark (&:is(.dark *));
```

### Mode Toggle Component (Next.js)

```tsx
"use client"

import * as React from "react"
import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export function ModeToggle() {
  const { setTheme } = useTheme()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon">
          <Sun className="h-[1.2rem] w-[1.2rem] scale-100 rotate-0 transition-all dark:scale-0 dark:-rotate-90" />
          <Moon className="absolute h-[1.2rem] w-[1.2rem] scale-0 rotate-90 transition-all dark:scale-100 dark:rotate-0" />
          <span className="sr-only">Toggle theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => setTheme("light")}>Light</DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("dark")}>Dark</DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("system")}>System</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
```

## Registry

### Registry Item Types

| Type | Purpose |
|---|---|
| `registry:ui` | UI component (button, dialog, etc.) |
| `registry:block` | Composite block (login form, dashboard, etc.) |
| `registry:theme` | Theme definition (cssVars for light/dark) |
| `registry:base` | Base configuration (style, icon library, dependencies, css) |
| `registry:component` | Component file within a block |
| `registry:page` | Page file within a block (has `target` for output path) |

### Custom Theme (registry:theme)

```json
{
  "$schema": "https://ui.shadcn.com/schema/registry-item.json",
  "name": "custom-theme",
  "type": "registry:theme",
  "cssVars": {
    "light": {
      "background": "oklch(1 0 0)",
      "foreground": "oklch(0.141 0.005 285.823)",
      "primary": "oklch(0.546 0.245 262.881)",
      "primary-foreground": "oklch(0.97 0.014 254.604)",
      "ring": "oklch(0.746 0.16 232.661)",
      "sidebar-primary": "oklch(0.546 0.245 262.881)",
      "sidebar-primary-foreground": "oklch(0.97 0.014 254.604)",
      "sidebar-ring": "oklch(0.746 0.16 232.661)"
    },
    "dark": {
      "background": "oklch(1 0 0)",
      "foreground": "oklch(0.141 0.005 285.823)",
      "primary": "oklch(0.707 0.165 254.624)",
      "primary-foreground": "oklch(0.97 0.014 254.604)",
      "ring": "oklch(0.707 0.165 254.624)",
      "sidebar-primary": "oklch(0.707 0.165 254.624)",
      "sidebar-primary-foreground": "oklch(0.97 0.014 254.604)",
      "sidebar-ring": "oklch(0.707 0.165 254.624)"
    }
  }
}
```

### UI Component with CSS Variables (registry:ui)

```json
{
  "$schema": "https://ui.shadcn.com/schema/registry-item.json",
  "name": "sidebar",
  "type": "registry:ui",
  "dependencies": ["radix-ui"],
  "registryDependencies": ["button", "separator", "sheet", "tooltip"],
  "files": [
    {
      "path": "ui/sidebar.tsx",
      "content": "...",
      "type": "registry:ui"
    }
  ],
  "cssVars": {
    "light": {
      "sidebar-background": "oklch(0.985 0 0)",
      "sidebar-foreground": "oklch(0.141 0.005 285.823)",
      "sidebar-border": "oklch(0.92 0.004 286.32)"
    },
    "dark": {
      "sidebar-background": "oklch(0.141 0.005 285.823)",
      "sidebar-foreground": "oklch(0.985 0 0)",
      "sidebar-border": "oklch(0.274 0.006 286.033)"
    }
  }
}
```

### Block with Page Target (registry:block)

```json
{
  "$schema": "https://ui.shadcn.com/schema/registry-item.json",
  "name": "login-01",
  "type": "registry:block",
  "description": "A simple login form.",
  "registryDependencies": ["button", "card", "input", "label"],
  "files": [
    {
      "path": "blocks/login-01/page.tsx",
      "content": "import { LoginForm } ...",
      "type": "registry:page",
      "target": "app/login/page.tsx"
    },
    {
      "path": "blocks/login-01/components/login-form.tsx",
      "content": "...",
      "type": "registry:component"
    }
  ]
}
```

### Base Configuration (registry:base)

```json
{
  "$schema": "https://ui.shadcn.com/schema/registry-item.json",
  "name": "custom-base",
  "type": "registry:base",
  "config": {
    "style": "custom-base",
    "iconLibrary": "lucide",
    "tailwind": {
      "baseColor": "neutral"
    }
  },
  "dependencies": [
    "class-variance-authority",
    "tw-animate-css",
    "lucide-react"
  ],
  "registryDependencies": ["utils", "font-inter"],
  "cssVars": {
    "light": {
      "background": "oklch(1 0 0)",
      "foreground": "oklch(0.141 0.005 285.823)",
      "primary": "oklch(0.21 0.006 285.885)",
      "primary-foreground": "oklch(0.985 0 0)"
    },
    "dark": {
      "background": "oklch(0.141 0.005 285.823)",
      "foreground": "oklch(0.985 0 0)",
      "primary": "oklch(0.985 0 0)",
      "primary-foreground": "oklch(0.21 0.006 285.885)"
    }
  },
  "css": {
    "@import \"tw-animate-css\"": {},
    "@layer base": {
      "*": {
        "@apply border-border outline-ring/50": {}
      },
      "body": {
        "@apply bg-background text-foreground": {}
      }
    }
  }
}
```

### Custom Colors via Registry Items

Registry items can define custom CSS variables that the CLI auto-injects into the project CSS:

```json
{
  "cssVars": {
    "light": {
      "brand-background": "oklch(0.205 0.015 18)",
      "brand-accent": "oklch(0.205 0.015 18)"
    },
    "dark": {
      "brand-background": "oklch(0.205 0.015 18)",
      "brand-accent": "oklch(0.205 0.015 18)"
    }
  }
}
```

These become available as Tailwind utilities: `bg-brand-background`, `text-brand-accent`, etc.

### Namespaced Registries

Configure in `components.json`:

```json
{
  "registries": {
    "@v0": "https://v0.dev/chat/b/{name}",
    "@acme": "https://registry.acme.com/resources/{name}.json",
    "@lib": "https://lib.company.com/utilities/{name}",
    "@ai": "https://ai-resources.com/r/{name}.json"
  }
}
```

#### Authenticated Registry

```json
{
  "registries": {
    "@internal": {
      "url": "https://registry.company.com/{name}",
      "headers": {
        "Authorization": "Bearer ${REGISTRY_TOKEN}"
      }
    }
  }
}
```

#### Install from Namespaced Registry

```bash
npx shadcn@latest add @acme/my-component
```

## Key Differences from v0/v1

- Colors are `oklch()`, not `hsl()` or hex
- Two-layer system: `:root` defines oklch values, `@theme inline` maps to Tailwind utilities
- `@custom-variant dark (&:is(.dark *))` replaces Tailwind v3 dark mode config
- Radius uses computed `calc()` multipliers from a single `--radius` base
- Sidebar gets its own 8-variable color set (including `--sidebar-ring`)
- CLI v4 supports `--template`, `--base`, `--monorepo` flags
- `--base` flag: choose between Radix and Base UI primitives
- Custom registries for distributing component libraries with namespace support
- `npx shadcn build` generates registry JSON from `registry.json`
