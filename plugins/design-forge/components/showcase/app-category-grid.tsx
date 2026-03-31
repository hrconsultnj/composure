"use client"

import { useState, type ReactNode } from "react"

interface AppCategory {
  label: string
  heading: string
  description: string
  apps: string[]
  visual: ReactNode
}

interface AppCategoryGridProps {
  sectionLabel?: string
  heading?: string
  description?: string
  categories: AppCategory[]
  intensity?: "minimal" | "gentle" | "moderate" | "expressive"
}

export function AppCategoryGrid({
  sectionLabel = "Apps",
  heading = "Your ambitions. There's an app for that.",
  description,
  categories,
  intensity = "moderate",
}: AppCategoryGridProps) {
  const [active, setActive] = useState(0)
  const dur = intensity === "minimal" ? 0 : intensity === "gentle" ? 0.3 : 0.4

  return (
    <section className="bg-black py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-6">
        <div className="mb-10">
          <p className="font-mono text-[10px] tracking-[0.25em] text-white/25 uppercase">
            {sectionLabel}
          </p>
          <h2 className="mt-3 text-3xl font-bold text-white/90 tracking-tight sm:text-4xl">
            {heading}
          </h2>
          {description && (
            <p className="mt-3 text-sm text-white/40 max-w-xl">{description}</p>
          )}
        </div>

        {/* Category pills — scrollable */}
        <div className="flex gap-2 overflow-x-auto pb-4 scrollbar-none">
          {categories.map((cat, i) => (
            <button
              key={cat.label}
              onClick={() => setActive(i)}
              className={`shrink-0 rounded-full px-4 py-2 text-xs font-medium transition-all ${
                i === active
                  ? "bg-white/10 text-white"
                  : "text-white/30 hover:text-white/60 hover:bg-white/5"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Active category card */}
        <div
          key={active}
          className="mt-6 grid gap-6 lg:grid-cols-2 items-center"
          style={{
            animation: dur > 0 ? `appCatFade ${dur}s cubic-bezier(0.16, 1, 0.3, 1) both` : undefined,
          }}
        >
          {/* Visual */}
          <div className="relative aspect-[16/10] overflow-hidden rounded-xl border border-white/6 bg-white/[0.02]">
            {categories[active].visual}
          </div>

          {/* Text + app list */}
          <div>
            <h3 className="text-xl font-bold text-white/90">
              {categories[active].heading}
            </h3>
            <p className="mt-3 text-sm text-white/40 leading-relaxed">
              {categories[active].description}
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              {categories[active].apps.map((app) => (
                <span
                  key={app}
                  className="rounded-full bg-white/5 px-3 py-1 text-xs text-white/40"
                >
                  {app}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes appCatFade {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </section>
  )
}
