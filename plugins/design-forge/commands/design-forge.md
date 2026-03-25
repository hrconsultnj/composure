---
name: design-forge
description: Browse and apply premium web design patterns
argument-hint: [pattern-name]
---

Available Design Forge components (read from plugin at ${CLAUDE_PLUGIN_ROOT}/components/):

**Canvas Visualizations** (`components/visualizations/`)
- `GenerativeCanvas` — Drop-in canvas with DPR scaling, visibility gating, pointer tracking
- `createGridField()` — Perspective grid with sine deformation
- `createOrbitalEllipses()` — Concentric ellipse gyroscope
- `createPointCloud()` — Nebula-like scattered dots with pointer attraction
- `createParticleSystem()` — Configurable emission, physics, lifetime

**UI Components** (`components/ui/`)
- `GlassPanel` — Glassmorphism: blur, gradient, radial glow accent
- `ScrollProgress` — Fixed progress bar with glowing dot
- `useNavbarCompact` — Scroll-threshold navbar compaction
- `CustomCursor` — 3-layer: ring + dot + label, auto-disables on touch
- `HoverCardCanvas` — Card with per-card canvas background
- `useSoundLayer` — Ambient audio + debounced hover tones

**Effects** (`components/effects/`)
- `Scanlines` — Full-page CRT scanline overlay
- `Typewriter` — Character-by-character cycling status messages

**Scenes** (`components/scenes/`)
- `HeroScene` — Full-screen Three.js hero container with telemetry HUD

If `$ARGUMENTS` is provided, read the source for that specific component from `${CLAUDE_PLUGIN_ROOT}/components/` and show the user how to integrate it into their project.

If no argument, present this catalog and ask the user which pattern they want to apply and where.

For detailed reference material, consult:
- `${CLAUDE_PLUGIN_ROOT}/skills/design-forge/references/canvas-system.md`
- `${CLAUDE_PLUGIN_ROOT}/skills/design-forge/references/design-patterns.md`
- `${CLAUDE_PLUGIN_ROOT}/skills/design-forge/references/animation-recipes.md`
- `${CLAUDE_PLUGIN_ROOT}/skills/design-forge/references/3d-integration.md`
- `${CLAUDE_PLUGIN_ROOT}/skills/design-forge/references/micro-interactions.md`
- `${CLAUDE_PLUGIN_ROOT}/skills/design-forge/references/accessibility.md`
- `${CLAUDE_PLUGIN_ROOT}/skills/design-forge/references/nextjs-conf-patterns.md`
