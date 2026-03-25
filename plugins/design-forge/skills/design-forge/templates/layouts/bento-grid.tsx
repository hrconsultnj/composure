/**
 * BentoGrid — Responsive variable-size grid (Apple/Vercel style).
 *
 * Responsive: 1 col mobile -> 2 col tablet -> 4 col desktop.
 * Customization: row height, gap. Cells accept colSpan/rowSpan for hierarchy.
 *
 * Usage:
 *   <BentoGrid>
 *     <BentoCell colSpan={2} rowSpan={2}><Feature /></BentoCell>
 *     <BentoCell><Stat /></BentoCell>
 *   </BentoGrid>
 */
import { type ReactNode } from 'react'

export interface BentoGridProps {
  children: ReactNode
  gap?: number
  rowHeight?: number
  className?: string
}

export interface BentoCellProps {
  children: ReactNode
  colSpan?: 1 | 2 | 3 | 4
  rowSpan?: 1 | 2 | 3
  className?: string
}

const COL_SPAN: Record<number, string> = {
  1: 'col-span-1',
  2: 'sm:col-span-2',
  3: 'sm:col-span-2 lg:col-span-3',
  4: 'sm:col-span-2 lg:col-span-4',
}
const ROW_SPAN: Record<number, string> = { 1: 'row-span-1', 2: 'row-span-2', 3: 'row-span-3' }

export function BentoCell({ children, colSpan = 1, rowSpan = 1, className = '' }: BentoCellProps) {
  return (
    <div
      className={[
        'col-span-1', COL_SPAN[colSpan], ROW_SPAN[rowSpan],
        'rounded-xl border border-white/[0.08] bg-white/[0.02] p-6',
        'transition-all duration-300 hover:border-white/[0.16] hover:bg-white/[0.04]',
        'focus-within:ring-2 focus-within:ring-blue-500/40',
        className,
      ].join(' ')}
    >
      {children}
    </div>
  )
}

export function BentoGrid({ children, gap = 16, rowHeight = 200, className = '' }: BentoGridProps) {
  return (
    <section
      role="list"
      aria-label="Feature grid"
      className={['grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4', className].join(' ')}
      style={{ gap, gridAutoRows: rowHeight }}
    >
      {children}
    </section>
  )
}
