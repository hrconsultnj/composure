'use client'

import { useEffect, useState } from 'react'

export interface UseNavbarCompactOptions {
  /** Scroll threshold in pixels to trigger compact mode (default: 52) */
  threshold?: number
}

/**
 * Hook that returns whether the navbar should be in compact mode.
 *
 * Toggles based on scroll position. At the threshold, adds 'is-scrolled'
 * class to document body (for CSS-based consumers) and returns the boolean.
 *
 * Use this to shrink logo, tighten spacing, increase blur on scroll.
 */
export function useNavbarCompact(
  options: UseNavbarCompactOptions = {}
): boolean {
  const { threshold = 52 } = options
  const [compact, setCompact] = useState(false)

  useEffect(() => {
    const update = () => {
      const scrolled = window.scrollY > threshold
      setCompact(scrolled)
      document.body.classList.toggle('is-scrolled', scrolled)
    }

    update()
    window.addEventListener('scroll', update, { passive: true })
    return () => {
      window.removeEventListener('scroll', update)
      document.body.classList.remove('is-scrolled')
    }
  }, [threshold])

  return compact
}
