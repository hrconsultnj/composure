/**
 * Gradient Mesh Preset
 *
 * PURPOSE: Animated multi-point gradient that shifts smoothly — abstract background fill.
 * VISUAL: Overlapping radial gradients with wandering centers, creating a soft color mesh.
 * POINTER: The cursor attracts the nearest gradient blob, warping the mesh locally.
 */

import type { CanvasContext, DrawFunction } from '@forge/visualizations/canvas/types'

interface GradientMeshOptions {
  /** Number of gradient blobs (default: 5) */
  blobs?: number
  /** Color palette — RGBA strings (default: blues/purples) */
  colors?: string[]
  /** Blob movement speed (default: 1) */
  speed?: number
  /** Blob radius relative to canvas diagonal (default: 0.4) */
  radiusScale?: number
}

interface Blob {
  /** Orbit phase offsets for x and y */
  px: number; py: number
  /** Orbit speed multipliers */
  sx: number; sy: number
  color: string
}

export function createGradientMesh(options: GradientMeshOptions = {}): DrawFunction {
  const {
    blobs = 5,
    colors = [
      'rgba(74, 120, 255, 0.25)',
      'rgba(130, 80, 255, 0.20)',
      'rgba(50, 180, 220, 0.20)',
      'rgba(100, 60, 200, 0.18)',
      'rgba(60, 140, 255, 0.22)',
    ],
    speed = 1,
    radiusScale = 0.4,
  } = options

  // Seed blob orbits with random phases and speeds
  const blobData: Blob[] = Array.from({ length: blobs }, (_, i) => ({
    px: Math.random() * Math.PI * 2,
    py: Math.random() * Math.PI * 2,
    sx: (0.3 + Math.random() * 0.5) * (i % 2 === 0 ? 1 : -1),
    sy: (0.2 + Math.random() * 0.4) * (i % 2 === 0 ? -1 : 1),
    color: colors[i % colors.length],
  }))

  return ({ ctx, width, height, time, pointer, signal }: CanvasContext) => {
    const t = time * 0.0003 * speed
    const diag = Math.sqrt(width * width + height * height)
    const radius = diag * radiusScale * signal

    // Composite blending for smooth color mixing
    ctx.globalCompositeOperation = 'lighter'

    for (const b of blobData) {
      // Orbital position — each blob wanders in a Lissajous path
      let cx = width * (0.3 + 0.4 * Math.sin(t * b.sx + b.px))
      let cy = height * (0.3 + 0.4 * Math.cos(t * b.sy + b.py))

      // Pointer attraction: nudge blob center toward cursor
      if (pointer.active) {
        const px = pointer.x * width
        const py = pointer.y * height
        const dx = px - cx
        const dy = py - cy
        const d = Math.sqrt(dx * dx + dy * dy)
        const pull = Math.exp(-d / (diag * 0.3)) * 0.35
        cx += dx * pull
        cy += dy * pull
      }

      const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius)
      grad.addColorStop(0, b.color)
      grad.addColorStop(1, 'transparent')
      ctx.fillStyle = grad
      ctx.fillRect(0, 0, width, height)
    }

    // Reset composite operation for next frame
    ctx.globalCompositeOperation = 'source-over'
  }
}
