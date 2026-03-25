'use client'

import type { CSSProperties } from 'react'

export interface ScanlinesProps {
  /** Line spacing in pixels (default: 4) */
  spacing?: number
  /** Line opacity 0-1 (default: 0.18) */
  opacity?: number
  /** Line color (default: 'rgba(0,0,0,1)') */
  color?: string
  /** Z-index (default: 9998) */
  zIndex?: number
  /** CSS class */
  className?: string
}

/**
 * Full-page scanline overlay for CRT/monitor aesthetic.
 *
 * Repeating 1px horizontal lines at configurable spacing.
 * Applied as a fixed overlay — render once in your layout.
 * pointer-events: none ensures no interaction blocking.
 */
export function Scanlines({
  spacing = 4,
  opacity = 0.18,
  color = 'rgba(0,0,0,1)',
  zIndex = 9998,
  className,
}: ScanlinesProps) {
  const style: CSSProperties = {
    position: 'fixed',
    inset: 0,
    pointerEvents: 'none',
    zIndex,
    background: `repeating-linear-gradient(
      to bottom,
      transparent 0px,
      transparent ${spacing - 1}px,
      ${color.replace(/[\d.]+\)$/, `${opacity})`)} ${spacing - 1}px,
      ${color.replace(/[\d.]+\)$/, `${opacity})`)} ${spacing}px
    )`,
  }

  return <div className={className} style={style} aria-hidden="true" />
}
