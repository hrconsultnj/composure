# Canvas Visualization System — Deep Dive

## Architecture

The canvas system is modeled after wyehuongyan.com, which runs **13+ independent canvas visualizations** from a single shared `setupCanvas()` abstraction. The React equivalent uses a `useCanvas` hook.

### Data Flow

```
useCanvas hook
  ├── ResizeObserver → DPR-scaled canvas dimensions
  ├── IntersectionObserver → isVisible (start/stop RAF)
  ├── pointer tracking → normalized {x, y, active} ref
  ├── useReducedMotion → single frame vs. loop
  └── requestAnimationFrame loop
       └── calls draw(CanvasContext) each frame
            ├── ctx (2D rendering context)
            ├── width, height (CSS pixels)
            ├── time, delta (ms)
            ├── pointer (normalized 0-1)
            └── signal (compound sine noise)
```

### Why Refs Instead of State

The pointer position uses `useRef` instead of `useState` because:
- Pointer moves fire at 60+ Hz
- useState would trigger 60+ re-renders per second
- The RAF loop reads the ref imperatively — no React render needed
- This is the standard pattern for high-frequency input in canvas/game loops

### Why Factory Functions

Each visualization preset is a factory:

```typescript
function createGridField(options?: GridFieldOptions): DrawFunction {
  // State lives in closure — particles, positions, etc.
  const points: Point[] = []

  return (context: CanvasContext) => {
    // Access closure state + context
  }
}
```

Benefits:
- Internal state (particle arrays, phase offsets) isolated per instance
- No React state management for animation data
- Multiple instances of the same viz get independent state
- Draw function is a pure interface — hot-swappable

### Signal Noise Function

Three layered sine waves at incommensurate frequencies:

```typescript
1 + sin(t * 0.00021) * 0.045
  + sin(t * 0.00057 + 1.6) * 0.028
  + cos(t * 0.00011 + 0.8) * 0.018
```

This produces:
- Non-repeating pattern (frequencies are irrational ratios)
- Centered around 1.0 (multiplier, not offset)
- ±0.09 range — subtle enough to feel organic, not jerky
- Same value across ALL visualizations per frame = unified "breathing"

### Performance Budget

For a page with N canvas visualizations:
- Only visible canvases run RAF loops (IntersectionObserver)
- DPR capped at 2x (4x pixels at 2x is already a lot)
- Each draw function should target < 2ms per frame
- Use `fps` option to cap at 30fps for complex scenes
- `prefers-reduced-motion` renders exactly one frame, then stops

## Writing Custom Draw Functions

### Template

```typescript
import type { CanvasContext, DrawFunction } from '../canvas/types'

interface MyVizOptions {
  color?: string
  speed?: number
}

export function createMyViz(options: MyVizOptions = {}): DrawFunction {
  const { color = 'rgba(74, 120, 255, 0.5)', speed = 1 } = options

  // One-time setup (runs once per factory call)
  const internalState: number[] = []

  return ({ ctx, width, height, time, pointer, signal }: CanvasContext) => {
    // Per-frame rendering
    // Use `signal` for organic motion
    // Use `pointer` for interactivity
    // Use `time` and `delta` for animation
  }
}
```

### Common Drawing Recipes

**Radial gradient glow:**
```typescript
const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius)
grad.addColorStop(0, 'rgba(74, 120, 255, 0.3)')
grad.addColorStop(1, 'transparent')
ctx.fillStyle = grad
ctx.fillRect(0, 0, width, height)
```

**Connecting lines between points:**
```typescript
for (let i = 0; i < points.length; i++) {
  for (let j = i + 1; j < points.length; j++) {
    const d = dist(points[i].x, points[i].y, points[j].x, points[j].y)
    if (d < maxDist) {
      ctx.globalAlpha = 1 - d / maxDist
      ctx.beginPath()
      ctx.moveTo(points[i].x, points[i].y)
      ctx.lineTo(points[j].x, points[j].y)
      ctx.stroke()
    }
  }
}
```

**Pointer-following deformation:**
```typescript
if (pointer.active) {
  const dx = pointer.x * width - x
  const dy = pointer.y * height - y
  const d = Math.sqrt(dx * dx + dy * dy)
  const influence = Math.exp(-d / falloff) * strength
  x += dx * influence
  y += dy * influence
}
```
