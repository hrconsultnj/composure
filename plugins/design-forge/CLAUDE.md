# Design Forge — Claude Code Plugin for Premium Web Design

## What This Is

A Claude Code plugin that provides production components, reference guides, and design methodology for building premium interactive web experiences. Bridges the gap between basic UI components (shadcn/ui) and bespoke creative sites.

## Project Structure

```
design-forge/
├── .claude-plugin/plugin.json   # Plugin metadata (name, version, skills path)
├── skills/
│   ├── design-forge/
│   │   ├── SKILL.md             # Design skill: triggers, workflow, component catalog
│   │   └── references/          # 7 reference guides (~3,000 lines total)
│   └── ux-researcher/
│       └── SKILL.md             # Research skill: web search, competitor analysis, tech evaluation
├── components/
│   ├── visualizations/canvas/   # GenerativeCanvas, useCanvas, hooks, signal noise
│   ├── visualizations/presets/  # grid-field, particle-system, point-cloud, orbital-ellipses
│   ├── ui/                      # GlassPanel, CustomCursor, ScrollProgress, HoverCardCanvas, SoundLayer
│   ├── effects/                 # Scanlines, Typewriter
│   └── scenes/                  # HeroScene (R3F container with telemetry HUD)
├── hooks/hooks.json             # SessionStart, PreCompact, PreToolUse (canvas guard)
├── commands/
│   ├── design-forge.md          # /design-forge command
│   └── ux-researcher.md         # /ux-researcher command
├── research/                    # Site analyses and extracted patterns
└── examples/                    # Example implementations
```

## Tech Focus Areas

1. **Canvas 2D Generative Art** — Procedural visualizations, particle systems, factory pattern
2. **Animation Systems** — Framer Motion, GSAP ScrollTrigger, CSS keyframes
3. **Three.js / React Three Fiber** — 3D scenes, interactive models, WebGL
4. **Premium Layout** — Glassmorphism, bento grids, Vercel/Geist patterns
5. **Micro-interactions** — Custom cursors, hover effects, sound design
6. **Accessibility** — WCAG 2.1 AA, prefers-reduced-motion, ARIA patterns
7. **Performance** — IntersectionObserver gating, lazy loading, DPR cap

## Rules

- Research before building — analyze reference sites thoroughly
- Performance-first — every animation must be visibility-gated
- Accessibility always — `prefers-reduced-motion` support on everything
- Mobile-first — touch adaptation, coarse pointer detection
- Progressive enhancement — works without JS, gets better with it
- Read component source before adapting — never reconstruct from memory
