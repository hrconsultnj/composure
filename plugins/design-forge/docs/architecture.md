# Architecture Guide

How Design Forge is organized and how its systems work together.

## Plugin Structure

```
design-forge/
├── components/
│   ├── visualizations/
│   │   ├── canvas/          # Core canvas system
│   │   │   ├── GenerativeCanvas.tsx   # Drop-in component
│   │   │   ├── use-canvas.ts          # RAF loop, DPR, visibility, pointer
│   │   │   ├── types.ts              # DrawFunction, CanvasContext, PointerState
│   │   │   ├── signal-noise.ts       # Shared sine wave + math utilities
│   │   │   ├── use-visibility.ts     # IntersectionObserver hook
│   │   │   ├── use-pointer.ts        # Normalized pointer tracking
│   │   │   └── use-reduced-motion.ts # prefers-reduced-motion hook
│   │   └── presets/         # Factory functions for canvas visualizations
│   │       ├── grid-field.ts
│   │       ├── orbital-ellipses.ts
│   │       ├── point-cloud.ts
│   │       └── particle-system.ts
│   ├── ui/                  # Interactive UI components
│   ├── effects/             # Visual overlays (scanlines, typewriter)
│   └── scenes/              # Full-screen containers (HeroScene)
├── skills/                  # Skill definitions + 7 reference guides
├── hooks/                   # Plugin lifecycle hooks
└── examples/                # Full page implementations
```

## Canvas System

The canvas system is the foundation of Design Forge. It uses a **factory pattern** where visualizations are pure functions, not React components.

### Pipeline

```
Factory Function ──> DrawFunction ──> GenerativeCanvas ──> Screen
(createGridField)    (closure)        (RAF loop)
```

### DrawFunction

Every visualization is a `DrawFunction` -- a function that receives a `CanvasContext` and draws one frame:

```typescript
type DrawFunction = (context: CanvasContext) => void

interface CanvasContext {
  ctx: CanvasRenderingContext2D  // The 2D rendering context
  width: number                  // Canvas width (CSS pixels)
  height: number                 // Canvas height (CSS pixels)
  dpr: number                    // Device pixel ratio (capped at 2)
  time: number                   // Elapsed ms since start
  delta: number                  // Ms since last frame
  pointer: PointerState          // Normalized pointer { x, y, active }
  signal: number                 // Shared sine wave (~1.0 +/- 0.09)
}
```

### Factory Pattern

Presets are factory functions that return a `DrawFunction`. Internal state lives in **closures**, not React state -- this avoids re-renders at 60fps:

```typescript
function createGridField(options?: GridFieldOptions): DrawFunction {
  const { columns = 24, amplitude = 30 } = options ?? {}

  // State lives here, in the closure -- not in useState
  // This is critical for 60fps performance

  return ({ ctx, width, height, time, pointer, signal }) => {
    // Draw one frame using closure state + context
  }
}
```

**Why closures instead of React state?** React state changes trigger re-renders. At 60fps, that's 60 re-renders per second. Closures update silently in the animation frame without touching React.

### Signal Noise

All visualizations share a compound sine wave (`getSignalNoise`) that creates unified "breathing" across the page:

```typescript
function getSignalNoise(time: number): number {
  return (
    1 +
    Math.sin(time * 0.00021) * 0.045 +
    Math.sin(time * 0.00057 + 1.6) * 0.028 +
    Math.cos(time * 0.00011 + 0.8) * 0.018
  )
}
// Returns ~1.0, oscillating +/- 0.09
```

Three sine waves at incommensurate frequencies produce organic, non-repeating motion. The `useCanvas` hook computes this per frame and passes it as `context.signal`.

### useCanvas Hook

The core hook manages the entire lifecycle:

1. **DPR scaling** -- scales canvas to device pixel ratio (capped at 2x)
2. **Visibility gating** -- IntersectionObserver pauses RAF when off-screen
3. **Pointer tracking** -- normalized coordinates via `useRef` (no re-renders)
4. **Reduced motion** -- renders one static frame, then stops
5. **RAF loop** -- calls `draw()` each frame with the full `CanvasContext`

### Creating Custom Draw Functions

Write your own `DrawFunction` without a factory:

```typescript
const myDraw: DrawFunction = ({ ctx, width, height, time, signal }) => {
  const radius = 50 * signal
  ctx.fillStyle = '#4a78ff'
  ctx.beginPath()
  ctx.arc(width / 2, height / 2, radius, 0, Math.PI * 2)
  ctx.fill()
}

<GenerativeCanvas draw={myDraw} />
```

Or write a factory for configurable reuse:

```typescript
function createPulse(options?: { color?: string; size?: number }): DrawFunction {
  const { color = '#4a78ff', size = 50 } = options ?? {}

  return ({ ctx, width, height, time, signal }) => {
    ctx.fillStyle = color
    ctx.beginPath()
    ctx.arc(width / 2, height / 2, size * signal, 0, Math.PI * 2)
    ctx.fill()
  }
}
```

## UI Components

UI components are standard React components (`'use client'`). Key patterns:

- **`forwardRef`** on `GlassPanel` for external ref access
- **Inline styles** for zero-dependency portability (no Tailwind required)
- **CSS variables** (`var(--font-mono, monospace)`) for theme integration
- **`aria-hidden="true"`** on all decorative elements
- **Auto-disable** on touch devices (CustomCursor checks `pointer: coarse`)

## Effects

Lightweight overlays that render once and don't animate:

- **Scanlines** -- `repeating-linear-gradient` with `position: fixed`
- **Typewriter** -- character-cycling with `setTimeout`, reduced motion shows static text

## Scenes

Full-screen containers that provide layout + chrome:

- **HeroScene** -- mounts children after hydration (`useEffect` guard), optional telemetry HUD overlay

## Design Tokens

The default aesthetic ("control room"):

| Token | Value |
|-------|-------|
| Background | `#070809` |
| Text | `#e8e4dd` (cream) |
| Accent blue | `#4a78ff` |
| Accent green | `#7de58d` |
| Accent orange | `#ff9447` |
| Border | `rgba(255,255,255,0.08)` |
| Border radius | `0` (sharp corners) |
| Font mono | `var(--font-mono, monospace)` |
| Labels | uppercase, 0.08-0.12em letter-spacing |
| Glass blur | `28px` with `saturate(120%)` |
| Scanlines | 4px spacing, 18% opacity |

These are defaults -- every component accepts props to override them.
