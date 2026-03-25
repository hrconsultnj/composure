/**
 * HeroSplit — Split hero: left text column + right visual slot.
 *
 * Responsive: stacks vertically on mobile, side-by-side on md+.
 * Customization: swap sides via `reversed`, visual slot accepts any ReactNode
 * (canvas, 3D scene, image, video).
 *
 * Usage:
 *   <HeroSplit
 *     eyebrow="New Release"
 *     heading="Ship faster with AI"
 *     description="Deploy in seconds."
 *     cta={<a href="/start">Get Started</a>}
 *     visual={<Canvas />}
 *   />
 */
import { type ReactNode } from 'react'

export interface HeroSplitProps {
  /** Small label above heading (mono, uppercase) */
  eyebrow?: string
  heading: ReactNode
  description?: ReactNode
  /** CTA buttons / links */
  cta?: ReactNode
  /** Right-side visual: canvas, image, 3D, video */
  visual: ReactNode
  /** Swap text/visual sides */
  reversed?: boolean
  className?: string
}

export function HeroSplit({
  eyebrow,
  heading,
  description,
  cta,
  visual,
  reversed = false,
  className = '',
}: HeroSplitProps) {
  return (
    <section
      className={[
        'grid min-h-[min(100svh,62rem)] grid-cols-1 md:grid-cols-2',
        'items-center gap-8 md:gap-12 lg:gap-16',
        'mx-auto w-[min(100%-2rem,1280px)] py-16 md:py-24',
        className,
      ].join(' ')}
    >
      {/* Text column */}
      <div
        className={[
          'flex flex-col justify-center gap-6',
          reversed ? 'md:order-2' : 'md:order-1',
        ].join(' ')}
      >
        {eyebrow && (
          <span className="font-mono text-xs uppercase tracking-[0.08em] text-white/50">
            {eyebrow}
          </span>
        )}
        <h1 className="text-4xl font-semibold tracking-[-0.04em] leading-[0.95] text-[#ededed] md:text-5xl lg:text-6xl">
          {heading}
        </h1>
        {description && (
          <p className="max-w-lg text-base leading-relaxed text-[#a1a1a1] md:text-lg">
            {description}
          </p>
        )}
        {cta && (
          <div className="flex flex-wrap items-center gap-4 pt-2">
            {cta}
          </div>
        )}
      </div>

      {/* Visual slot */}
      <div
        className={[
          'relative min-h-[300px] md:min-h-[400px]',
          reversed ? 'md:order-1' : 'md:order-2',
        ].join(' ')}
        aria-hidden="true"
      >
        {visual}
      </div>
    </section>
  )
}
