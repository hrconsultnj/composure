# Design Forge

A Claude Code plugin for building premium interactive web experiences. Provides production-ready components, design patterns, and methodology for canvas visualizations, animations, 3D, glassmorphism, micro-interactions, and accessibility.

## Live Showcase

See the components in action at the showcase gallery — a Next.js 16 app built with Design Forge's own patterns:

```bash
git clone https://github.com/hrconsultnj/design-forge.git
cd design-forge
pnpm install && pnpm dev
```

Open [localhost:3000](http://localhost:3000) to explore the gallery.

## Installation

### From marketplace (recommended)

Inside Claude Code, run:

```
/plugin marketplace add hrconsultnj/design-forge
/plugin install design-forge@design-forge
```

### From local path

```bash
# Clone the repo
git clone https://github.com/hrconsultnj/design-forge.git
```

Then inside Claude Code:

```
/plugin marketplace add ./design-forge
/plugin install design-forge@design-forge
```

### Update

```
/plugin marketplace update design-forge
```

## What's Included

### 33 Production Components

| Category | Components |
|----------|-----------|
| **Canvas** | `GenerativeCanvas`, `useCanvas`, 4 presets (grid-field, orbital-ellipses, point-cloud, particle-system) |
| **UI** | `GlassPanel`, `ScrollProgress`, `CustomCursor`, `HoverCardCanvas`, `useSoundLayer`, `useNavbarCompact` |
| **Effects** | `Scanlines`, `Typewriter` |
| **Scenes** | `HeroScene` (Three.js/R3F container with telemetry HUD) |

### 10 Reference Guides

| Guide | Lines | Covers |
|-------|-------|--------|
| `nextjs-conf-patterns.md` | 1,887 | Geist design system, color scales, typography, hero patterns, bento grids, buttons, gradients, animations, dark/light mode |
| `animation-recipes.md` | ~275 | Framer Motion (page transitions, stagger, viewport), GSAP basics (parallax, pin, timeline), SVG animations, library comparison |
| `gsap-framework-patterns.md` | ~410 | React (useGSAP hook, contextSafe, SSR), Vue 3 (Composition API), Svelte (onMount), easing reference, matchMedia, performance |
| `gsap-plugins.md` | ~370 | SplitText, ScrambleText, DrawSVG, MorphSVG, Flip, Draggable, Observer, MotionPath, ScrollTo, ScrollSmoother |
| `gsap-scrolltrigger-advanced.md` | ~345 | batch(), snap, horizontal galleries (containerAnimation), gsap.utils, refresh/resize, debugging |
| `3d-integration.md` | ~200 | Three.js/R3F, Spline, Blender MCP, GLTF loading, LOD, dispose patterns |
| `design-patterns.md` | ~295 | CSS recipes, glassmorphism, bento grids, container queries, performance assets, color palettes, typography |
| `micro-interactions.md` | ~185 | Haptic feedback, sound effects, hover escalation, scroll reveals |
| `accessibility.md` | ~165 | WCAG 2.1 AA checklist, motion accessibility, ARIA patterns, testing checklist |
| `canvas-system.md` | ~140 | Canvas architecture, factory pattern, signal noise, custom draw functions |

### Hooks

| Hook | Type | Purpose |
|------|------|---------|
| **SessionStart** | command | Announces available components and guides |
| **PreCompact** | command | Preserves component awareness across context compression |
| **PreToolUse** | prompt | Canvas animation guard — verifies IntersectionObserver, reduced motion, DPR cap |

### Command

```
/design-forge [pattern-name]
```

Browse the component catalog or get integration guidance for a specific pattern.

## Quick Start

Once installed, Design Forge activates automatically. Ask for any premium design element:

- "Add a generative canvas background"
- "Build a glassmorphism panel"
- "Add Framer Motion page transitions"
- "Create a Three.js hero scene"
- "Add scroll-driven parallax with GSAP"
- "Design a landing page with Next.js Conf patterns"
- "Add a custom cursor"
- "Implement sound design"

Design Forge reads the source component, adapts it to your project's framework and theme, and ensures performance (visibility gating, DPR cap) and accessibility (reduced motion, ARIA labels).

## Design Workflow

1. **Understand** — Goal, devices, performance budget, accessibility requirements
2. **Choose tools** — CSS (static) / Framer Motion (interactive) / GSAP (scroll) / Three.js (3D) / Canvas (generative)
3. **Read components** — Check if Design Forge already has what you need
4. **Build progressively** — HTML > responsive > a11y > CSS > JS > animations > 3D
5. **Optimize** — Lighthouse > 90, 60fps, reduced motion support

## Tool Selection

| Tool | Use Case | Install |
|------|----------|---------|
| CSS + Tailwind | Static designs, basic transitions | Built-in |
| Framer Motion | Page transitions, stagger, hover | `pnpm add framer-motion` |
| GSAP | Scroll parallax, timelines, plugins | `pnpm add gsap` |
| Three.js / R3F | 3D scenes, WebGL | `pnpm add three @react-three/fiber @react-three/drei` |
| Spline | Quick 3D prototypes | `pnpm add @splinetool/react-spline` |
| Canvas 2D | Generative art, particles | Built-in (Design Forge presets) |

## Project Structure

```
design-forge/
├── .claude-plugin/
│   ├── plugin.json              # Plugin metadata (name, version, skills path)
│   └── marketplace.json         # Marketplace registry entry
├── skills/
│   └── design-forge/
│       ├── SKILL.md             # Main skill (triggers, workflow, component catalog)
│       └── references/          # 10 detailed reference guides
├── components/
│   ├── visualizations/
│   │   ├── canvas/              # GenerativeCanvas, useCanvas, hooks, types
│   │   └── presets/             # grid-field, particle-system, point-cloud, orbital-ellipses
│   ├── ui/                      # GlassPanel, CustomCursor, ScrollProgress, HoverCardCanvas, SoundLayer
│   ├── effects/                 # Scanlines, Typewriter
│   └── scenes/                  # HeroScene (R3F container)
├── hooks/
│   └── hooks.json               # SessionStart, PreCompact, PreToolUse hooks
├── commands/
│   └── design-forge.md          # /design-forge command definition
├── research/                    # Site analyses and extracted patterns
└── examples/                    # Example implementations
```

## Key Architecture Decisions

- **Factory pattern** — Canvas presets return `DrawFunction` with closure-based state, not React state
- **Refs for high-frequency input** — Pointer tracking uses `useRef`, not `useState` (avoids 60fps re-renders)
- **Visibility gating** — `IntersectionObserver` on every canvas (critical for multi-canvas performance)
- **Signal noise** — Shared compound sine wave creates unified "breathing" across all visualizations
- **DPR cap at 2x** — Prevents excessive rendering on 3x/4x displays
- **Sound as opt-in** — All audio lazy-loaded, requires explicit user gesture
- **Accessibility-first** — `prefers-reduced-motion` renders one static frame; custom cursor auto-disables on touch

## Works With

- Any React or Next.js project
- shadcn/ui (extends, doesn't replace)
- Tailwind CSS
- Composure plugin (Composure's decomposition hooks catch oversized design components)

## License

[PolyForm Noncommercial 1.0.0](https://polyformproject.org/licenses/noncommercial/1.0.0)

Free for personal use, research, education, and nonprofits. For commercial use — freelance, agency, or corporate — [contact Helder Rodrigues](mailto:hrconsultnj@gmail.com).
