"use client"

import { useState, type ReactNode } from "react"

interface ConfigTab {
  label: string
  content: ReactNode
}

interface ProductConfiguratorProps {
  heading?: string
  tabs: ConfigTab[]
  /** Product visual shown above tabs */
  productVisual?: ReactNode
  intensity?: "minimal" | "gentle" | "moderate" | "expressive"
}

export function ProductConfigurator({
  heading = "Take a closer look.",
  tabs,
  productVisual,
  intensity = "moderate",
}: ProductConfiguratorProps) {
  const [active, setActive] = useState(0)
  const dur = intensity === "minimal" ? 0 : intensity === "gentle" ? 0.3 : 0.4

  return (
    <section className="bg-black py-20 sm:py-28">
      <div className="mx-auto max-w-5xl px-6">
        <h2 className="text-3xl font-bold text-white/90 tracking-tight text-center sm:text-4xl">
          {heading}
        </h2>

        {/* Product visual */}
        {productVisual && (
          <div className="mt-12">
            {productVisual}
          </div>
        )}

        {/* Config pills */}
        <div className="mt-10 flex flex-wrap justify-center gap-2">
          {tabs.map((tab, i) => (
            <button
              key={tab.label}
              onClick={() => setActive(i)}
              className={`rounded-full px-5 py-2 text-sm font-medium transition-all ${
                i === active
                  ? "bg-white text-black"
                  : "bg-white/5 text-white/40 hover:text-white/70 hover:bg-white/10"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div
          key={active}
          className="mt-8"
          style={{
            animation: dur > 0 ? `configFadeIn ${dur}s cubic-bezier(0.16, 1, 0.3, 1) both` : undefined,
          }}
        >
          {tabs[active].content}
        </div>
      </div>

      <style jsx>{`
        @keyframes configFadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </section>
  )
}
