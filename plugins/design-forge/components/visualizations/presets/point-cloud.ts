import type { CanvasContext, DrawFunction } from '../canvas/types'

export interface PointCloudOptions {
  /** Number of points (default: 200) */
  count?: number
  /** Dot colors (default: blue/green/orange palette) */
  colors?: string[]
  /** Min dot radius (default: 1) */
  minRadius?: number
  /** Max dot radius (default: 3) */
  maxRadius?: number
  /** Rotation speed (default: 0.0003) */
  rotationSpeed?: number
  /** Spread as fraction of canvas min dimension (default: 0.4) */
  spread?: number
}

interface Point {
  angle: number
  radius: number
  color: string
  size: number
  speed: number
  phase: number
}

/**
 * Scattered colored dots with angular rotation.
 *
 * Points drift in orbits at varying speeds, creating a nebula-like cloud.
 * Pointer attracts nearby points for interactive feel.
 */
export function createPointCloud(
  options: PointCloudOptions = {}
): DrawFunction {
  const {
    count = 200,
    colors = [
      'rgba(74, 120, 255, 0.7)',
      'rgba(125, 229, 141, 0.7)',
      'rgba(255, 148, 71, 0.7)',
    ],
    minRadius = 1,
    maxRadius = 3,
    rotationSpeed = 0.0003,
    spread = 0.4,
  } = options

  // Points generated once — state lives in closure
  const points: Point[] = Array.from({ length: count }, () => ({
    angle: Math.random() * Math.PI * 2,
    radius: Math.random(),
    color: colors[Math.floor(Math.random() * colors.length)],
    size: minRadius + Math.random() * (maxRadius - minRadius),
    speed: 0.5 + Math.random() * 1.5,
    phase: Math.random() * Math.PI * 2,
  }))

  return ({ ctx, width, height, time, pointer, signal }: CanvasContext) => {
    const cx = width / 2
    const cy = height / 2
    const maxR = Math.min(width, height) * spread

    for (const pt of points) {
      const currentAngle = pt.angle + time * rotationSpeed * pt.speed
      const breathe = 1 + Math.sin(time * 0.001 + pt.phase) * 0.1 * signal
      const r = pt.radius * maxR * breathe

      let x = cx + Math.cos(currentAngle) * r
      let y = cy + Math.sin(currentAngle) * r

      // Pointer attraction
      if (pointer.active) {
        const px = pointer.x * width
        const py = pointer.y * height
        const dx = px - x
        const dy = py - y
        const d = Math.sqrt(dx * dx + dy * dy)
        if (d > 0.1) {
          const pull = Math.exp(-d / 100) * 20
          x += (dx / d) * pull
          y += (dy / d) * pull
        }
      }

      ctx.fillStyle = pt.color
      ctx.globalAlpha = 0.4 + pt.radius * 0.6
      ctx.beginPath()
      ctx.arc(x, y, pt.size * signal, 0, Math.PI * 2)
      ctx.fill()
    }

    ctx.globalAlpha = 1
  }
}
