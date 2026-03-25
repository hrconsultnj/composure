/**
 * TiltCard — 3D perspective tilt that follows mouse position.
 *
 * Dependencies: tailwindcss (no animation library needed)
 * Accessibility: Respects prefers-reduced-motion (flat, no tilt).
 *   Auto-disables on coarse pointer devices. Content remains accessible.
 */
'use client'

import { type ReactNode, useCallback, useRef, useState } from 'react'

interface TiltCardProps {
  children: ReactNode
  /** Max rotation in degrees (default: 8) */
  maxTilt?: number
  /** Perspective distance in px (default: 800) */
  perspective?: number
  className?: string
}

export function TiltCard({
  children,
  maxTilt = 8,
  perspective = 800,
  className = '',
}: TiltCardProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [transform, setTransform] = useState('rotateX(0deg) rotateY(0deg)')
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
      const x = (e.clientX - rect.left) / rect.width - 0.5
      const y = (e.clientY - rect.top) / rect.height - 0.5
      setTransform(
        `rotateX(${(-y * maxTilt).toFixed(1)}deg) rotateY(${(x * maxTilt).toFixed(1)}deg)`
      )
    },
    [disabled, maxTilt]
  )

  const handleLeave = useCallback(() => {
    setTransform('rotateX(0deg) rotateY(0deg)')
  }, [])

  return (
    <div style={{ perspective }} className={className}>
      <div
        ref={ref}
        onPointerMove={handleMove}
        onPointerLeave={handleLeave}
        style={{
          transform: disabled ? 'none' : transform,
          transition: 'transform 0.15s ease-out',
          willChange: 'transform',
        }}
      >
        {children}
      </div>
    </div>
  )
}
