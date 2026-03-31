"use client"

import { useRef, useState, useEffect } from "react"
import { useShowcaseTheme } from "@/lib/theme-provider"

interface ShowcaseSectionProps {
  title: string
  children: React.ReactNode
  className?: string
}

export function ShowcaseSection({ title, children, className = "" }: ShowcaseSectionProps) {
  const theme = useShowcaseTheme()
  const ref = useRef<HTMLElement>(null)
  const [visible, setVisible] = useState(theme.intensity === "minimal")

  useEffect(() => {
    if (theme.intensity === "minimal") return
    const el = ref.current
    if (!el) return

    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisible(true) },
      { rootMargin: "-60px", threshold: 0.1 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [theme.intensity])

  return (
    <section
      ref={ref}
      className={className}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(24px)",
        transition: `opacity ${theme.duration}s ${theme.easing}, transform ${theme.duration}s ${theme.easing}`,
      }}
    >
      <h3
        className="mb-5 text-xs font-medium uppercase tracking-[0.2em]"
        style={{ color: theme.primary, opacity: 0.7 }}
      >
        {title}
      </h3>
      {children}
    </section>
  )
}
