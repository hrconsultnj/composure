/**
 * CursorSpotlight — Radial gradient spotlight that follows the cursor.
 *
 * Dependencies: tailwindcss
 * Accessibility: Respects prefers-reduced-motion (spotlight hidden).
 *   Auto-disables on coarse pointer devices. Purely decorative (aria-hidden).
 */
'use client'

import { type ReactNode, useCallback, useRef, useState } from 'react'

interface CursorSpotlightProps {
  children: ReactNode
  /** Spotlight radius in pixels (default: 200) */
  radius?: number
  /** Spotlight color (default: 'rgba(255,255,255,0.06)') */
  color?: string
  className?: string
}

export function CursorSpotlight({
  children,
  radius = 200,
  color = 'rgba(255,255,255,0.06)',
  className = '',
}: CursorSpotlightProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)
  const [disabled] = useState(() => {
    if (typeof window === 'undefined') return true
    return (
      window.matchMedia('(pointer: coarse)').matches ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    )
  })

  const handleMove = useCallback(
    (e: React.PointerEvent) => {
      if (disabled || !ref.current) return
      const rect = ref.current.getBoundingClientRect()
      ref.current.style.setProperty('--spot-x', `${e.clientX - rect.left}px`)
      ref.current.style.setProperty('--spot-y', `${e.clientY - rect.top}px`)
    },
    [disabled]
  )

  if (disabled) return <div className={className}>{children}</div>

  return (
    <div
      ref={ref}
      className={`relative ${className}`}
      onPointerMove={handleMove}
      onPointerEnter={() => setVisible(true)}
      onPointerLeave={() => setVisible(false)}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 transition-opacity duration-300"
        style={{
          opacity: visible ? 1 : 0,
          background: `radial-gradient(${radius}px circle at var(--spot-x) var(--spot-y), ${color}, transparent)`,
        }}
      />
      <div className="relative">{children}</div>
    </div>
  )
}
