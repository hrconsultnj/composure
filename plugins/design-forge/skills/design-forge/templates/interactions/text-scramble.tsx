/**
 * TextScramble — Hover text that scrambles through random chars before resolving.
 * Dependencies: tailwindcss
 * Accessibility: prefers-reduced-motion skips scramble. aria-label for screen readers.
 */
'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%'

interface TextScrambleProps {
  text: string
  speed?: number
  iterations?: number
  triggerOnMount?: boolean
  className?: string
}

export function TextScramble({
  text, speed = 30, iterations = 4,
  triggerOnMount = false, className = '',
}: TextScrambleProps) {
  const [display, setDisplay] = useState(text)
  const timer = useRef<ReturnType<typeof setInterval>>(undefined)
  const [noMotion] = useState(() =>
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )

  const scramble = useCallback(() => {
    if (noMotion) return
    let step = 0
    clearInterval(timer.current)
    timer.current = setInterval(() => {
      const resolved = Math.floor(step / iterations)
      setDisplay(
        text.split('').map((ch, i) =>
          i < resolved ? ch : CHARS[Math.floor(Math.random() * CHARS.length)]
        ).join('')
      )
      step++
      if (resolved >= text.length) { clearInterval(timer.current); setDisplay(text) }
    }, speed)
  }, [text, speed, iterations, noMotion])

  useEffect(() => {
    if (triggerOnMount) scramble()
    return () => clearInterval(timer.current)
  }, [triggerOnMount, scramble])

  return (
    <span className={`inline-block ${className}`} aria-label={text} onPointerEnter={scramble}>
      {display}
    </span>
  )
}
