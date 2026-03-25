'use client'

import { type CSSProperties, type ReactNode, forwardRef } from 'react'

export interface GlassPanelProps {
  children: ReactNode
  /** CSS class for the outer container */
  className?: string
  /** Blur strength in pixels (default: 28) */
  blur?: number
  /** Saturation boost percentage (default: 120) */
  saturation?: number
  /** Border color (default: 'rgba(255,255,255,0.08)') */
  borderColor?: string
  /** Top gradient stop color */
  gradientFrom?: string
  /** Bottom gradient stop color */
  gradientTo?: string
  /** Glow accent color (default: none) */
  glowColor?: string
  /** Glow position: corner where the radial gradient originates */
  glowPosition?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'
  /** Border radius in pixels (default: 0 — sharp corners per control room aesthetic) */
  radius?: number
  /** Additional inline styles */
  style?: CSSProperties
}

const GLOW_POSITIONS: Record<string, string> = {
  'top-left': 'at top left',
  'top-right': 'at top right',
  'bottom-left': 'at bottom left',
  'bottom-right': 'at bottom right',
}

/**
 * Glassmorphism panel with configurable blur, gradient, and glow accent.
 *
 * Based on the panel system from wyehuongyan.com:
 * - backdrop-filter: blur + saturate
 * - linear-gradient background
 * - ::after radial glow accent
 * - Sharp corners by default (control room aesthetic)
 *
 * Supports both dark and light themes via CSS variable overrides.
 */
export const GlassPanel = forwardRef<HTMLDivElement, GlassPanelProps>(
  function GlassPanel(
    {
      children,
      className,
      blur = 28,
      saturation = 120,
      borderColor = 'rgba(255,255,255,0.08)',
      gradientFrom = 'rgba(255,255,255,0.04)',
      gradientTo = 'rgba(255,255,255,0.01)',
      glowColor,
      glowPosition = 'bottom-right',
      radius = 0,
      style,
    },
    ref
  ) {
    const panelStyle: CSSProperties = {
      position: 'relative',
      background: `linear-gradient(180deg, ${gradientFrom}, ${gradientTo})`,
      backdropFilter: `blur(${blur}px) saturate(${saturation}%)`,
      WebkitBackdropFilter: `blur(${blur}px) saturate(${saturation}%)`,
      border: `1px solid ${borderColor}`,
      borderRadius: radius,
      overflow: 'hidden',
      ...style,
    }

    const glowStyle: CSSProperties | undefined = glowColor
      ? {
          content: '""',
          position: 'absolute',
          inset: 0,
          background: `radial-gradient(ellipse ${GLOW_POSITIONS[glowPosition]}, ${glowColor} 0%, transparent 70%)`,
          pointerEvents: 'none',
          zIndex: 0,
        }
      : undefined

    return (
      <div ref={ref} className={className} style={panelStyle}>
        {glowStyle && <div style={glowStyle} aria-hidden="true" />}
        <div style={{ position: 'relative', zIndex: 1 }}>{children}</div>
      </div>
    )
  }
)
