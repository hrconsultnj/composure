/**
 * Custom Preset Starter Template
 *
 * PURPOSE: Minimal factory function skeleton — copy this to create your own preset.
 * VISUAL: Empty canvas with a single pulsing dot to prove the wiring works.
 * POINTER: Dot follows the cursor when active.
 *
 * HOW TO USE:
 *   1. Copy this file into components/visualizations/presets/
 *   2. Rename the factory function and options interface
 *   3. Replace the draw body with your own rendering logic
 *   4. Export from presets/index.ts
 *   5. Pass to <GenerativeCanvas draw={createMyPreset()} />
 */

import type { CanvasContext, DrawFunction } from '@forge/visualizations/canvas/types'

// -- Step 1: Define your options interface ----------------------------------
interface MyPresetOptions {
  /** Primary color for the visualization */
  color?: string
  /** Animation speed multiplier (default: 1) */
  speed?: number
  /** Base radius in pixels */
  radius?: number
}

// -- Step 2: Write your factory function -----------------------------------
export function createMyPreset(options: MyPresetOptions = {}): DrawFunction {
  const {
    color = 'rgba(74, 120, 255, 0.6)',
    speed = 1,
    radius = 8,
  } = options

  // -- Step 3: Declare closure state here ----------------------------------
  // Any mutable data (particles, arrays, phase offsets) lives in the closure.
  // This state persists across frames but is isolated per factory call.
  // Example: const particles: Particle[] = []

  // -- Step 4: Return the draw function ------------------------------------
  // This runs every animation frame. GenerativeCanvas handles:
  //   - Visibility gating (pauses RAF when off-screen)
  //   - DPR scaling (width/height are CSS pixels, canvas is sharp)
  //   - Auto-clearing (each frame starts clean unless you disable it)
  //   - Reduced motion (renders one frame then stops)
  return ({ ctx, width, height, time, pointer, signal }: CanvasContext) => {
    // `signal` is the shared breathing value (~1.0 +/- 0.09).
    // Multiply sizes, speeds, or positions by it for organic motion.
    const breathe = radius * signal

    // `pointer` gives normalized 0-1 coords + an active flag.
    const cx = pointer.active ? pointer.x * width : width / 2
    const cy = pointer.active ? pointer.y * height : height / 2

    // `time` is ms since animation start — use for periodic motion.
    const pulse = Math.sin(time * 0.003 * speed) * 0.5 + 0.5
    const r = breathe + pulse * radius * 0.5

    // Draw a pulsing dot at the pointer (or center)
    ctx.fillStyle = color
    ctx.beginPath()
    ctx.arc(cx, cy, r, 0, Math.PI * 2)
    ctx.fill()

    // Glow ring
    ctx.strokeStyle = color.replace(/[\d.]+\)$/, '0.2)')
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.arc(cx, cy, r * 2.5, 0, Math.PI * 2)
    ctx.stroke()
  }
}
