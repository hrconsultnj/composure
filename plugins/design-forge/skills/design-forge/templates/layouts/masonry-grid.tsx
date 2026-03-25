/**
 * MasonryGrid — CSS-only masonry layout with equal gutters.
 *
 * Uses CSS columns for true masonry (no JS needed). Items flow top-to-bottom
 * then left-to-right. Responsive: 1 col mobile -> 2 col tablet -> 3 col desktop.
 *
 * Customization: column count per breakpoint, gap size.
 * Note: CSS columns reorder items vertically. For left-to-right reading order,
 * consider a JS-based masonry or CSS grid masonry (when browser support lands).
 *
 * Usage:
 *   <MasonryGrid>
 *     <MasonryItem><Card /></MasonryItem>
 *   </MasonryGrid>
 */
import { type ReactNode } from 'react'

export interface MasonryGridProps {
  children: ReactNode
  /** Gap between items in pixels (default: 16) */
  gap?: number
  /** Column count on mobile / tablet / desktop (default: 1 / 2 / 3) */
  columns?: { sm?: number; md?: number; lg?: number }
  className?: string
}

export interface MasonryItemProps {
  children: ReactNode
  className?: string
}

export function MasonryItem({ children, className = '' }: MasonryItemProps) {
  return (
    <div
      className={[
        'break-inside-avoid mb-[var(--masonry-gap)]',
        className,
      ].join(' ')}
    >
      {children}
    </div>
  )
}

export function MasonryGrid({
  children,
  gap = 16,
  columns = {},
  className = '',
}: MasonryGridProps) {
  const { sm = 1, md = 2, lg = 3 } = columns

  return (
    <div
      role="list"
      aria-label="Masonry grid"
      className={[
        '[column-fill:balance]',
        className,
      ].join(' ')}
      style={
        {
          '--masonry-gap': `${gap}px`,
          columnGap: gap,
          columnCount: sm,
        } as React.CSSProperties
      }
    >
      {/* Responsive column count via inline style + media query classes */}
      <style>{`
        @media (min-width: 768px) {
          [data-masonry="true"] { column-count: ${md}; }
        }
        @media (min-width: 1024px) {
          [data-masonry="true"] { column-count: ${lg}; }
        }
      `}</style>
      <div data-masonry="true" style={{ columnCount: 'inherit', columnGap: 'inherit' }}>
        {children}
      </div>
    </div>
  )
}
