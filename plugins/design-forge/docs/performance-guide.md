# Performance Guide

Practical techniques for keeping Design Forge components fast. Target: Lighthouse > 90, 60fps animations, < 3s TTI on 3G.

## The Three Rules

1. **Visibility gate everything** -- off-screen canvas should not run
2. **Cap DPR at 2x** -- 3x/4x screens render 4-9x more pixels for no visible benefit
3. **Use closures, not React state** -- 60fps means 60 potential re-renders per second

## Visibility Gating

`useCanvas` uses IntersectionObserver internally. When the canvas scrolls out of view, the RAF loop pauses automatically. This is the single most impactful optimization for pages with multiple canvas elements.

If you write custom animation hooks, replicate this:

```typescript
import { useVisibility } from 'design-forge/components/visualizations/canvas'

function MyAnimation() {
  const { ref, isVisible } = useVisibility()

  useEffect(() => {
    if (!isVisible) return
    // Start animation loop only when visible
    const id = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(id)
  }, [isVisible])

  return <div ref={ref}>...</div>
}
```

## DPR Cap

High-DPI devices (3x on phones, 4x on some tablets) multiply rendering cost. Design Forge caps at 2x, which is visually indistinguishable from higher ratios for canvas content:

```typescript
const dpr = Math.min(window.devicePixelRatio, 2)
canvas.width = containerWidth * dpr
canvas.height = containerHeight * dpr
ctx.scale(dpr, dpr)
```

This is built into `useCanvas`. If creating your own canvas, apply the same cap.

## Closure State vs React State

**Bad** -- triggers re-render every frame:

```typescript
const [particles, setParticles] = useState(initParticles())

function draw(ctx) {
  setParticles(prev => updatePositions(prev)) // 60 re-renders/sec
}
```

**Good** -- closure state, no re-renders:

```typescript
function createParticles(): DrawFunction {
  const particles = initParticles() // Lives in closure

  return ({ ctx }) => {
    updatePositions(particles) // Mutate directly, no React
    renderParticles(ctx, particles)
  }
}
```

Similarly, pointer tracking uses `useRef` instead of `useState`:

```typescript
// useCanvas tracks pointer in a ref, not state
const pointer = useRef({ x: 0, y: 0, active: false })
```

## Memoize Draw Functions

Draw functions should be created once. Use `useMemo` when creating in a component:

```typescript
// Good -- created once
const draw = useMemo(() => createGridField({ columns: 20 }), [])

// Bad -- new function every render
const draw = createGridField({ columns: 20 })
```

## HoverCardCanvas Performance

When rendering many cards (6+), set `animateOnHover={true}` so only the hovered card runs its animation loop:

```typescript
<HoverCardCanvas
  draw={draw}
  animateOnHover  // Only animates when pointer is over the card
  idleOpacity={0.15}
/>
```

## Lazy Loading Heavy Dependencies

### 3D (Three.js / R3F)

Three.js adds ~150KB+ to your bundle. Always lazy-load:

```typescript
import { Suspense, lazy } from 'react'

const Scene3D = lazy(() => import('./Scene3D'))

function Hero() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <Scene3D />
    </Suspense>
  )
}
```

### Sound Layer

`useSoundLayer` lazy-creates Audio elements on first user gesture. No audio is loaded until `enable()` is called. This is by design -- never preload audio.

### GSAP

If using GSAP only for scroll sections, dynamic import it:

```typescript
useEffect(() => {
  import('gsap').then(({ gsap }) => {
    import('gsap/ScrollTrigger').then(({ ScrollTrigger }) => {
      gsap.registerPlugin(ScrollTrigger)
      // Set up your scroll animations
    })
  })
}, [])
```

## Code Splitting by Route

In Next.js App Router, each route segment is automatically code-split. Structure heavy visual pages as separate routes:

```
app/
  page.tsx          # Lightweight landing
  showcase/
    page.tsx        # Heavy 3D + canvas (loaded only when navigated to)
```

## GPU-Friendly Properties

For CSS/Framer Motion animations, stick to properties that don't trigger layout:

| Fast (GPU) | Slow (CPU) |
|------------|------------|
| `transform` | `width`, `height` |
| `opacity` | `top`, `left` |
| `filter` | `margin`, `padding` |
| `clip-path` | `border-radius` (animated) |

Framer Motion uses `transform` by default for `x`, `y`, `scale`, `rotate`.

## Lighthouse Checklist

Before shipping a page with Design Forge components:

- [ ] Canvas elements have visibility gating (automatic with `GenerativeCanvas`)
- [ ] Draw functions are memoized with `useMemo`
- [ ] DPR is capped at 2 (automatic with `useCanvas`)
- [ ] 3D content is behind `Suspense` with a lightweight fallback
- [ ] Sound is opt-in, not auto-playing
- [ ] Images use `next/image` with proper `width`/`height`/`priority`
- [ ] Framer Motion `viewport={{ once: true }}` on scroll reveals (animate once, not every scroll)
- [ ] No layout shifts from canvas mounting (set explicit `width`/`height` on containers)
- [ ] `prefers-reduced-motion` renders static content (no animation CPU cost)
- [ ] Bundle analyzer confirms no unnecessary full-library imports

## Measuring

```bash
# Lighthouse CLI
npx lighthouse http://localhost:3000 --view

# Bundle analysis (Next.js)
ANALYZE=true next build

# Canvas frame rate
# Open DevTools > Performance > Record while scrolling
# Look for long frames (>16ms) in the flame chart
```
