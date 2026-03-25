'use client'

import { type CSSProperties, useCallback, useEffect, useRef, useState } from 'react'

export interface CustomCursorProps {
  /** Ring color (default: 'rgba(255,255,255,0.4)') */
  ringColor?: string
  /** Dot color (default: '#fff') */
  dotColor?: string
  /** Label text color (default: '#fff') */
  labelColor?: string
  /** Ring size in pixels (default: 36) */
  ringSize?: number
  /** Dot size in pixels (default: 4) */
  dotSize?: number
  /** Ring follow delay factor 0-1 (default: 0.15) — lower = more lag */
  ringLag?: number
  /** CSS class applied to elements that show the label on hover */
  hoverSelector?: string
  /** Z-index (default: 99999) */
  zIndex?: number
}

/**
 * 3-layer custom cursor system.
 *
 * - Outer ring: follows pointer with configurable lag
 * - Inner dot: tracks pointer exactly
 * - Contextual label: shows text from data-cursor attribute on hover
 *
 * Auto-disables on touch/coarse pointer devices.
 * Apply `data-cursor="open"` (or any text) to elements for hover labels.
 */
export function CustomCursor({
  ringColor = 'rgba(255,255,255,0.4)',
  dotColor = '#fff',
  labelColor = '#fff',
  ringSize = 36,
  dotSize = 4,
  ringLag = 0.15,
  zIndex = 99999,
}: CustomCursorProps) {
  const ringRef = useRef<HTMLDivElement>(null)
  const dotRef = useRef<HTMLDivElement>(null)
  const labelRef = useRef<HTMLDivElement>(null)
  const pos = useRef({ x: 0, y: 0 })
  const ringPos = useRef({ x: 0, y: 0 })
  const [label, setLabel] = useState('')
  const [isCoarse, setIsCoarse] = useState(true)
  const rafRef = useRef(0)

  useEffect(() => {
    const coarse = window.matchMedia('(pointer: coarse)').matches
    setIsCoarse(coarse)
    if (coarse) return

    document.documentElement.style.cursor = 'none'
    return () => {
      document.documentElement.style.cursor = ''
    }
  }, [])

  const animate = useCallback(() => {
    ringPos.current.x += (pos.current.x - ringPos.current.x) * ringLag
    ringPos.current.y += (pos.current.y - ringPos.current.y) * ringLag

    if (ringRef.current) {
      ringRef.current.style.transform =
        `translate(${ringPos.current.x - ringSize / 2}px, ${ringPos.current.y - ringSize / 2}px)`
    }
    if (dotRef.current) {
      dotRef.current.style.transform =
        `translate(${pos.current.x - dotSize / 2}px, ${pos.current.y - dotSize / 2}px)`
    }
    if (labelRef.current) {
      labelRef.current.style.transform =
        `translate(${pos.current.x + ringSize / 2 + 4}px, ${pos.current.y - 8}px)`
    }

    rafRef.current = requestAnimationFrame(animate)
  }, [ringLag, ringSize, dotSize])

  useEffect(() => {
    if (isCoarse) return

    const onMove = (e: PointerEvent) => {
      pos.current = { x: e.clientX, y: e.clientY }
    }

    const onOver = (e: PointerEvent) => {
      const target = (e.target as HTMLElement).closest('[data-cursor]')
      if (target) {
        setLabel(target.getAttribute('data-cursor') || '')
      }
    }

    const onOut = (e: PointerEvent) => {
      const target = (e.target as HTMLElement).closest('[data-cursor]')
      if (target) setLabel('')
    }

    window.addEventListener('pointermove', onMove, { passive: true })
    document.addEventListener('pointerover', onOver)
    document.addEventListener('pointerout', onOut)
    rafRef.current = requestAnimationFrame(animate)

    return () => {
      cancelAnimationFrame(rafRef.current)
      window.removeEventListener('pointermove', onMove)
      document.removeEventListener('pointerover', onOver)
      document.removeEventListener('pointerout', onOut)
    }
  }, [isCoarse, animate])

  if (isCoarse) return null

  const base: CSSProperties = {
    position: 'fixed',
    top: 0,
    left: 0,
    pointerEvents: 'none',
    zIndex,
    willChange: 'transform',
  }

  return (
    <>
      <div
        ref={ringRef}
        style={{
          ...base,
          width: ringSize,
          height: ringSize,
          border: `1.5px solid ${ringColor}`,
          borderRadius: '50%',
          transition: 'width 0.2s, height 0.2s',
        }}
        aria-hidden="true"
      />
      <div
        ref={dotRef}
        style={{
          ...base,
          width: dotSize,
          height: dotSize,
          borderRadius: '50%',
          background: dotColor,
        }}
        aria-hidden="true"
      />
      {label && (
        <div
          ref={labelRef}
          style={{
            ...base,
            color: labelColor,
            fontSize: 11,
            fontFamily: 'var(--font-mono, monospace)',
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            whiteSpace: 'nowrap',
          }}
          aria-hidden="true"
        >
          {label}
        </div>
      )}
    </>
  )
}
