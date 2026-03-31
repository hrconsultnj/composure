"use client"

import { useShowcaseTheme } from "@/lib/theme-provider"

interface ShowcaseButtonProps {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "accent"
  size?: "sm" | "md" | "lg"
  children: React.ReactNode
}

export function ShowcaseButton({ variant = "primary", size = "md", children }: ShowcaseButtonProps) {
  const theme = useShowcaseTheme()

  const sizes = {
    sm: "px-3 py-1.5 text-xs",
    md: "px-5 py-2.5 text-sm",
    lg: "px-7 py-3 text-base",
  }

  const base = `inline-flex items-center justify-center font-medium transition-all ${sizes[size]}`

  const styles: Record<string, React.CSSProperties> = {
    primary: {
      background: `linear-gradient(to bottom, ${theme.primary}, ${theme.primary}dd)`,
      color: theme.primaryFg,
      borderRadius: theme.radius,
      boxShadow: `0 4px 12px ${theme.primary}30`,
    },
    secondary: {
      background: theme.muted,
      color: theme.fg,
      borderRadius: theme.radius,
    },
    outline: {
      background: "transparent",
      color: theme.fg,
      borderRadius: theme.radius,
      border: `1px solid ${theme.fg}20`,
    },
    ghost: {
      background: "transparent",
      color: theme.fg,
      borderRadius: theme.radius,
    },
    accent: {
      background: `linear-gradient(to bottom, ${theme.accent}, ${theme.accent}dd)`,
      color: "#FFFFFF",
      borderRadius: theme.radius,
      boxShadow: `0 4px 12px ${theme.accent}30`,
    },
  }

  return (
    <button
      className={`${base} hover:-translate-y-0.5 active:translate-y-0.5`}
      style={{
        ...styles[variant],
        transitionDuration: `${theme.duration * 0.4}s`,
        transitionTimingFunction: theme.easing,
      }}
    >
      {children}
    </button>
  )
}
