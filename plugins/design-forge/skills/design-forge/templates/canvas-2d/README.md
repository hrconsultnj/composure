# Canvas 2D Preset Templates

Templates for building custom `DrawFunction` factories that plug into the Design Forge canvas system.

## Quick Start

1. Copy `custom-preset-starter.ts` into your project's `components/visualizations/presets/` directory
2. Rename the factory function and options interface
3. Replace the draw body with your rendering logic
4. Export it and pass to `<GenerativeCanvas />`

```tsx
import { GenerativeCanvas } from 'design-forge/components/visualizations/canvas'
import { createWaveField } from './presets/wave-field'

const draw = createWaveField({ lines: 24, amplitude: 30 })

export function HeroBackground() {
  return (
    <GenerativeCanvas
      draw={draw}
      className="absolute inset-0 w-full h-full"
      clearColor="rgba(0, 0, 0, 1)"
      aria-label="Animated wave background"
    />
  )
}
```

## The Factory Pattern

Every preset is a **factory function** that returns a `DrawFunction`. This is the core pattern:

```typescript
import type { CanvasContext, DrawFunction } from '../canvas/types'

interface MyOptions {
  color?: string
  speed?: number
}

export function createMyViz(options: MyOptions = {}): DrawFunction {
  const { color = 'rgba(74, 120, 255, 0.5)', speed = 1 } = options

  // Closure state: persists across frames, isolated per instance
  const particles: { x: number; y: number }[] = []

  // The draw function: called every animation frame by useCanvas
  return ({ ctx, width, height, time, delta, pointer, signal }: CanvasContext) => {
    // Render one frame here
  }
}
```

### Why factories?

- **Isolated state** -- Each call to `createMyViz()` gets its own particle array, phase offsets, etc.
- **No React state** -- Animation data lives in closures, not `useState` (avoids 60fps re-renders)
- **Hot-swappable** -- The `DrawFunction` signature is uniform; swap presets without changing the component
- **Multiple instances** -- Two `<GenerativeCanvas draw={createMyViz()} />` elements get independent state

## CanvasContext Reference

Every draw function receives this context each frame:

| Field     | Type                        | Description                                    |
|-----------|-----------------------------|------------------------------------------------|
| `ctx`     | `CanvasRenderingContext2D`  | The 2D drawing context (already DPR-scaled)    |
| `width`   | `number`                    | Canvas width in CSS pixels                     |
| `height`  | `number`                    | Canvas height in CSS pixels                    |
| `dpr`     | `number`                    | Device pixel ratio (capped at 2)               |
| `time`    | `number`                    | Milliseconds since animation start             |
| `delta`   | `number`                    | Milliseconds since last frame                  |
| `pointer` | `{ x, y, active }`         | Normalized 0-1 cursor position over the canvas |
| `signal`  | `number`                    | Shared breathing value (~1.0, range +/-0.09)   |

## What GenerativeCanvas Handles for You

You do NOT need to manage these in your draw function:

- **Visibility gating** -- RAF loop pauses when the canvas scrolls off-screen (IntersectionObserver)
- **DPR scaling** -- Canvas is rendered at device resolution; `width`/`height` are CSS pixels
- **Auto-clearing** -- Each frame is cleared before your draw function runs (configurable)
- **Reduced motion** -- When `prefers-reduced-motion` is active, exactly one frame renders
- **Pointer tracking** -- Normalized coordinates are provided via `pointer`; no event listeners needed
- **Resize handling** -- ResizeObserver keeps the canvas sized to its container

## Using Signal Noise

The `signal` value is a compound sine wave shared across ALL visualizations on the page. It creates a unified "breathing" rhythm:

```typescript
// Multiply sizes or positions by signal for organic pulsing
const radius = baseRadius * signal

// Use getSignalNoiseCustom for per-element variation
import { getSignalNoiseCustom } from '../canvas/signal-noise'
const localSignal = getSignalNoiseCustom(time, 1.5, 0.8, i * 0.5)
```

## Using Pointer Interaction

The `pointer` object gives you normalized coordinates (0-1) and an `active` flag:

```typescript
if (pointer.active) {
  const px = pointer.x * width   // Convert to canvas pixels
  const py = pointer.y * height
  // Now use px, py for proximity checks, attraction, repulsion, etc.
}
```

Common patterns:
- **Attraction** -- Move elements toward the cursor
- **Repulsion** -- Push elements away from the cursor
- **Proximity glow** -- Brighten elements near the cursor
- **Disturbance** -- Amplify wave/noise near the cursor

## Included Templates

| Template                  | Description                                               |
|---------------------------|-----------------------------------------------------------|
| `custom-preset-starter`   | Minimal skeleton with annotated comments                  |
| `wave-field`              | Horizontal sine waves with pointer disturbance            |
| `flow-field`              | Particles following a sine-based vector field             |
| `constellation`           | Drifting nodes with proximity-based connections           |
| `gradient-mesh`           | Overlapping radial gradients on orbital paths             |
| `rain-drops`              | Matrix-style falling characters with pointer interaction  |

## Performance Guidelines

- Target **< 2ms per frame** in your draw function
- Use the `fps` prop on GenerativeCanvas to cap at 30fps for heavy scenes
- Avoid allocating objects inside the draw loop; reuse arrays from the closure
- For particle systems, use splice-from-end or pool recycling instead of filter
- The `delta` value may spike after tab refocus; cap it: `const dt = Math.min(delta, 32)`
- Use `autoClear={false}` for trail effects (flow-field, rain-drops) and handle fading yourself

## File Structure

When you create a preset for your project, place it alongside the existing presets:

```
components/visualizations/
  canvas/
    types.ts          <-- CanvasContext, DrawFunction types
    signal-noise.ts   <-- getSignalNoise, lerp, dist, etc.
  presets/
    grid-field.ts     <-- Existing preset (reference)
    particle-system.ts
    your-preset.ts    <-- Your new preset goes here
    index.ts          <-- Export it from here
```
