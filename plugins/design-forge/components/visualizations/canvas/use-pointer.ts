'use client'

import { useCallback, useRef } from 'react'
import type { PointerState } from './types'

/**
 * Tracks pointer position relative to a canvas element.
 *
 * Returns normalized coordinates (0-1) and active state.
 * Uses a ref (not state) to avoid re-renders on every pointer move —
 * the RAF loop reads from the ref imperatively.
 */
export function usePointer() {
  const pointer = useRef<PointerState>({ x: 0.5, y: 0.5, active: false })

  const onPointerMove = useCallback(
    (e: PointerEvent, canvas: HTMLCanvasElement) => {
      const rect = canvas.getBoundingClientRect()
      pointer.current = {
        x: (e.clientX - rect.left) / rect.width,
        y: (e.clientY - rect.top) / rect.height,
        active: true,
      }
    },
    []
  )

  const onPointerLeave = useCallback(() => {
    pointer.current = { ...pointer.current, active: false }
  }, [])

  return { pointer, onPointerMove, onPointerLeave }
}
