# Interaction Templates

Copy-paste micro-interaction patterns for premium web experiences. Every template supports `prefers-reduced-motion`, auto-disables or adapts on touch/coarse pointer devices, and uses only GPU-accelerated properties (transform, opacity).

## Catalog

| Template | Purpose | Dependencies | Complexity | Perf Impact |
|---|---|---|---|---|
| `magnetic-button` | Button that pulls toward cursor on hover | motion | Medium | Minimal (spring physics) |
| `tilt-card` | 3D perspective tilt following mouse position | None | Low | Minimal (CSS transforms) |
| `ripple-effect` | Material-style ripple on click | None | Low | Minimal (CSS animation) |
| `text-scramble` | Characters scramble then resolve on hover | None | Low | Minimal (setInterval) |
| `cursor-spotlight` | Radial gradient follows cursor over container | None | Low | Minimal (CSS custom props) |
| `elastic-scroll` | Overscroll elastic bounce on scrollable areas | None | Medium | Minimal (wheel events) |
| `hover-underline` | Underline slides in left, out right on hover | None | Low | None (pure CSS) |

## Complexity Ratings

- **Low** — Under 40 lines of logic, single event listener, pure CSS or simple state
- **Medium** — Multiple event listeners, animation frames, or spring physics
- **High** — Canvas rendering, WebGL, or complex state machines

## Performance Impact Ratings

- **None** — Pure CSS, zero JS at runtime
- **Minimal** — Lightweight JS, no layout thrashing, GPU-accelerated only
- **Moderate** — requestAnimationFrame loop or frequent DOM reads (none in this set)

## Accessibility

All templates follow these rules:

1. **`prefers-reduced-motion: reduce`** — Animations disable or simplify to instant transitions
2. **Coarse pointer detection** — Touch devices get native behavior or no-op
3. **Keyboard support** — Focus/activation triggers work without a mouse
4. **Screen readers** — Decorative elements use `aria-hidden="true"`; scrambled text uses `aria-label`

## Usage

These are template files, not an installable package. Copy the component you need into your project and adjust styling to match your design system.

```tsx
// Example: drop into a Next.js project
import { MagneticButton } from '@/components/interactions/magnetic-button'

<MagneticButton className="px-6 py-3 rounded-full bg-white text-black font-medium">
  Get Started
</MagneticButton>
```

## GPU-Only Properties

Every animation in this collection uses only compositor-friendly properties:

- `transform` (translate, scale, rotate)
- `opacity`
- CSS custom properties (for spotlight positioning)

No `width`, `height`, `top`, `left`, `margin`, or `padding` animations — these trigger layout recalculation and cause jank.
