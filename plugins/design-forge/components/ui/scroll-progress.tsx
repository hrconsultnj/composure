'use client'

import { type CSSProperties, useEffect, useState } from 'react'

export interface ScrollProgressProps {
  /** Bar color (default: '#4a78ff') */
  color?: string
  /** Bar height in pixels (default: 2) */
  height?: number
  /** Whether to show a glowing dot at the leading edge (default: true) */
  showDot?: boolean
  /** Glow dot size in pixels (default: 6) */
  dotSize?: number
  /** Z-index (default: 9999) */
  zIndex?: number
  /** Position: 'top' or 'bottom' (default: 'top') */
  position?: 'top' | 'bottom'
  /** CSS class for the container */
  className?: string
}

/**
 * Scroll progress bar with optional glowing dot.
 *
 * Fixed to viewport edge, tracks scroll position as a filled bar
 * with an animated glow dot at the leading edge.
 */
export function ScrollProgress({
  color = '#4a78ff',
  height = 2,
  showDot = true,
  dotSize = 6,
  zIndex = 9999,
  position = 'top',
  className,
}: ScrollProgressProps) {
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    const update = () => {
      const scrollable =
        document.documentElement.scrollHeight - window.innerHeight
      setProgress(scrollable > 0 ? window.scrollY / scrollable : 0)
    }

    update()
    window.addEventListener('scroll', update, { passive: true })
    window.addEventListener('resize', update, { passive: true })
    return () => {
      window.removeEventListener('scroll', update)
      window.removeEventListener('resize', update)
    }
  }, [])

  const containerStyle: CSSProperties = {
    position: 'fixed',
    [position]: 0,
    left: 0,
    right: 0,
    height,
    zIndex,
    pointerEvents: 'none',
    background: 'transparent',
  }

  const barStyle: CSSProperties = {
    height: '100%',
    width: `${progress * 100}%`,
    background: color,
    transition: 'width 50ms linear',
    position: 'relative',
  }

  const dotStyle: CSSProperties = {
    position: 'absolute',
    right: -dotSize / 2,
    top: '50%',
    transform: 'translateY(-50%)',
    width: dotSize,
    height: dotSize,
    borderRadius: '50%',
    background: color,
    boxShadow: `0 0 ${dotSize * 2}px ${color}, 0 0 ${dotSize * 4}px ${color}`,
  }

  return (
    <div className={className} style={containerStyle} aria-hidden="true">
      <div style={barStyle}>
        {showDot && progress > 0 && <div style={dotStyle} />}
      </div>
    </div>
  )
}
