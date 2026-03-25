# shadcn/ui — Enforced Conventions & Known Gotchas

> Claude MUST follow these patterns when writing shadcn/ui code.

## CLI Quick Reference

```bash
# Non-interactive init (ALWAYS use -d for agent/CI)
npx shadcn@latest init -d

# Add components
npx shadcn@latest add button dialog card
npx shadcn@latest add --all

# View source before installing
npx shadcn@latest view button

# Get docs + code examples for any component
npx shadcn@latest docs button

# Project diagnostics
npx shadcn@latest info

# Migrate to unified radix-ui package
npx shadcn@latest migrate radix
```

## Known Gotchas

### Geist Font Circular Reference (Tailwind v4)
`shadcn init` rewrites `globals.css` and may introduce `--font-sans: var(--font-sans)` — a circular self-reference. Tailwind v4's `@theme inline` resolves at parse time, not runtime.

**Fix**: Use literal font names in `@theme inline`:
```css
/* CORRECT */
--font-sans: "Geist", "Geist Fallback", ui-sans-serif, system-ui, sans-serif;
--font-mono: "Geist Mono", "Geist Mono Fallback", ui-monospace, monospace;

/* WRONG — circular */
--font-sans: var(--font-sans);
--font-sans: var(--font-geist-sans);
```

Move font variable classNames to `<html>`, not `<body>`:
```tsx
<html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
  <body className="antialiased">
```

### Avatar Has No `size` Prop
```tsx
// ❌ No size variant exists
<Avatar size="lg" />

// ✅ Use Tailwind classes
<Avatar className="h-12 w-12">
  <AvatarImage src={user.image} />
  <AvatarFallback>JD</AvatarFallback>
</Avatar>
```

Most shadcn components use Tailwind classes for sizing, not variant props.

### Unified Radix Package (2026)
```tsx
// OLD — individual packages
import * as DialogPrimitive from "@radix-ui/react-dialog"

// NEW — unified package
import { Dialog as DialogPrimitive } from "radix-ui"
```

Migrate: `npx shadcn@latest migrate radix`

## Composition Recipes

| Use Case | Pattern |
|----------|---------|
| Settings page | `Tabs` + `Card` per group + `Separator` + save action |
| Data dashboard | Summary `Card`s + filter bar + `Table` |
| Entity detail | Header + status `Badge` + main `Card` + side `Card` |
| Search-heavy | `Command` for quick find, `Popover` for pickers, `Sheet` for mobile |
| Auth/onboarding | Centered `Card` + social `Separator` + inline `Alert` for errors |
| Destructive flows | `AlertDialog` (NOT `Dialog`) for confirmation |
| Mobile nav | `Sheet` + `Button` + `Separator` |
| Empty/loading/error | `Card` + `Skeleton` + `Alert` |

## Design Direction

- **Dark mode default** for dashboards, AI apps, internal tools
- **Geist Sans** for interface text, **Geist Mono** for code/metrics/IDs/timestamps
- **zinc/neutral/slate** base palette, one accent color via `--color-primary`
- **Consistent radius** — `--radius: 0.625rem` baseline
- **One density system per page** — comfortable (`gap-6`/`p-6`) or compact (`gap-4`/`p-4`)
- **Icons** — Lucide at `h-4 w-4` or `h-5 w-5`, quiet and consistent

## Anti-Patterns (Enforced)

- ❌ Raw `button`/`input`/`select`/`div` when shadcn primitives exist
- ❌ Repeated `div rounded-xl border p-6` instead of `Card`/`Table`/`Sheet`
- ❌ Multiple accent colors competing
- ❌ Nested cards inside cards inside cards
- ❌ `Dialog` for destructive confirmation — use `AlertDialog`
- ❌ Empty/loading/error states without design treatment
- ❌ Ad-hoc Tailwind palette instead of theme tokens (`bg-background`, `text-foreground`)
