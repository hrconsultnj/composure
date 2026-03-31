"use client"

import { useEffect, useRef, useState } from "react"
import { useShowcaseTheme } from "@/lib/theme-provider"

interface ShowcaseProgressProps {
  value: number
  label: string
  color?: string
}

export function ShowcaseProgress({ value, label, color }: ShowcaseProgressProps) {
  const theme = useShowcaseTheme()
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisible(true) },
      { threshold: 0.5 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const barColor = color ?? theme.primary

  return (
    <div ref={ref}>
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-xs" style={{ color: theme.fg, opacity: 0.6 }}>{label}</span>
        <span className="text-xs font-medium tabular-nums" style={{ color: theme.fg, opacity: 0.4 }}>{value}%</span>
      </div>
      <div
        className="h-2 overflow-hidden"
        style={{
          background: theme.muted,
          borderRadius: "9999px",
        }}
      >
        <div
          className="h-full"
          style={{
            width: visible ? `${value}%` : "0%",
            background: `linear-gradient(90deg, ${barColor}, ${barColor}cc)`,
            borderRadius: "9999px",
            transition: `width ${theme.duration * 1.5}s ${theme.easing}`,
          }}
        />
      </div>
    </div>
  )
}
