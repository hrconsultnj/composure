/**
 * Wave Field Preset
 *
 * PURPOSE: Horizontal sine waves stacked vertically, creating a rippling ocean-like field.
 * VISUAL: Parallel wave lines with varying amplitude and phase, gentle organic drift.
 * POINTER: Waves amplify near the cursor, creating a localized disturbance.
 */

import type { CanvasContext, DrawFunction } from '@forge/visualizations/canvas/types'

interface WaveFieldOptions {
  /** Number of horizontal wave lines (default: 18) */
  lines?: number
  /** Max wave amplitude in pixels (default: 24) */
  amplitude?: number
  /** Horizontal wave frequency (default: 0.02) */
  frequency?: number
  /** Wave line color (default: 'rgba(74, 120, 255, 0.35)') */
  color?: string
  /** Animation speed multiplier (default: 1) */
  speed?: number
}

export function createWaveField(options: WaveFieldOptions = {}): DrawFunction {
  const {
    lines = 18,
    amplitude = 24,
    frequency = 0.02,
    color = 'rgba(74, 120, 255, 0.35)',
    speed = 1,
  } = options

  // Per-line phase offsets for visual variety (set once per instance)
  const phaseOffsets = Array.from({ length: lines }, (_, i) => i * 0.7 + Math.random() * 0.3)

  return ({ ctx, width, height, time, pointer, signal }: CanvasContext) => {
    const t = time * 0.001 * speed
    const spacing = height / (lines + 1)
    const steps = Math.ceil(width / 4) // Sample every 4px for smooth curves

    ctx.strokeStyle = color
    ctx.lineWidth = 1

    for (let i = 0; i < lines; i++) {
      const baseY = spacing * (i + 1)
      const phase = phaseOffsets[i]
      // Each line gets slightly different amplitude via signal
      const lineAmp = amplitude * (0.6 + 0.4 * Math.sin(phase)) * signal

      ctx.beginPath()

      for (let s = 0; s <= steps; s++) {
        const x = (s / steps) * width
        const normX = x / width

        // Compound sine for richer shape
        let y = baseY
        y += Math.sin(normX * width * frequency + t * 1.3 + phase) * lineAmp
        y += Math.sin(normX * width * frequency * 2.3 + t * 0.7 + phase * 1.5) * lineAmp * 0.3

        // Pointer disturbance: amplify waves near cursor
        if (pointer.active) {
          const dx = normX - pointer.x
          const dy = (baseY / height) - pointer.y
          const d = Math.sqrt(dx * dx + dy * dy)
          const influence = Math.exp(-d * 5) * amplitude * 1.2
          y += Math.sin(normX * 12 + t * 3) * influence
        }

        s === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
      }

      ctx.stroke()
    }
  }
}
