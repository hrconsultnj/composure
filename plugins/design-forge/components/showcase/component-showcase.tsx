"use client"

import { useShowcaseTheme } from "@/lib/theme-provider"
import { ShowcaseSection } from "./showcase-section"
import { ShowcaseButton } from "./showcase-button"
import { ShowcaseCard } from "./showcase-card"
import { ShowcaseCounter } from "./showcase-counter"
import { ShowcaseBadge } from "./showcase-badge"
import { ShowcaseProgress } from "./showcase-progress"

export function ComponentShowcase() {
  const theme = useShowcaseTheme()

  return (
    <div
      className="space-y-16 px-6 pb-20"
      style={{ color: theme.fg }}
    >
      {/* Hero Banner */}
      <ShowcaseSection title="Hero">
        <div className="space-y-5">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Build something beautiful
          </h2>
          <p className="max-w-lg text-sm leading-relaxed" style={{ opacity: 0.5 }}>
            A complete design system tailored for {theme.label.toLowerCase()} applications.
            Every component adapts to the context.
          </p>
          <div className="flex flex-wrap gap-3">
            <ShowcaseButton variant="primary" size="lg">Get Started</ShowcaseButton>
            <ShowcaseButton variant="outline" size="lg">Learn More</ShowcaseButton>
          </div>
        </div>
      </ShowcaseSection>

      {/* Button Gallery */}
      <ShowcaseSection title="Buttons">
        <div className="flex flex-wrap items-center gap-3">
          <ShowcaseButton variant="primary">Primary</ShowcaseButton>
          <ShowcaseButton variant="secondary">Secondary</ShowcaseButton>
          <ShowcaseButton variant="outline">Outline</ShowcaseButton>
          <ShowcaseButton variant="ghost">Ghost</ShowcaseButton>
          <ShowcaseButton variant="accent">Accent</ShowcaseButton>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <ShowcaseButton variant="primary" size="sm">Small</ShowcaseButton>
          <ShowcaseButton variant="primary" size="md">Medium</ShowcaseButton>
          <ShowcaseButton variant="primary" size="lg">Large</ShowcaseButton>
        </div>
      </ShowcaseSection>

      {/* Card Grid */}
      <ShowcaseSection title="Cards">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <ShowcaseCard
            title="Active Users"
            description="Real-time count of users currently online in the platform."
            value="2,847"
            label="Live"
          />
          <ShowcaseCard
            title="Revenue"
            description="Monthly recurring revenue from all active subscriptions."
            value="$48.2K"
            label="This Month"
          />
          <ShowcaseCard
            title="Completion Rate"
            description="Percentage of users who completed their primary goal."
            value="94.6%"
            label="30-Day Average"
          />
        </div>
      </ShowcaseSection>

      {/* Stats Row */}
      <ShowcaseSection title="Animated Counters">
        <div
          className="grid grid-cols-2 gap-6 p-6 sm:grid-cols-4"
          style={{
            background: theme.surface,
            borderRadius: theme.radius,
            boxShadow: theme.shadow,
            border: `1px solid ${theme.fg}08`,
          }}
        >
          <ShowcaseCounter target={2847} suffix="+" label="Active Users" />
          <ShowcaseCounter target={99} suffix="%" label="Uptime" />
          <ShowcaseCounter target={48200} prefix="$" label="Revenue" />
          <ShowcaseCounter target={156} label="Countries" />
        </div>
      </ShowcaseSection>

      {/* Badges */}
      <ShowcaseSection title="Badges">
        <div className="flex flex-wrap gap-2">
          <ShowcaseBadge color="primary">Active</ShowcaseBadge>
          <ShowcaseBadge color="accent">Featured</ShowcaseBadge>
          <ShowcaseBadge color="muted">Draft</ShowcaseBadge>
          <ShowcaseBadge color="primary">v2.1.0</ShowcaseBadge>
          <ShowcaseBadge color="accent">New</ShowcaseBadge>
        </div>
      </ShowcaseSection>

      {/* Progress Bars */}
      <ShowcaseSection title="Progress">
        <div
          className="space-y-5 p-6"
          style={{
            background: theme.surface,
            borderRadius: theme.radius,
            border: `1px solid ${theme.fg}08`,
          }}
        >
          <ShowcaseProgress value={78} label="Project Completion" />
          <ShowcaseProgress value={94} label="Performance Score" color={theme.accent} />
          <ShowcaseProgress value={45} label="Storage Used" />
        </div>
      </ShowcaseSection>

      {/* Typography Preview */}
      <ShowcaseSection title="Typography">
        <div
          className="space-y-4 p-6"
          style={{
            background: theme.surface,
            borderRadius: theme.radius,
            border: `1px solid ${theme.fg}08`,
          }}
        >
          <h1 className="text-3xl font-bold tracking-tight">Heading 1</h1>
          <h2 className="text-2xl font-semibold tracking-tight">Heading 2</h2>
          <h3 className="text-xl font-semibold">Heading 3</h3>
          <h4 className="text-lg font-medium">Heading 4</h4>
          <p className="text-sm leading-relaxed" style={{ opacity: 0.6 }}>
            Body text — The quick brown fox jumps over the lazy dog. This is how paragraph text
            renders in this context with the appropriate line height and color opacity.
          </p>
          <p className="font-mono text-xs" style={{ opacity: 0.35 }}>
            MONO · Tabular numbers: 1,234,567.89 · Labels and metadata
          </p>
        </div>
      </ShowcaseSection>

      {/* Depth Demo */}
      <ShowcaseSection title="Elevation Levels">
        <div className="flex flex-wrap gap-4">
          {[1, 2, 3, 4, 5].map((level) => {
            const shadows = [
              "0 1px 2px rgba(0,0,0,0.04)",
              "0 2px 4px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.06)",
              "0 4px 8px rgba(0,0,0,0.04), 0 2px 4px rgba(0,0,0,0.06)",
              "0 8px 16px rgba(0,0,0,0.06), 0 4px 8px rgba(0,0,0,0.04)",
              "0 16px 32px rgba(0,0,0,0.08), 0 8px 16px rgba(0,0,0,0.04)",
            ]
            return (
              <div
                key={level}
                className="flex h-20 w-20 items-center justify-center text-xs font-mono"
                style={{
                  background: theme.surface,
                  borderRadius: theme.radius,
                  boxShadow: theme.intensity === "minimal" ? shadows[0] : shadows[level - 1],
                  color: theme.fg,
                  opacity: 0.5,
                }}
              >
                L{level}
              </div>
            )
          })}
        </div>
      </ShowcaseSection>

      {/* Do / Don't */}
      <ShowcaseSection title="Guidelines">
        <div className="grid gap-6 sm:grid-cols-2">
          <div
            className="space-y-3 p-5"
            style={{
              background: theme.surface,
              borderRadius: theme.radius,
              borderLeft: `3px solid #10B981`,
            }}
          >
            <h4 className="text-xs font-medium uppercase tracking-wider" style={{ color: "#10B981" }}>Do</h4>
            <ul className="space-y-1.5">
              {theme.doList.map((item) => (
                <li key={item} className="flex items-start gap-2 text-xs" style={{ opacity: 0.6 }}>
                  <span style={{ color: "#10B981" }}>+</span>{item}
                </li>
              ))}
            </ul>
          </div>
          <div
            className="space-y-3 p-5"
            style={{
              background: theme.surface,
              borderRadius: theme.radius,
              borderLeft: `3px solid #EF4444`,
            }}
          >
            <h4 className="text-xs font-medium uppercase tracking-wider" style={{ color: "#EF4444" }}>Don&apos;t</h4>
            <ul className="space-y-1.5">
              {theme.dontList.map((item) => (
                <li key={item} className="flex items-start gap-2 text-xs" style={{ opacity: 0.6 }}>
                  <span style={{ color: "#EF4444" }}>−</span>{item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </ShowcaseSection>

      {/* Theme metadata */}
      <div
        className="mt-8 flex flex-wrap items-center gap-4 text-[10px] font-mono"
        style={{ color: theme.fg, opacity: 0.2 }}
      >
        <span>radius: {theme.radius}</span>
        <span>·</span>
        <span>intensity: {theme.intensity}</span>
        <span>·</span>
        <span>duration: {theme.duration}s</span>
        <span>·</span>
        <span>stagger: {theme.stagger}s</span>
      </div>
    </div>
  )
}
