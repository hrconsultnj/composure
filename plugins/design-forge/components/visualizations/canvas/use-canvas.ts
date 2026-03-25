'use client'

import { useCallback, useEffect, useRef } from 'react'
import type { CanvasContext, UseCanvasOptions } from './types'
import { usePointer } from './use-pointer'
import { useReducedMotion } from './use-reduced-motion'
import { useVisibility } from './use-visibility'
import { getSignalNoise } from './signal-noise'

/**
 * Core canvas hook — the React equivalent of setupCanvas().
 *
 * Manages: DPR scaling (capped at 2x), IntersectionObserver visibility gating,
 * pointer tracking, requestAnimationFrame loop, and reduced motion support.
 *
 * The draw function receives a CanvasContext each frame with all the state
 * needed to render: dimensions, time, pointer, signal noise.
 */
export function useCanvas(options: UseCanvasOptions) {
  const { draw, animate = true, fps, clearColor, autoClear = true } = options

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const isVisible = useVisibility(containerRef)
  const { pointer, onPointerMove, onPointerLeave } = usePointer()
  const reducedMotion = useReducedMotion()

  const rafId = useRef(0)
  const startTime = useRef(0)
  const lastFrame = useRef(0)
  const drawRef = useRef(draw)
  drawRef.current = draw

  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current
    const container = canvas?.parentElement
    if (!canvas || !container) return

    const dpr = Math.min(window.devicePixelRatio, 2)
    const rect = container.getBoundingClientRect()

    canvas.width = rect.width * dpr
    canvas.height = rect.height * dpr
    canvas.style.width = `${rect.width}px`
    canvas.style.height = `${rect.height}px`

    const ctx = canvas.getContext('2d')
    if (ctx) ctx.scale(dpr, dpr)
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    resizeCanvas()

    const handleMove = (e: PointerEvent) => onPointerMove(e, canvas)
    const handleLeave = () => onPointerLeave()
    canvas.addEventListener('pointermove', handleMove)
    canvas.addEventListener('pointerleave', handleLeave)

    const ro = new ResizeObserver(resizeCanvas)
    ro.observe(canvas.parentElement || canvas)

    const shouldAnimate = animate && isVisible && !reducedMotion
    const minFrameTime = fps ? 1000 / fps : 0

    const buildContext = (now: number): CanvasContext => {
      if (!startTime.current) startTime.current = now
      const time = now - startTime.current
      const delta = now - (lastFrame.current || now)
      lastFrame.current = now

      const dpr = Math.min(window.devicePixelRatio, 2)
      return {
        ctx,
        width: canvas.width / dpr,
        height: canvas.height / dpr,
        dpr,
        time,
        delta,
        pointer: pointer.current,
        signal: getSignalNoise(time),
      }
    }

    const renderFrame = (now: number) => {
      if (minFrameTime && now - lastFrame.current < minFrameTime) {
        rafId.current = requestAnimationFrame(renderFrame)
        return
      }

      const context = buildContext(now)

      if (autoClear) {
        ctx.clearRect(0, 0, context.width, context.height)
        if (clearColor) {
          ctx.fillStyle = clearColor
          ctx.fillRect(0, 0, context.width, context.height)
        }
      }

      drawRef.current(context)

      if (shouldAnimate) {
        rafId.current = requestAnimationFrame(renderFrame)
      }
    }

    if (shouldAnimate) {
      rafId.current = requestAnimationFrame(renderFrame)
    } else {
      renderFrame(performance.now())
    }

    return () => {
      cancelAnimationFrame(rafId.current)
      canvas.removeEventListener('pointermove', handleMove)
      canvas.removeEventListener('pointerleave', handleLeave)
      ro.disconnect()
    }
  }, [
    animate, isVisible, reducedMotion, fps, clearColor, autoClear,
    resizeCanvas, onPointerMove, onPointerLeave, pointer,
  ])

  return { canvasRef, containerRef, isVisible, reducedMotion }
}
