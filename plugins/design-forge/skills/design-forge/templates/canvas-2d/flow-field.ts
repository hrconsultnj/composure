/**
 * Flow Field Preset
 *
 * PURPOSE: Particles follow a vector field derived from layered sine waves (Perlin-like).
 * VISUAL: Streams of dots tracing smooth curves, revealing an invisible force field.
 * POINTER: The cursor injects a radial force that pushes particles outward.
 */
import type { CanvasContext, DrawFunction } from '@forge/visualizations/canvas/types'

interface FlowFieldOptions {
  /** Number of particles (default: 300) */
  count?: number
  /** Particle speed multiplier (default: 1.5) */
  speed?: number
  /** Field noise scale — lower = smoother (default: 0.004) */
  scale?: number
  /** Trail color (default: 'rgba(74, 120, 255, 0.5)') */
  color?: string
  /** Trail opacity fade per frame (default: 0.02) */
  trailFade?: number
}

interface Particle { x: number; y: number; age: number }

export function createFlowField(options: FlowFieldOptions = {}): DrawFunction {
  const {
    count = 300, speed = 1.5, scale = 0.004, trailFade = 0.02,
    color = 'rgba(74, 120, 255, 0.5)',
  } = options

  let particles: Particle[] = []
  let prevW = 0
  let prevH = 0

  // Cheap angle field from layered sines (avoids Perlin dependency)
  function fieldAngle(x: number, y: number, t: number): number {
    return (
      Math.sin(x * scale + t) + Math.sin(y * scale * 1.2 + t * 0.7) +
      Math.sin((x + y) * scale * 0.7 + t * 0.5)
    ) * Math.PI
  }

  return ({ ctx, width, height, time, pointer, signal }: CanvasContext) => {
    if (width !== prevW || height !== prevH) {
      particles = Array.from({ length: count }, () => ({
        x: Math.random() * width, y: Math.random() * height,
        age: Math.random() * 200,
      }))
      prevW = width; prevH = height
    }

    // Soft trail fade instead of hard clear (use with autoClear={false})
    ctx.fillStyle = `rgba(0, 0, 0, ${trailFade})`
    ctx.fillRect(0, 0, width, height)

    const t = time * 0.0005
    ctx.fillStyle = color

    for (const p of particles) {
      const angle = fieldAngle(p.x, p.y, t)
      let vx = Math.cos(angle) * speed * signal
      let vy = Math.sin(angle) * speed * signal

      // Pointer radial push
      if (pointer.active) {
        const dx = p.x - pointer.x * width, dy = p.y - pointer.y * height
        const d = Math.sqrt(dx * dx + dy * dy)
        if (d < 120 && d > 0) {
          const push = (1 - d / 120) * 3
          vx += (dx / d) * push; vy += (dy / d) * push
        }
      }

      p.x += vx; p.y += vy; p.age++

      // Recycle particles that leave bounds or get old
      if (p.x < 0 || p.x > width || p.y < 0 || p.y > height || p.age > 250) {
        p.x = Math.random() * width; p.y = Math.random() * height; p.age = 0
      }

      ctx.beginPath()
      ctx.arc(p.x, p.y, 1, 0, Math.PI * 2)
      ctx.fill()
    }
  }
}
