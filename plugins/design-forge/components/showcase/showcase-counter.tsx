"use client"

import { useEffect, useRef, useState } from "react"
import { useShowcaseTheme } from "@/lib/theme-provider"

interface ShowcaseCounterProps {
  target: number
  suffix?: string
  prefix?: string
  label: string
}

export function ShowcaseCounter({ target, suffix = "", prefix = "", label }: ShowcaseCounterProps) {
  const theme = useShowcaseTheme()
  const ref = useRef<HTMLSpanElement>(null)
  const [triggered, setTriggered] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setTriggered(true) },
      { rootMargin: "-40px", threshold: 0.5 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (!triggered || !ref.current) return

    const duration = theme.duration * 2000 // ms, scale up for counters
    const start = performance.now()

    function step(now: number) {
      const elapsed = now - start
      const progress = Math.min(elapsed / duration, 1)
      // ease-out quad
      const eased = 1 - (1 - progress) * (1 - progress)
      const value = Math.round(eased * target)

      if (ref.current) {
        ref.current.textContent = `${prefix}${value.toLocaleString()}${suffix}`
      }

      if (progress < 1) requestAnimationFrame(step)
    }

    requestAnimationFrame(step)
  }, [triggered, target, prefix, suffix, theme.duration])

  return (
    <div className="text-center">
      <span
        ref={ref}
        className="block text-3xl font-bold tabular-nums"
        style={{ color: theme.primary }}
      >
        {prefix}0{suffix}
      </span>
      <span
        className="mt-1 block text-xs"
        style={{ color: theme.fg, opacity: 0.4 }}
      >
        {label}
      </span>
    </div>
  )
}
