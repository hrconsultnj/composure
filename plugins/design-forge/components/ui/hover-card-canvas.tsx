'use client'

import { type CSSProperties, type ReactNode, useRef, useState } from 'react'
import type { DrawFunction } from '../visualizations/canvas/types'
import { useCanvas } from '../visualizations/canvas/use-canvas'

export interface HoverCardCanvasProps {
  /** Draw function for the generative background */
  draw: DrawFunction
  /** Card content overlaid on the canvas */
  children: ReactNode
  /** CSS class for the outer container */
  className?: string
  /** Border color on hover (default: 'rgba(255,255,255,0.12)') */
  hoverBorderColor?: string
  /** Whether canvas animates only on hover (default: true) */
  animateOnHover?: boolean
  /** Background opacity when not hovered (default: 0.3) */
  idleOpacity?: number
  /** Background opacity on hover (default: 1) */
  hoverOpacity?: number
  /** Additional inline styles */
  style?: CSSProperties
}

/**
 * Interactive card with a per-card canvas visualization background.
 *
 * The canvas runs a draw function that responds to pointer position,
 * with content overlaid. Canvas can be set to animate only on hover
 * to save resources when many cards are on screen.
 */
export function HoverCardCanvas({
  draw,
  children,
  className,
  hoverBorderColor = 'rgba(255,255,255,0.12)',
  animateOnHover = true,
  idleOpacity = 0.3,
  hoverOpacity = 1,
  style,
}: HoverCardCanvasProps) {
  const [hovered, setHovered] = useState(false)
  const wrapperRef = useRef<HTMLDivElement>(null)

  const { canvasRef, containerRef } = useCanvas({
    draw,
    animate: animateOnHover ? hovered : true,
  })

  const containerStyle: CSSProperties = {
    position: 'relative',
    overflow: 'hidden',
    border: `1px solid ${hovered ? hoverBorderColor : 'rgba(255,255,255,0.04)'}`,
    transition: 'border-color 0.3s ease',
    ...style,
  }

  const canvasWrapperStyle: CSSProperties = {
    position: 'absolute',
    inset: 0,
    opacity: hovered ? hoverOpacity : idleOpacity,
    transition: 'opacity 0.4s ease',
    pointerEvents: 'none',
  }

  return (
    <div
      ref={wrapperRef}
      className={className}
      style={containerStyle}
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => setHovered(false)}
    >
      <div ref={containerRef} style={canvasWrapperStyle}>
        <canvas
          ref={canvasRef}
          style={{ display: 'block', width: '100%', height: '100%' }}
          aria-hidden="true"
        />
      </div>
      <div style={{ position: 'relative', zIndex: 1 }}>{children}</div>
    </div>
  )
}
