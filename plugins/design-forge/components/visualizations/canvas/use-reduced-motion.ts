'use client'

import { useEffect, useState } from 'react'

/**
 * Detects `prefers-reduced-motion: reduce` media query.
 *
 * When true, canvas animations render a single static frame
 * instead of running a continuous requestAnimationFrame loop.
 */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReduced(mq.matches)

    const handler = (e: MediaQueryListEvent) => setReduced(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  return reduced
}
