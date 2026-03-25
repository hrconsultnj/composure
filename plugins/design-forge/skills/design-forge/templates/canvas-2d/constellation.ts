/**
 * Constellation Preset
 *
 * PURPOSE: Slowly drifting nodes connected by proximity lines — star map aesthetic.
 * VISUAL: Dots float with gentle drift; lines appear between nearby nodes, fading with distance.
 * POINTER: Nodes within range of the cursor connect to it, forming a local cluster.
 */
import type { CanvasContext, DrawFunction } from '@forge/visualizations/canvas/types'
import { dist } from '@forge/visualizations/canvas/signal-noise'

interface ConstellationOptions {
  /** Number of nodes (default: 80) */
  count?: number
  /** Max connection distance in pixels (default: 120) */
  linkDistance?: number
  /** Node color (default: 'rgba(74, 120, 255, 0.7)') */
  color?: string
  /** Line color (default: 'rgba(74, 120, 255, 0.15)') */
  lineColor?: string
  /** Drift speed multiplier (default: 0.3) */
  speed?: number
}

interface Node { x: number; y: number; vx: number; vy: number; r: number }

export function createConstellation(options: ConstellationOptions = {}): DrawFunction {
  const {
    count = 80, linkDistance = 120, speed = 0.3,
    color = 'rgba(74, 120, 255, 0.7)',
    lineColor = 'rgba(74, 120, 255, 0.15)',
  } = options

  let nodes: Node[] = []
  let prevW = 0
  let prevH = 0

  function seed(w: number, h: number) {
    nodes = Array.from({ length: count }, () => ({
      x: Math.random() * w, y: Math.random() * h,
      vx: (Math.random() - 0.5) * speed, vy: (Math.random() - 0.5) * speed,
      r: 1 + Math.random() * 1.5,
    }))
  }

  return ({ ctx, width, height, pointer, signal }: CanvasContext) => {
    if (width !== prevW || height !== prevH) {
      seed(width, height); prevW = width; prevH = height
    }

    // Update positions with wrap-around
    for (const n of nodes) {
      n.x += n.vx * signal; n.y += n.vy * signal
      if (n.x < 0) n.x += width; if (n.x > width) n.x -= width
      if (n.y < 0) n.y += height; if (n.y > height) n.y -= height
    }

    // Draw node-to-node connections
    ctx.strokeStyle = lineColor
    ctx.lineWidth = 0.5
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const d = dist(nodes[i].x, nodes[i].y, nodes[j].x, nodes[j].y)
        if (d < linkDistance) {
          ctx.globalAlpha = 1 - d / linkDistance
          ctx.beginPath()
          ctx.moveTo(nodes[i].x, nodes[i].y)
          ctx.lineTo(nodes[j].x, nodes[j].y)
          ctx.stroke()
        }
      }
    }

    // Draw pointer connections
    if (pointer.active) {
      const px = pointer.x * width, py = pointer.y * height
      const maxD = linkDistance * 1.5
      ctx.strokeStyle = color
      for (const n of nodes) {
        const d = dist(n.x, n.y, px, py)
        if (d < maxD) {
          ctx.globalAlpha = 1 - d / maxD
          ctx.beginPath()
          ctx.moveTo(n.x, n.y); ctx.lineTo(px, py)
          ctx.stroke()
        }
      }
    }

    // Draw nodes
    ctx.globalAlpha = 1
    ctx.fillStyle = color
    for (const n of nodes) {
      ctx.beginPath()
      ctx.arc(n.x, n.y, n.r * signal, 0, Math.PI * 2)
      ctx.fill()
    }
  }
}
