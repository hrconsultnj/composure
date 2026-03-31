"use client"

import { useState, useRef, useEffect, useCallback } from "react"

interface ChipSpec {
  name: string
  cores: string
  gpu: string
  memory: string
  tagline: string
  color: string
}

interface ChipExplorePillProps {
  label?: string
  chips?: ChipSpec[]
  compareLabel?: string
}

const DEFAULT_CHIPS: ChipSpec[] = [
  { name: "M5", cores: "10-core CPU", gpu: "10-core GPU", memory: "Up to 32GB", tagline: "Great everyday performance", color: "#6366F1" },
  { name: "M5 Pro", cores: "12-core CPU", gpu: "18-core GPU", memory: "Up to 48GB", tagline: "Pro-level performance and capability", color: "#3B82F6" },
  { name: "M5 Max", cores: "16-core CPU", gpu: "40-core GPU", memory: "Up to 128GB", tagline: "Most powerful chip for a laptop", color: "#8B5CF6" },
]

export function ChipExplorePill({
  label = "Explore the M5 family of chips",
  chips = DEFAULT_CHIPS,
  compareLabel = "Compare all chips",
}: ChipExplorePillProps) {
  const [open, setOpen] = useState(false)

  // Scroll-driven pill visibility lifecycle:
  // Phase 1: hidden (above trigger zone)
  // Phase 2: fade in + float up (entering trigger zone)
  // Phase 3: fixed at bottom of viewport (scrolling through content)
  // Phase 4: fade out (past the end zone)
  const containerRef = useRef<HTMLDivElement>(null)
  const [pillState, setPillState] = useState<"hidden" | "entering" | "fixed" | "exiting" | "gone">("hidden")

  const updatePillState = useCallback(() => {
    const container = containerRef.current
    if (!container) return

    const rect = container.getBoundingClientRect()
    const vh = window.innerHeight

    // Container top relative to viewport
    if (rect.top > vh * 0.6) {
      // Container hasn't been scrolled to yet
      setPillState("hidden")
    } else if (rect.top > vh * 0.2) {
      // Entering — fade in zone
      setPillState("entering")
    } else if (rect.bottom > vh * 0.3) {
      // Fixed zone — container is in view, pill sticks
      setPillState("fixed")
    } else if (rect.bottom > 0) {
      // Exiting — scrolling past
      setPillState("exiting")
    } else {
      setPillState("gone")
    }
  }, [])

  useEffect(() => {
    updatePillState()
    window.addEventListener("scroll", updatePillState, { passive: true })
    return () => window.removeEventListener("scroll", updatePillState)
  }, [updatePillState])

  const pillVisible = pillState === "entering" || pillState === "fixed"
  const pillFixed = pillState === "fixed"

  return (
    <div ref={containerRef} className="relative" style={{ minHeight: open ? "auto" : "40vh" }}>
      {/* Fixed pill — positioned relative to viewport when in fixed state */}
      <div
        className={pillFixed ? "fixed bottom-8 left-0 right-0 z-40" : "relative z-40"}
        style={{
          display: pillState === "gone" ? "none" : undefined,
        }}
      >
        <div
          className="flex justify-center"
          style={{
            opacity: pillVisible ? 1 : 0,
            transform: pillVisible ? "translateY(0)" : "translateY(24px)",
            transition: "opacity 0.6s cubic-bezier(0.16, 1, 0.3, 1), transform 0.6s cubic-bezier(0.16, 1, 0.3, 1)",
            pointerEvents: pillVisible ? "auto" : "none",
          }}
        >
          <button
            onClick={() => setOpen(!open)}
            className="group relative inline-flex items-center gap-2.5 rounded-full border border-white/12 bg-black/80 backdrop-blur-2xl px-6 py-3 text-sm font-medium text-white/80 shadow-[0_8px_32px_rgba(0,0,0,0.5)] transition-all hover:border-white/20 hover:bg-black/90 hover:text-white"
          >
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-400 opacity-40" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-blue-500" />
            </span>
            {label}
            <svg
              className={`h-3.5 w-3.5 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
              fill="none" viewBox="0 0 24 24" stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>
      </div>

      {/* Popover — always in flow, expands below */}
      <div
        className="overflow-hidden transition-all duration-500 ease-out"
        style={{ maxHeight: open ? "700px" : "0", opacity: open ? 1 : 0 }}
      >
        <div className="mx-auto max-w-4xl px-6 pt-6 pb-16">
          <div className="mb-8 text-center">
            <p className="font-mono text-[10px] tracking-[0.2em] text-white/25 uppercase">
              Three chips. Second to none.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            {chips.map((chip) => (
              <div
                key={chip.name}
                className="group relative overflow-hidden rounded-2xl border border-white/8 bg-white/[0.03] p-6 transition-all hover:border-white/15 hover:bg-white/[0.06]"
              >
                <div
                  className="absolute -top-12 -right-12 h-32 w-32 rounded-full opacity-10 blur-3xl transition-opacity group-hover:opacity-20"
                  style={{ background: chip.color }}
                />
                <div className="relative space-y-4">
                  <div
                    className="inline-flex h-10 w-10 items-center justify-center rounded-xl"
                    style={{ background: `${chip.color}15` }}
                  >
                    <div className="h-5 w-5 rounded-md" style={{ background: `${chip.color}60` }} />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white/90">{chip.name}</h3>
                    <p className="mt-1 text-xs text-white/35">{chip.tagline}</p>
                  </div>
                  <div className="space-y-2 pt-2 border-t border-white/5">
                    {[
                      ["CPU", chip.cores],
                      ["GPU", chip.gpu],
                      ["Memory", chip.memory],
                    ].map(([k, v]) => (
                      <div key={k} className="flex justify-between text-xs">
                        <span className="text-white/30">{k}</span>
                        <span className="text-white/60 font-medium">{v}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 text-center">
            <span className="inline-flex items-center gap-1 text-sm text-blue-400 hover:text-blue-300 cursor-pointer transition-colors">
              {compareLabel}
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
