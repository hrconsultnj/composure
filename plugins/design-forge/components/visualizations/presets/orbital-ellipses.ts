import type { CanvasContext, DrawFunction } from '../canvas/types'

export interface OrbitalEllipsesOptions {
  /** Number of orbital rings (default: 5) */
  count?: number
  /** Base radius in pixels (default: 80) */
  baseRadius?: number
  /** Ring color (default: 'rgba(125, 229, 141, 0.4)') */
  color?: string
  /** Orbital speed multiplier (default: 1) */
  speed?: number
  /** Eccentricity of ellipses 0-1 (default: 0.6) */
  eccentricity?: number
}

/**
 * Orbital ellipse animation with drift.
 *
 * Concentric ellipses at different rotational speeds and tilts,
 * creating a gyroscope-like visualization. Each ring has a marker
 * dot traveling along its path.
 */
export function createOrbitalEllipses(
  options: OrbitalEllipsesOptions = {}
): DrawFunction {
  const {
    count = 5,
    baseRadius = 80,
    color = 'rgba(125, 229, 141, 0.4)',
    speed = 1,
    eccentricity = 0.6,
  } = options

  return ({ ctx, width, height, time, signal }: CanvasContext) => {
    const cx = width / 2
    const cy = height / 2
    const t = time * 0.001 * speed

    ctx.strokeStyle = color
    ctx.lineWidth = 1

    for (let i = 0; i < count; i++) {
      const radius = baseRadius + i * (baseRadius * 0.4)
      const rotation = t * (0.2 + i * 0.15) + i * (Math.PI / count)
      const drift = Math.sin(t * 0.3 + i * 0.7) * 10 * signal

      ctx.save()
      ctx.translate(cx + drift, cy + drift * 0.5)
      ctx.rotate(rotation)

      // Ellipse ring
      ctx.beginPath()
      ctx.ellipse(0, 0, radius, radius * eccentricity, 0, 0, Math.PI * 2)
      ctx.stroke()

      // Orbiting marker dot
      const angle = t * (0.5 + i * 0.3)
      const mx = Math.cos(angle) * radius
      const my = Math.sin(angle) * radius * eccentricity

      ctx.fillStyle = color.replace(/[\d.]+\)$/, '0.8)')
      ctx.beginPath()
      ctx.arc(mx, my, 2.5, 0, Math.PI * 2)
      ctx.fill()

      ctx.restore()
    }

    // Center dot
    ctx.fillStyle = color
    ctx.beginPath()
    ctx.arc(cx, cy, 3, 0, Math.PI * 2)
    ctx.fill()
  }
}
