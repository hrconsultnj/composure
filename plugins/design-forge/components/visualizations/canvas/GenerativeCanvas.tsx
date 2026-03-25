'use client'

import type { DrawFunction } from './types'
import { useCanvas } from './use-canvas'

interface GenerativeCanvasProps {
  /** Draw function called each animation frame */
  draw: DrawFunction
  /** CSS class for the container div */
  className?: string
  /** Whether to animate (default: true) */
  animate?: boolean
  /** FPS cap (default: uncapped) */
  fps?: number
  /** Background fill color per frame (default: transparent) */
  clearColor?: string
  /** Whether to auto-clear each frame (default: true) */
  autoClear?: boolean
  /** Accessible label for screen readers */
  'aria-label'?: string
}

/**
 * Reusable canvas component for generative visualizations.
 *
 * Handles DPR scaling, visibility gating, pointer tracking,
 * and reduced motion — provide a draw function and go.
 *
 * @example
 * ```tsx
 * import { GenerativeCanvas } from 'design-forge/components/visualizations/canvas'
 * import { createGridField } from 'design-forge/components/visualizations/presets'
 *
 * const draw = createGridField({ columns: 20, amplitude: 30 })
 * <GenerativeCanvas draw={draw} className="w-full h-64" />
 * ```
 */
export function GenerativeCanvas({
  draw,
  className,
  animate = true,
  fps,
  clearColor,
  autoClear = true,
  'aria-label': ariaLabel = 'Generative visualization',
}: GenerativeCanvasProps) {
  const { canvasRef, containerRef } = useCanvas({
    draw,
    animate,
    fps,
    clearColor,
    autoClear,
  })

  return (
    <div
      ref={containerRef}
      className={className}
      style={{ overflow: 'hidden' }}
    >
      <canvas
        ref={canvasRef}
        role="img"
        aria-label={ariaLabel}
        style={{ display: 'block', width: '100%', height: '100%' }}
      />
    </div>
  )
}
