/**
 * HeroCentered — Full-width centered hero (Next.js Conf / Vercel style).
 *
 * Responsive: fluid typography with clamp(), stacks CTAs on mobile.
 * Customization: announcement banner slot, gradient text via `gradientHeading`,
 * background slot for grid lines / gradient orbs.
 *
 * Usage:
 *   <HeroCentered
 *     announcement={<span>Ship 26 is coming</span>}
 *     heading="Build and deploy on the AI Cloud"
 *     description="The developer tools and cloud infrastructure you need."
 *     primaryCta={<a href="/start">Start Deploying</a>}
 *     secondaryCta={<a href="/demo">Get a Demo</a>}
 *   />
 */
import { type ReactNode } from 'react'

export interface HeroCenteredProps {
  /** Optional announcement badge/banner above heading */
  announcement?: ReactNode
  heading: ReactNode
  /** Apply gradient to heading text */
  gradientHeading?: boolean
  description?: ReactNode
  primaryCta?: ReactNode
  secondaryCta?: ReactNode
  /** Background decoration (grid lines, orbs, canvas) */
  background?: ReactNode
  className?: string
}

export function HeroCentered({
  announcement,
  heading,
  gradientHeading = false,
  description,
  primaryCta,
  secondaryCta,
  background,
  className = '',
}: HeroCenteredProps) {
  return (
    <section
      className={[
        'relative min-h-[min(100svh,62rem)] overflow-hidden',
        className,
      ].join(' ')}
    >
      {/* Background slot */}
      {background && (
        <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
          {background}
        </div>
      )}

      <div className="relative z-10 mx-auto flex max-w-4xl flex-col items-center px-6 py-24 text-center md:py-32 lg:py-40">
        {announcement && (
          <div className="mb-8 flex items-center gap-3 text-sm text-[#a1a1a1]">
            {announcement}
          </div>
        )}

        <h1
          className={[
            'text-[clamp(2.5rem,6vw,4.75rem)] font-semibold leading-[0.95] tracking-[-0.04em] text-[#ededed]',
            gradientHeading
              ? 'bg-gradient-to-b from-white to-white/60 bg-clip-text text-transparent'
              : '',
          ].join(' ')}
        >
          {heading}
        </h1>

        {description && (
          <p className="mt-6 max-w-2xl text-base leading-relaxed text-[#a1a1a1] md:text-lg lg:text-xl">
            {description}
          </p>
        )}

        {(primaryCta || secondaryCta) && (
          <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row">
            {primaryCta}
            {secondaryCta}
          </div>
        )}
      </div>
    </section>
  )
}
