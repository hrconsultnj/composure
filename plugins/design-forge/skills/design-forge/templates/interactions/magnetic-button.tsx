/**
 * MagneticButton — Button that subtly moves toward the cursor on hover.
 *
 * Dependencies: motion, tailwindcss
 * Accessibility: Respects prefers-reduced-motion (disables magnetic pull).
 *   Auto-disables on touch/coarse pointer devices. Fully keyboard-accessible.
 */
'use client'

import { type ReactNode, useRef, useState } from 'react'
import { motion, useMotionValue, useSpring } from 'motion/react'

interface MagneticButtonProps {
  children: ReactNode
  /** Max displacement in pixels (default: 10) */
  strength?: number
  className?: string
}

export function MagneticButton({
  children,
  strength = 10,
  className = '',
}: MagneticButtonProps) {
  const ref = useRef<HTMLButtonElement>(null)
  const [isCoarse] = useState(() =>
    typeof window !== 'undefined' &&
    window.matchMedia('(pointer: coarse)').matches
  )
  const [reducedMotion] = useState(() =>
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )

  const x = useMotionValue(0)
  const y = useMotionValue(0)
  const springX = useSpring(x, { stiffness: 300, damping: 20 })
  const springY = useSpring(y, { stiffness: 300, damping: 20 })

  const disabled = isCoarse || reducedMotion

  const handleMove = (e: React.PointerEvent) => {
    if (disabled || !ref.current) return
    const rect = ref.current.getBoundingClientRect()
    const dx = e.clientX - (rect.left + rect.width / 2)
    const dy = e.clientY - (rect.top + rect.height / 2)
    x.set(dx * (strength / rect.width))
    y.set(dy * (strength / rect.height))
  }

  const handleLeave = () => {
    x.set(0)
    y.set(0)
  }

  return (
    <motion.button
      ref={ref}
      className={`inline-flex items-center justify-center ${className}`}
      style={{ x: disabled ? 0 : springX, y: disabled ? 0 : springY }}
      onPointerMove={handleMove}
      onPointerLeave={handleLeave}
    >
      {children}
    </motion.button>
  )
}
