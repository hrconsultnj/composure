/**
 * ElasticScroll — Overscroll elastic bounce on a scrollable container.
 * Dependencies: tailwindcss
 * Accessibility: prefers-reduced-motion disables effect. Touch gets native overscroll.
 */
'use client'

import { type ReactNode, useCallback, useEffect, useRef, useState } from 'react'

interface ElasticScrollProps {
  children: ReactNode
  maxStretch?: number
  snapDuration?: number
  className?: string
}

export function ElasticScroll({
  children, maxStretch = 40, snapDuration = 400, className = '',
}: ElasticScrollProps) {
  const ref = useRef<HTMLDivElement>(null)
  const innerRef = useRef<HTMLDivElement>(null)
  const [disabled] = useState(() => {
    if (typeof window === 'undefined') return true
    return (
      window.matchMedia('(pointer: coarse)').matches ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    )
  })

  const handleWheel = useCallback((e: WheelEvent) => {
    if (disabled || !ref.current || !innerRef.current) return
    const el = ref.current
    const atTop = el.scrollTop <= 0 && e.deltaY < 0
    const atBottom = el.scrollTop + el.clientHeight >= el.scrollHeight && e.deltaY > 0
    if (!atTop && !atBottom) return

    const stretch = Math.min(Math.abs(e.deltaY) * 0.3, maxStretch)
    const dir = atTop ? 1 : -1
    innerRef.current.style.transition = 'none'
    innerRef.current.style.transform = `translateY(${dir * stretch}px)`
    requestAnimationFrame(() => {
      if (!innerRef.current) return
      innerRef.current.style.transition = `transform ${snapDuration}ms cubic-bezier(0.25,1,0.5,1)`
      innerRef.current.style.transform = 'translateY(0px)'
    })
  }, [disabled, maxStretch, snapDuration])

  useEffect(() => {
    const el = ref.current
    if (disabled || !el) return
    el.addEventListener('wheel', handleWheel, { passive: true })
    return () => el.removeEventListener('wheel', handleWheel)
  }, [disabled, handleWheel])

  return (
    <div ref={ref} className={`overflow-auto ${className}`}>
      <div ref={innerRef} style={{ willChange: 'transform' }}>{children}</div>
    </div>
  )
}
