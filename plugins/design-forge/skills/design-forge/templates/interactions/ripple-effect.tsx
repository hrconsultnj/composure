/**
 * RippleButton — Material-style ripple on click using CSS transforms.
 * Dependencies: tailwindcss
 * Accessibility: prefers-reduced-motion disables ripple. Keyboard triggers at center.
 */
'use client'

import { type ReactNode, useCallback, useRef, useState } from 'react'

interface Ripple { id: number; x: number; y: number; size: number }

interface RippleButtonProps {
  children: ReactNode
  color?: string
  duration?: number
  className?: string
  onClick?: () => void
}

export function RippleButton({
  children, color = 'rgba(255,255,255,0.3)',
  duration = 500, className = '', onClick,
}: RippleButtonProps) {
  const ref = useRef<HTMLButtonElement>(null)
  const [ripples, setRipples] = useState<Ripple[]>([])
  const nextId = useRef(0)
  const [noMotion] = useState(() =>
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )

  const addRipple = useCallback(
    (cx?: number, cy?: number) => {
      if (noMotion || !ref.current) return
      const rect = ref.current.getBoundingClientRect()
      const x = cx != null ? cx - rect.left : rect.width / 2
      const y = cy != null ? cy - rect.top : rect.height / 2
      const size = Math.max(rect.width, rect.height) * 2
      const id = nextId.current++
      setRipples((p) => [...p, { id, x, y, size }])
      setTimeout(() => setRipples((p) => p.filter((r) => r.id !== id)), duration)
    },
    [noMotion, duration]
  )

  return (
    <button
      ref={ref}
      className={`relative overflow-hidden ${className}`}
      onClick={(e) => { addRipple(e.clientX, e.clientY); onClick?.() }}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') addRipple() }}
    >
      {children}
      {ripples.map((r) => (
        <span
          key={r.id} aria-hidden="true"
          style={{
            position: 'absolute', left: r.x - r.size / 2, top: r.y - r.size / 2,
            width: r.size, height: r.size, borderRadius: '50%', background: color,
            transform: 'scale(0)', opacity: 1, pointerEvents: 'none',
            animation: `ripple-grow ${duration}ms ease-out forwards`,
          }}
        />
      ))}
      <style>{`@keyframes ripple-grow { to { transform: scale(1); opacity: 0; } }`}</style>
    </button>
  )
}
