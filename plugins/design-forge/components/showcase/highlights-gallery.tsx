"use client"

import { useState, type ReactNode } from "react"

interface HighlightTab {
  label: string
  heading: string
  description: string
  visual: ReactNode
}

interface HighlightsGalleryProps {
  sectionLabel?: string
  tabs: HighlightTab[]
  intensity?: "minimal" | "gentle" | "moderate" | "expressive"
}

export function HighlightsGallery({
  sectionLabel = "Get the highlights",
  tabs,
  intensity = "moderate",
}: HighlightsGalleryProps) {
  const [active, setActive] = useState(0)
  const dur = intensity === "minimal" ? 0 : intensity === "gentle" ? 0.3 : intensity === "moderate" ? 0.4 : 0.5

  return (
    <section className="bg-black py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-6">
        <p className="mb-8 font-mono text-[10px] tracking-[0.25em] text-white/25 uppercase">
          {sectionLabel}
        </p>

        {/* Tab pills */}
        <div className="flex gap-2 overflow-x-auto pb-4 scrollbar-none">
          {tabs.map((tab, i) => (
            <button
              key={tab.label}
              onClick={() => setActive(i)}
              className={`shrink-0 rounded-full px-5 py-2 text-sm font-medium transition-all ${
                i === active
                  ? "bg-white/10 text-white"
                  : "text-white/35 hover:text-white/60 hover:bg-white/5"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content area */}
        <div className="mt-8 grid gap-8 lg:grid-cols-2 lg:gap-12 items-center">
          {/* Text */}
          <div
            key={`text-${active}`}
            style={{
              animation: dur > 0 ? `fadeSlideIn ${dur}s cubic-bezier(0.16, 1, 0.3, 1) both` : undefined,
            }}
          >
            <h3 className="text-2xl font-bold text-white/90 sm:text-3xl tracking-tight">
              {tabs[active].heading}
            </h3>
            <p className="mt-4 text-sm text-white/40 leading-relaxed max-w-lg">
              {tabs[active].description}
            </p>
          </div>

          {/* Visual */}
          <div
            key={`visual-${active}`}
            className="relative aspect-[4/3] overflow-hidden rounded-xl border border-white/6"
            style={{
              animation: dur > 0 ? `fadeScaleIn ${dur * 1.2}s cubic-bezier(0.16, 1, 0.3, 1) both` : undefined,
            }}
          >
            {tabs[active].visual}
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeScaleIn {
          from { opacity: 0; transform: scale(0.97); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </section>
  )
}
