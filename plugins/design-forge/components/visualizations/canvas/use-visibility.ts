'use client'

import { type RefObject, useEffect, useState } from 'react'

/**
 * IntersectionObserver-based visibility detection.
 *
 * CRITICAL for performance — canvas animations must only run when visible.
 * Without this, a page with 10+ canvas elements would tank performance.
 */
export function useVisibility(
  ref: RefObject<HTMLElement | null>,
  threshold = 0.1
): boolean {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const observer = new IntersectionObserver(
      ([entry]) => setIsVisible(entry.isIntersecting),
      { threshold }
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [ref, threshold])

  return isVisible
}
