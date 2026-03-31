"use client"

import { useRef, useState, useEffect, type ReactNode } from "react"

interface DisplaySpec {
  value: string
  label: string
}

interface DisplayFeatureCard {
  heading: string
  description: string
  /** Visual content rendered inside the card */
  visual?: ReactNode
}

interface DisplayShowcaseProps {
  heading?: string
  tagline?: string
  description?: string
  specs?: DisplaySpec[]
  featureCards?: DisplayFeatureCard[]
  intensity?: "minimal" | "gentle" | "moderate" | "expressive"
}

const DEFAULT_SPECS: DisplaySpec[] = [
  { value: "1600", label: "nits peak HDR brightness" },
  { value: "1000", label: "nits sustained SDR outdoors" },
  { value: "1,000,000:1", label: "contrast ratio" },
  { value: "1 nit", label: "in dark environments" },
  { value: "120Hz", label: "ProMotion adaptive refresh" },
  { value: "1 billion", label: "colors" },
]

const DEFAULT_FEATURE_CARDS: DisplayFeatureCard[] = [
  {
    heading: "Nano-texture display. Fewer reflections. More clarity.",
    description: "For those who work in particularly bright spaces — whether inside or out — the nano-texture option reduces reflections to eliminate distractions while maintaining an excellent viewing experience.",
  },
  {
    heading: "Exceptional contrast with Extreme Dynamic Range.",
    description: "MacBook Pro can maintain extreme brightness for HDR content, delivering outstanding contrast between the brightest brights and the blackest blacks.",
  },
  {
    heading: "ProMotion. A smooth operator.",
    description: "ProMotion makes everything from scrolling to gaming superfluid and responsive, automatically adjusting to match the movement of content — with refresh rates up to 120Hz.",
  },
  {
    heading: "Multiple displays. Why limit yourself to one?",
    description: "Connect up to two external displays with M5, three with M5 Pro, or four with M5 Max. Works beautifully with Apple Studio Display.",
  },
]

const TIMING: Record<string, { duration: number; stagger: number }> = {
  minimal: { duration: 0, stagger: 0 },
  gentle: { duration: 0.5, stagger: 0.06 },
  moderate: { duration: 0.6, stagger: 0.08 },
  expressive: { duration: 0.8, stagger: 0.12 },
}

/** Hook for scroll-triggered visibility */
function useScrollReveal(opts: { disabled?: boolean; rootMargin?: string } = {}) {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(opts.disabled ?? false)

  useEffect(() => {
    if (opts.disabled) return
    const el = ref.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisible(true) },
      { rootMargin: opts.rootMargin ?? "-80px", threshold: 0.1 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [opts.disabled, opts.rootMargin])

  return { ref, visible }
}

export function DisplayShowcase({
  heading = "Display",
  tagline = "Let there be delight.",
  description = "Go from the sunniest terrace to the darkest studio with more ease than ever. The eye-popping Liquid Retina XDR display offers 1600 nits peak HDR brightness. And it provides up to 1000 nits of brightness for SDR content in bright light so you can see what's on your screen more clearly outside. In low-light situations, it dims to 1 nit so you can work comfortably in darker spaces.",
  specs = DEFAULT_SPECS,
  featureCards = DEFAULT_FEATURE_CARDS,
  intensity = "expressive",
}: DisplayShowcaseProps) {
  const isMinimal = intensity === "minimal"
  const t = TIMING[intensity]
  const header = useScrollReveal({ disabled: isMinimal })
  const hero = useScrollReveal({ disabled: isMinimal })
  const cards = useScrollReveal({ disabled: isMinimal, rootMargin: "-40px" })

  return (
    <section className="relative overflow-hidden bg-black">
      {/* ── Header + Specs ── */}
      <div ref={header.ref} className="py-24 sm:py-32">
        <div className="mx-auto max-w-4xl px-6 text-center">
          <p
            className="font-mono text-[10px] tracking-[0.25em] text-white/25 uppercase"
            style={{
              opacity: header.visible ? 1 : 0,
              transform: header.visible ? "translateY(0)" : "translateY(12px)",
              transition: `all ${t.duration}s cubic-bezier(0.16, 1, 0.3, 1)`,
            }}
          >
            {heading}
          </p>
          <h2
            className="mt-4 text-4xl font-bold tracking-tight text-white/90 sm:text-5xl lg:text-6xl"
            style={{
              opacity: header.visible ? 1 : 0,
              transform: header.visible ? "translateY(0)" : "translateY(20px)",
              transition: `all ${t.duration}s cubic-bezier(0.16, 1, 0.3, 1)`,
              transitionDelay: `${t.stagger}s`,
            }}
          >
            {tagline}
          </h2>
        </div>

        {/* Spec lines — stagger reveal */}
        <div className="mx-auto mt-14 max-w-4xl px-6">
          <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-6">
            {specs.map((spec, i) => (
              <div
                key={spec.label}
                className="text-center"
                style={{
                  opacity: header.visible ? 1 : 0,
                  transform: header.visible ? "translateY(0)" : "translateY(16px)",
                  transition: `all ${t.duration}s cubic-bezier(0.16, 1, 0.3, 1)`,
                  transitionDelay: `${t.stagger * (i + 2)}s`,
                }}
              >
                <div className="text-2xl font-bold text-white/90 tabular-nums sm:text-3xl">
                  {spec.value}
                </div>
                <div className="mt-1.5 text-[11px] text-white/30 leading-tight">
                  {spec.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Hero Display Visual ── */}
      <div ref={hero.ref} className="relative">
        <div
          className="relative mx-auto max-w-6xl px-4 sm:px-6"
          style={{
            opacity: hero.visible ? 1 : 0,
            transform: hero.visible ? "translateY(0) scale(1)" : "translateY(40px) scale(0.96)",
            transition: `all ${t.duration * 1.4}s cubic-bezier(0.16, 1, 0.3, 1)`,
          }}
        >
          <div className="relative overflow-hidden rounded-2xl border border-white/6 shadow-2xl">
            {/* Screen bezel */}
            <div className="bg-[#080808] p-1.5 sm:p-2.5">
              {/* Notch */}
              <div className="absolute top-0 left-1/2 z-10 -translate-x-1/2 h-4 w-20 rounded-b-xl bg-[#080808]" />

              {/* Screen — vibrant HDR scene */}
              <div className="relative aspect-[16/10] overflow-hidden rounded-lg">
                {/* Base gradient — concert/party scene feel */}
                <div className="absolute inset-0 bg-gradient-to-br from-fuchsia-600 via-violet-600 to-cyan-500" />
                <div className="absolute inset-0 bg-gradient-to-tl from-amber-500/50 via-transparent to-transparent" />
                <div className="absolute inset-0 bg-gradient-to-bl from-transparent via-transparent to-emerald-500/30" />

                {/* Light bursts — simulating HDR peaks */}
                <div className="absolute top-[20%] left-[30%] h-80 w-80 rounded-full bg-white/15 blur-[80px] animate-pulse" style={{ animationDuration: "4s" }} />
                <div className="absolute bottom-[25%] right-[20%] h-56 w-56 rounded-full bg-yellow-200/20 blur-[60px] animate-pulse" style={{ animationDuration: "5s", animationDelay: "1s" }} />
                <div className="absolute top-[40%] right-[35%] h-40 w-40 rounded-full bg-pink-300/15 blur-[50px] animate-pulse" style={{ animationDuration: "6s", animationDelay: "2s" }} />

                {/* Central bright spot — peak brightness demo */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="h-40 w-40 rounded-full bg-white/25 blur-[40px]" />
                </div>

                {/* Vignette for depth */}
                <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.5) 100%)" }} />

                {/* Simulated crowd silhouettes at bottom */}
                <div className="absolute bottom-0 inset-x-0 h-1/4 bg-gradient-to-t from-black/70 to-transparent" />
                <div className="absolute bottom-0 inset-x-0 flex justify-center gap-0">
                  {[6.3,7.1,5.9,6.7,7.4,6.1,5.5,7.8,6.4,5.8,6.9,7.2,5.7,6.6,7.0,6.2,7.5,5.6,6.8,7.3].map((w, i) => (
                    <div
                      key={i}
                      className="rounded-t-full bg-black/60"
                      style={{
                        width: `${w}%`,
                        height: `${10 + (i % 7) * 1.5}%`,
                        marginLeft: `-${1.2 + (i % 5) * 0.4}%`,
                      }}
                    />
                  ))}
                </div>

                {/* XDR badge */}
                <div className="absolute bottom-4 right-4 z-10 rounded-md bg-black/50 backdrop-blur-sm px-3 py-1.5">
                  <span className="font-mono text-[10px] font-medium tracking-widest text-white/70 uppercase">
                    Liquid Retina XDR
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Ambient glow beneath display */}
          <div className="absolute -inset-32 -z-10" style={{ background: "radial-gradient(ellipse at 50% 60%, rgba(139,92,246,0.08), rgba(236,72,153,0.04) 40%, transparent 70%)" }} />
        </div>

        {/* Description */}
        <div className="mx-auto mt-14 max-w-2xl px-6">
          <p
            className="text-center text-sm leading-relaxed text-white/40"
            style={{
              opacity: hero.visible ? 1 : 0,
              transform: hero.visible ? "translateY(0)" : "translateY(12px)",
              transition: `all ${t.duration}s cubic-bezier(0.16, 1, 0.3, 1)`,
              transitionDelay: `${t.stagger * 3}s`,
            }}
          >
            {description}
          </p>
        </div>
      </div>

      {/* ── Feature Cards ── */}
      <div ref={cards.ref} className="mx-auto max-w-5xl px-6 py-20 sm:py-28">
        <div className="grid gap-6 sm:grid-cols-2">
          {featureCards.map((card, i) => (
            <div
              key={card.heading}
              className="group relative overflow-hidden rounded-2xl border border-white/6 bg-white/[0.02] transition-all hover:border-white/12 hover:bg-white/[0.04]"
              style={{
                opacity: cards.visible ? 1 : 0,
                transform: cards.visible ? "translateY(0)" : "translateY(24px)",
                transition: `all ${t.duration}s cubic-bezier(0.16, 1, 0.3, 1)`,
                transitionDelay: `${t.stagger * (i + 1)}s`,
              }}
            >
              {/* Card visual area */}
              <div className="relative aspect-[16/9] overflow-hidden">
                {card.visual ?? (
                  <div className="absolute inset-0">
                    {/* Default gradient visuals per card type */}
                    {i === 0 && (
                      <>
                        {/* Nano-texture — outdoor scene with glare reduction */}
                        <div className="absolute inset-0 bg-gradient-to-br from-sky-400/20 via-amber-200/10 to-emerald-300/10" />
                        <div className="absolute top-4 right-4 h-32 w-32 rounded-full bg-white/30 blur-3xl" />
                        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/30" />
                        <div className="absolute bottom-4 left-4 font-mono text-[9px] text-white/30 uppercase tracking-wider">Anti-reflective coating</div>
                      </>
                    )}
                    {i === 1 && (
                      <>
                        {/* Extreme Dynamic Range — bright/dark split */}
                        <div className="absolute inset-0 flex">
                          <div className="flex-1 bg-gradient-to-b from-amber-300/40 to-white/20" />
                          <div className="flex-1 bg-gradient-to-b from-slate-950 to-black" />
                        </div>
                        <div className="absolute inset-0 flex items-center justify-center gap-6">
                          <span className="text-[10px] font-mono text-white/50">BRIGHT</span>
                          <div className="h-8 w-px bg-white/10" />
                          <span className="text-[10px] font-mono text-white/50">DARK</span>
                        </div>
                      </>
                    )}
                    {i === 2 && (
                      <>
                        {/* ProMotion — motion blur lines */}
                        <div className="absolute inset-0 bg-gradient-to-r from-violet-600/15 to-blue-600/15" />
                        {Array.from({ length: 6 }).map((_, j) => (
                          <div
                            key={j}
                            className="absolute h-px bg-gradient-to-r from-transparent via-white/15 to-transparent"
                            style={{
                              top: `${20 + j * 12}%`,
                              left: "10%",
                              right: "10%",
                              transform: `scaleX(${0.4 + j * 0.1})`,
                            }}
                          />
                        ))}
                        <div className="absolute bottom-4 right-4 font-mono text-[10px] text-white/25">120Hz</div>
                      </>
                    )}
                    {i === 3 && (
                      <>
                        {/* Multiple displays — grid of screens */}
                        <div className="absolute inset-0 bg-slate-950/80" />
                        <div className="absolute inset-0 flex items-center justify-center gap-3 px-8">
                          {[1, 2, 3].map((n) => (
                            <div key={n} className="flex-1 aspect-[16/10] rounded-sm border border-white/10 bg-gradient-to-br from-indigo-500/10 to-violet-500/10" />
                          ))}
                        </div>
                        <div className="absolute bottom-4 left-4 font-mono text-[9px] text-white/25 uppercase tracking-wider">Up to 4 external displays</div>
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* Card text */}
              <div className="p-6">
                <h3 className="text-sm font-semibold text-white/80 leading-snug">
                  {card.heading}
                </h3>
                <p className="mt-2 text-xs text-white/35 leading-relaxed">
                  {card.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
