"use client"

import { useShowcaseTheme } from "@/lib/theme-provider"

interface ShowcaseCardProps {
  title: string
  description: string
  value?: string
  label?: string
  children?: React.ReactNode
}

export function ShowcaseCard({ title, description, value, label, children }: ShowcaseCardProps) {
  const theme = useShowcaseTheme()

  return (
    <div
      className="group cursor-default overflow-hidden transition-all"
      style={{
        background: theme.surface,
        borderRadius: theme.radius,
        boxShadow: theme.shadow,
        border: `1px solid ${theme.fg}08`,
        transitionDuration: `${theme.duration * 0.5}s`,
        transitionTimingFunction: theme.easing,
      }}
      onMouseEnter={(e) => {
        const el = e.currentTarget
        el.style.boxShadow = theme.shadowHover
        el.style.transform = "translateY(-2px)"
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget
        el.style.boxShadow = theme.shadow
        el.style.transform = "translateY(0)"
      }}
    >
      <div className="p-5">
        {value && (
          <div
            className="mb-2 text-2xl font-bold tabular-nums"
            style={{ color: theme.primary }}
          >
            {value}
          </div>
        )}
        {label && (
          <div
            className="mb-3 text-[10px] font-medium uppercase tracking-[0.15em]"
            style={{ color: theme.fg, opacity: 0.35 }}
          >
            {label}
          </div>
        )}
        <h4 className="text-sm font-semibold" style={{ color: theme.fg }}>
          {title}
        </h4>
        <p className="mt-1.5 text-xs leading-relaxed" style={{ color: theme.fg, opacity: 0.5 }}>
          {description}
        </p>
        {children}
      </div>
    </div>
  )
}
