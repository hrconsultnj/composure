"use client"

import { useShowcaseTheme } from "@/lib/theme-provider"

interface ShowcaseBadgeProps {
  children: React.ReactNode
  color?: "primary" | "accent" | "muted"
}

export function ShowcaseBadge({ children, color = "primary" }: ShowcaseBadgeProps) {
  const theme = useShowcaseTheme()

  const colorMap = {
    primary: { bg: `${theme.primary}15`, text: theme.primary },
    accent: { bg: `${theme.accent}15`, text: theme.accent },
    muted: { bg: theme.muted, text: theme.fg },
  }

  const { bg, text } = colorMap[color]

  return (
    <span
      className="inline-flex items-center px-2.5 py-1 text-xs font-medium"
      style={{
        background: bg,
        color: text,
        borderRadius: `calc(${theme.radius} * 0.6)`,
      }}
    >
      {children}
    </span>
  )
}
