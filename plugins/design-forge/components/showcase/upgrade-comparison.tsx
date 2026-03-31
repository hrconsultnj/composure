"use client"

import { useState, useRef, useEffect, type ReactNode } from "react"

interface UpgradeBenefit {
  icon: ReactNode
  text: string
}

interface UpgradeOption {
  label: string
  benefits: UpgradeBenefit[]
}

interface UpgradeComparisonProps {
  heading?: string
  description?: string
  options: UpgradeOption[]
  ctaHeading?: string
  ctaDescription?: string
  ctaAction?: ReactNode
  intensity?: "minimal" | "gentle" | "moderate" | "expressive"
}

export function UpgradeComparison({
  heading = "There's never been a better time to upgrade.",
  description,
  options,
  ctaHeading = "Apple Trade In",
  ctaDescription = "Get credit toward your next Mac when you trade in an eligible device.",
  ctaAction,
  intensity = "moderate",
}: UpgradeComparisonProps) {
  const [selected, setSelected] = useState(0)
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(intensity === "minimal")
  const dur = intensity === "minimal" ? 0 : intensity === "gentle" ? 0.4 : 0.5

  useEffect(() => {
    if (intensity === "minimal") return
    const el = ref.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisible(true) },
      { rootMargin: "-60px", threshold: 0.1 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [intensity])

  return (
    <section ref={ref} className="bg-black py-20 sm:py-28">
      <div className="mx-auto max-w-4xl px-6">
        <div className="text-center mb-10">
          <h2
            className="text-3xl font-bold text-white/90 tracking-tight sm:text-4xl"
            style={{
              opacity: visible ? 1 : 0,
              transform: visible ? "translateY(0)" : "translateY(16px)",
              transition: `all ${dur}s cubic-bezier(0.16, 1, 0.3, 1)`,
            }}
          >
            {heading}
          </h2>
          {description && (
            <p className="mt-3 text-sm text-white/40">{description}</p>
          )}
        </div>

        {/* Dropdown selector */}
        <div className="flex justify-center mb-8">
          <select
            value={selected}
            onChange={(e) => setSelected(Number(e.target.value))}
            className="rounded-xl border border-white/10 bg-white/5 px-5 py-2.5 text-sm text-white/70 backdrop-blur appearance-none cursor-pointer hover:border-white/20 focus:outline-none focus:ring-1 focus:ring-white/20"
          >
            {options.map((opt, i) => (
              <option key={opt.label} value={i} className="bg-black text-white">
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Benefits grid */}
        <div
          key={selected}
          className="grid gap-4 sm:grid-cols-2"
          style={{
            animation: dur > 0 ? `upgradeFade ${dur}s cubic-bezier(0.16, 1, 0.3, 1) both` : undefined,
          }}
        >
          {options[selected].benefits.map((benefit, i) => (
            <div
              key={i}
              className="flex gap-4 rounded-xl border border-white/6 bg-white/[0.02] p-5"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/5 text-lg">
                {benefit.icon}
              </div>
              <p className="text-sm text-white/50 leading-relaxed">{benefit.text}</p>
            </div>
          ))}
        </div>

        {/* Trade-in CTA */}
        <div className="mt-12 rounded-2xl border border-white/6 bg-white/[0.02] p-8 text-center">
          <h3 className="text-lg font-semibold text-white/80">{ctaHeading}</h3>
          <p className="mt-2 text-sm text-white/35">{ctaDescription}</p>
          {ctaAction && <div className="mt-4">{ctaAction}</div>}
        </div>
      </div>

      <style jsx>{`
        @keyframes upgradeFade {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </section>
  )
}
