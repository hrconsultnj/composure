import type { CanvasContext, DrawFunction } from '../canvas/types'
import { lerp } from '../canvas/signal-noise'

export interface GridFieldOptions {
  /** Number of columns (default: 24) */
  columns?: number
  /** Number of rows (default: 16) */
  rows?: number
  /** Sine wave amplitude in pixels (default: 30) */
  amplitude?: number
  /** Grid line color (default: 'rgba(74, 120, 255, 0.3)') */
  color?: string
  /** Dot color at intersections (default: 'rgba(74, 120, 255, 0.6)') */
  dotColor?: string
  /** Whether pointer influences deformation (default: true) */
  pointerInfluence?: boolean
  /** Perspective vanishing factor 0-1 (default: 0.3) */
  vanishY?: number
}

/**
 * Perspective grid with sine-wave deformation.
 *
 * Creates a wireframe grid that warps with a compound sine wave,
 * with optional pointer-following distortion. Inspired by
 * wyehuongyan.com's grid field visualization.
 */
export function createGridField(options: GridFieldOptions = {}): DrawFunction {
  const {
    columns = 24,
    rows = 16,
    amplitude = 30,
    color = 'rgba(74, 120, 255, 0.3)',
    dotColor = 'rgba(74, 120, 255, 0.6)',
    pointerInfluence = true,
    vanishY = 0.3,
  } = options

  return ({ ctx, width, height, time, pointer, signal }: CanvasContext) => {
    const cellW = width / columns
    const cellH = height / rows

    // Compute grid positions with deformation
    const points: Array<Array<{ x: number; y: number }>> = []

    for (let row = 0; row <= rows; row++) {
      points[row] = []
      for (let col = 0; col <= columns; col++) {
        const baseX = col * cellW
        const baseY = row * cellH

        // Perspective compression toward center
        const perspT = row / rows
        const perspX = lerp(baseX, width / 2, perspT * vanishY)

        // Sine wave deformation
        const wave =
          Math.sin(col * 0.3 + time * 0.001) * amplitude * signal +
          Math.cos(row * 0.4 + time * 0.0007) * amplitude * 0.5 * signal

        // Pointer repulsion
        let pointerWarp = 0
        if (pointerInfluence && pointer.active) {
          const dx = col / columns - pointer.x
          const dy = row / rows - pointer.y
          const d = Math.sqrt(dx * dx + dy * dy)
          pointerWarp = Math.exp(-d * 4) * amplitude * 1.5
        }

        points[row][col] = {
          x: perspX + wave * 0.3,
          y: baseY + wave + pointerWarp,
        }
      }
    }

    ctx.strokeStyle = color
    ctx.lineWidth = 0.5

    // Horizontal lines
    for (let row = 0; row <= rows; row++) {
      ctx.beginPath()
      for (let col = 0; col <= columns; col++) {
        const p = points[row][col]
        col === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)
      }
      ctx.stroke()
    }

    // Vertical lines
    for (let col = 0; col <= columns; col++) {
      ctx.beginPath()
      for (let row = 0; row <= rows; row++) {
        const p = points[row][col]
        row === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)
      }
      ctx.stroke()
    }

    // Intersection dots (every other)
    ctx.fillStyle = dotColor
    for (let row = 0; row <= rows; row += 2) {
      for (let col = 0; col <= columns; col += 2) {
        const p = points[row][col]
        ctx.beginPath()
        ctx.arc(p.x, p.y, 1.5, 0, Math.PI * 2)
        ctx.fill()
      }
    }
  }
}
