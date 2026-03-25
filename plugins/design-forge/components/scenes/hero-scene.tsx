'use client'

/**
 * Three.js Hero Scene Template
 *
 * A container for full-screen Three.js hero sections.
 * Provides layout, background, and telemetry HUD overlay —
 * pass your R3F Canvas as children.
 *
 * Architecture from wyehuongyan.com:
 * "Three.js for hero only, Canvas 2D for everything else"
 *
 * @example
 * ```tsx
 * import { Canvas } from '@react-three/fiber'
 *
 * <HeroScene>
 *   <Canvas camera={{ fov: 50, position: [0, 5, 20] }} dpr={[1, 2]}>
 *     <ambientLight intensity={0.5} />
 *     <mesh>
 *       <boxGeometry args={[2, 2, 2]} />
 *       <meshStandardMaterial color="#4a78ff" />
 *     </mesh>
 *   </Canvas>
 * </HeroScene>
 * ```
 */

import { type CSSProperties, type ReactNode, useEffect, useState } from 'react'

export interface HeroSceneProps {
  /** R3F Canvas + scene contents, or any children */
  children: ReactNode
  /** Background color (default: '#070809') */
  background?: string
  /** Height CSS value (default: '100svh') */
  height?: string
  /** Telemetry HUD text lines shown as overlay (default: none) */
  telemetry?: string[]
  /** CSS class for the container */
  className?: string
  /** Additional inline styles */
  style?: CSSProperties
}

/**
 * Full-screen hero scene container with optional telemetry HUD.
 *
 * Wrap your R3F Canvas (or any full-bleed content) in this component
 * to get the standard hero layout with telemetry readout overlay.
 */
export function HeroScene({
  children,
  background = '#070809',
  height = '100svh',
  telemetry,
  className,
  style,
}: HeroSceneProps) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  const containerStyle: CSSProperties = {
    position: 'relative',
    width: '100%',
    height,
    background,
    overflow: 'hidden',
    ...style,
  }

  const hudStyle: CSSProperties = {
    position: 'absolute',
    bottom: 12,
    left: 16,
    zIndex: 2,
    fontFamily: 'var(--font-mono, monospace)',
    fontSize: 10,
    color: 'rgba(255,255,255,0.35)',
    letterSpacing: '0.06em',
    textTransform: 'uppercase',
    lineHeight: 1.6,
    pointerEvents: 'none',
  }

  return (
    <div className={className} style={containerStyle}>
      {mounted && children}
      {telemetry && telemetry.length > 0 && (
        <div style={hudStyle} aria-hidden="true">
          {telemetry.map((line, i) => (
            <div key={i}>{line}</div>
          ))}
        </div>
      )}
    </div>
  )
}
