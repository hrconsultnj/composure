/**
 * HoverUnderline — Animated underline that slides in from left, out to right.
 *
 * Dependencies: tailwindcss
 * Accessibility: Respects prefers-reduced-motion (static underline on hover).
 *   Uses GPU-accelerated transform for the underline animation.
 */
'use client'

import { type ReactNode } from 'react'

interface HoverUnderlineProps {
  children: ReactNode
  /** Underline color (default: 'currentColor') */
  color?: string
  /** Underline thickness in pixels (default: 1.5) */
  thickness?: number
  /** Animation duration in ms (default: 300) */
  duration?: number
  className?: string
  as?: 'span' | 'a'
  href?: string
}

export function HoverUnderline({
  children,
  color = 'currentColor',
  thickness = 1.5,
  duration = 300,
  className = '',
  as: Tag = 'span',
  href,
}: HoverUnderlineProps) {
  return (
    <Tag
      {...(Tag === 'a' ? { href } : {})}
      className={`group relative inline-block ${className}`}
    >
      {children}
      <span
        aria-hidden="true"
        className="absolute bottom-0 left-0 w-full origin-left scale-x-0 transition-transform group-hover:scale-x-100 motion-reduce:!scale-x-0 motion-reduce:group-hover:!scale-x-100 motion-reduce:!transition-none"
        style={{
          height: thickness,
          backgroundColor: color,
          transitionDuration: `${duration}ms`,
          transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      />
      <style>{`
        .group:not(:hover) > [aria-hidden] {
          transform-origin: right;
        }
        .group:hover > [aria-hidden] {
          transform-origin: left;
        }
      `}</style>
    </Tag>
  )
}
