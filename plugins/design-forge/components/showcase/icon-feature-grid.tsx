"use client"

import { useRef, useState, useEffect, type ReactNode } from "react"

interface IconFeature {
  icon: ReactNode
  title: string
  description: string
}

interface IconFeatureGridProps {
  heading?: string
  tagline?: string
  features: IconFeature[]
  columns?: 2 | 3 | 4
  intensity?: "minimal" | "gentle" | "moderate" | "expressive"
}

const TIMING: Record<string, { duration: number; stagger: number }> = {
  minimal: { duration: 0, stagger: 0 },
  gentle: { duration: 0.4, stagger: 0.06 },
  moderate: { duration: 0.5, stagger: 0.08 },
  expressive: { duration: 0.7, stagger: 0.12 },
}

const COL_MAP: Record<number, string> = {
  2: "sm:grid-cols-2",
  3: "sm:grid-cols-2 lg:grid-cols-3",
  4: "sm:grid-cols-2 lg:grid-cols-4",
}

export function IconFeatureGrid({
  heading,
  tagline,
  features,
  columns = 3,
  intensity = "moderate",
}: IconFeatureGridProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(intensity === "minimal")
  const t = TIMING[intensity]

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
      <div className="mx-auto max-w-5xl px-6">
        {(heading || tagline) && (
          <div className="mb-12 text-center">
            {heading && (
              <p className="font-mono text-[10px] tracking-[0.25em] text-white/25 uppercase">{heading}</p>
            )}
            {tagline && (
              <h2 className="mt-3 text-3xl font-bold text-white/90 tracking-tight sm:text-4xl">{tagline}</h2>
            )}
          </div>
        )}

        <div className={`grid gap-6 ${COL_MAP[columns]}`}>
          {features.map((feat, i) => (
            <div
              key={feat.title}
              className="rounded-2xl border border-white/6 bg-white/[0.02] p-6 transition-all hover:border-white/12 hover:bg-white/[0.04]"
              style={{
                opacity: visible ? 1 : 0,
                transform: visible ? "translateY(0)" : "translateY(20px)",
                transition: `all ${t.duration}s cubic-bezier(0.16, 1, 0.3, 1)`,
                transitionDelay: `${t.stagger * i}s`,
              }}
            >
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 text-lg">
                {feat.icon}
              </div>
              <h3 className="text-sm font-semibold text-white/80">{feat.title}</h3>
              <p className="mt-2 text-xs text-white/35 leading-relaxed">{feat.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
