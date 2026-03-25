import type { CanvasContext, DrawFunction } from '../canvas/types'

export interface ParticleSystemOptions {
  /** Max particles alive at once (default: 150) */
  maxParticles?: number
  /** Particles emitted per frame (default: 2) */
  emitRate?: number
  /** Particle lifetime in ms (default: 3000) */
  lifetime?: number
  /** Particle color (default: 'rgba(74, 120, 255, 0.6)') */
  color?: string
  /** Emission origin (default: 'center') */
  origin?: 'center' | 'bottom' | 'pointer'
  /** Initial velocity spread (default: 1) */
  velocitySpread?: number
  /** Gravity in pixels/frame² (default: 0) */
  gravity?: number
}

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  life: number
  maxLife: number
  size: number
}

/**
 * Generic particle system with pluggable emission and physics.
 *
 * Particles spawn from a configurable origin, move with velocity
 * and optional gravity, and fade out over their lifetime.
 */
export function createParticleSystem(
  options: ParticleSystemOptions = {}
): DrawFunction {
  const {
    maxParticles = 150,
    emitRate = 2,
    lifetime = 3000,
    color = 'rgba(74, 120, 255, 0.6)',
    origin = 'center',
    velocitySpread = 1,
    gravity = 0,
  } = options

  const particles: Particle[] = []

  function emit(w: number, h: number, ptr: CanvasContext['pointer']) {
    let ox: number
    let oy: number

    switch (origin) {
      case 'bottom':
        ox = Math.random() * w
        oy = h
        break
      case 'pointer':
        ox = ptr.active ? ptr.x * w : w / 2
        oy = ptr.active ? ptr.y * h : h / 2
        break
      default:
        ox = w / 2
        oy = h / 2
    }

    for (let i = 0; i < emitRate && particles.length < maxParticles; i++) {
      const angle = Math.random() * Math.PI * 2
      const speed = (0.5 + Math.random() * 2) * velocitySpread

      particles.push({
        x: ox,
        y: oy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - (origin === 'bottom' ? 2 : 0),
        life: 0,
        maxLife: lifetime * (0.5 + Math.random() * 0.5),
        size: 1 + Math.random() * 2,
      })
    }
  }

  return ({ ctx, width, height, delta, pointer, signal }: CanvasContext) => {
    emit(width, height, pointer)

    // Cap delta to prevent explosion on tab refocus
    const dt = Math.min(delta, 32)

    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i]
      p.life += dt

      if (p.life > p.maxLife) {
        particles.splice(i, 1)
        continue
      }

      p.vy += gravity * (dt / 16)
      p.x += p.vx * signal * (dt / 16)
      p.y += p.vy * signal * (dt / 16)

      const alpha = 1 - p.life / p.maxLife
      ctx.fillStyle = color.replace(/[\d.]+\)$/, `${(alpha * 0.8).toFixed(2)})`)
      ctx.beginPath()
      ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2)
      ctx.fill()
    }
  }
}
