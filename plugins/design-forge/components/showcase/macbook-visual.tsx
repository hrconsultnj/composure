"use client"

/** CSS-only MacBook Pro silhouette — no images, pure CSS gradients and shapes */
export function MacBookVisual() {
  return (
    <div className="relative mx-auto max-w-2xl">
      {/* Screen */}
      <div className="relative aspect-[16/10] overflow-hidden rounded-t-xl border border-white/10 bg-gradient-to-br from-slate-900 via-[#0a0a1a] to-slate-950">
        {/* Screen content — gradient wallpaper */}
        <div className="absolute inset-2 rounded-lg overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-600/30 via-purple-600/20 to-pink-600/10" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
          {/* Dock mockup */}
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 rounded-xl bg-white/5 backdrop-blur-sm px-3 py-1.5">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-3 w-3 rounded-[3px] bg-white/15" />
            ))}
          </div>
          {/* Menu bar */}
          <div className="absolute top-0 inset-x-0 h-5 bg-black/30 backdrop-blur-sm flex items-center px-3">
            <div className="flex gap-1.5">
              <div className="h-1.5 w-1.5 rounded-full bg-white/20" />
              <div className="h-1.5 w-1.5 rounded-full bg-white/15" />
              <div className="h-1.5 w-1.5 rounded-full bg-white/15" />
            </div>
            <div className="flex-1" />
            <div className="flex gap-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-1 w-4 rounded-full bg-white/10" />
              ))}
            </div>
          </div>
          {/* Notch */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 h-4 w-20 rounded-b-lg bg-black" />
        </div>
      </div>
      {/* Hinge */}
      <div className="h-1 bg-gradient-to-b from-[#2a2a2e] to-[#1a1a1e] rounded-b-sm" />
      {/* Base/keyboard */}
      <div className="h-2.5 bg-gradient-to-b from-[#1e1e22] to-[#141418] rounded-b-lg mx-4" />
      {/* Bottom edge */}
      <div className="h-0.5 bg-[#0e0e12] rounded-b-xl mx-8" />

      {/* Ambient glow */}
      <div className="absolute -inset-16 -z-10 bg-radial from-indigo-500/5 to-transparent opacity-60" />
    </div>
  )
}
