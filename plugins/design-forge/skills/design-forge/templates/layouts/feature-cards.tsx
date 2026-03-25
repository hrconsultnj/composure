/**
 * FeatureCards — Section with elevated cards, icon slots, stagger reveal.
 *
 * Responsive: 1 col mobile -> 2 col tablet -> 3 col desktop.
 * Customization: column count, section heading, card items array.
 * Cards use Geist material-small elevation (inset ring + drop shadow).
 *
 * Usage:
 *   <FeatureCards eyebrow="Features" heading="Everything you need"
 *     items={[{ icon: <Bolt />, title: 'Fast', description: '...' }]} />
 */
import { type ReactNode } from 'react'

export interface FeatureItem { icon?: ReactNode; title: string; description: string }

export interface FeatureCardsProps {
  eyebrow?: string
  heading?: ReactNode
  items: FeatureItem[]
  columns?: 2 | 3 | 4
  className?: string
}

const COL_MAP: Record<number, string> = {
  2: 'md:grid-cols-2', 3: 'md:grid-cols-2 lg:grid-cols-3', 4: 'md:grid-cols-2 lg:grid-cols-4',
}

export function FeatureCards({ eyebrow, heading, items, columns = 3, className = '' }: FeatureCardsProps) {
  return (
    <section
      className={['mx-auto w-[min(100%-2rem,1200px)] py-20 md:py-28', className].join(' ')}
      aria-labelledby={heading ? 'features-heading' : undefined}
    >
      {(eyebrow || heading) && (
        <div className="mb-12 text-center md:mb-16">
          {eyebrow && (
            <span className="mb-3 block font-mono text-xs uppercase tracking-[0.08em] text-white/50">
              {eyebrow}
            </span>
          )}
          {heading && (
            <h2 id="features-heading" className="text-3xl font-semibold tracking-[-0.03em] text-[#ededed] md:text-4xl lg:text-5xl">
              {heading}
            </h2>
          )}
        </div>
      )}
      <ul className={['grid grid-cols-1 gap-4', COL_MAP[columns]].join(' ')} role="list">
        {items.map((item, i) => (
          <li
            key={item.title}
            className="group rounded-xl border border-[#333] bg-[#0a0a0a] p-6 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06)] transition-all duration-300 hover:-translate-y-0.5 hover:border-[#444] hover:shadow-lg"
            style={{ animationDelay: `${i * 80}ms` }}
          >
            {item.icon && (
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-white/[0.06] text-[#ededed]">
                {item.icon}
              </div>
            )}
            <h3 className="text-base font-medium tracking-tight text-[#ededed]">{item.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-[#a1a1a1]">{item.description}</p>
          </li>
        ))}
      </ul>
    </section>
  )
}
