---
name: design-forge
description: Browse and apply premium web design patterns
argument-hint: "[industry] [platform] [style]  or  [component-name]  or  assets [type]  or  sections"
---

## Taxonomy Routing

If `$ARGUMENTS` contains taxonomy axes (e.g., `health webapp modern`), load the taxonomy and route to the right patterns:

1. Read `${CLAUDE_SKILL_DIR}/taxonomy/index.json`
2. Find the matching mapping for the given (industry, platform, style) combination
3. Load the matched files:
   - `${CLAUDE_SKILL_DIR}/taxonomy/industries/{industry}.md`
   - `${CLAUDE_SKILL_DIR}/taxonomy/platforms/{platform}.md`
   - `${CLAUDE_SKILL_DIR}/taxonomy/styles/{style}.md`
   - `${CLAUDE_SKILL_DIR}/taxonomy/shadcn-bridge.md` (if shadcn detected in project)
4. Present the recommended patterns, components, palette, and animation intensity
5. Ask the user what to implement first

**Valid axes:**
- Industries: health, saas, fintech, legal, ecommerce, creative, services, hospitality
- Platforms: website, webapp, mobile
- Styles: modern, minimalistic, glassmorphism, futuristic, brutalist, organic

If no taxonomy axes are provided, check for a recent UX researcher report in `.composure/research/` with a Classification block.

If no report exists either, auto-detect from the project (package.json, globals.css, CLAUDE.md).

## Section Templates

If `$ARGUMENTS` is `sections` or contains section-related keywords, show the section catalog from `${CLAUDE_SKILL_DIR}/templates/sections/README.md`.

Sections are composable page building blocks. The taxonomy `sections` key recommends which to use. Stack them to compose full pages:

- **Heroes**: `gradient-headline-hero`, `product-reveal-hero`, `split-media-hero`
- **Showcases**: `pinned-timeline-showcase`, `feature-card-grid`, `capabilities-bento`
- **Metrics**: `counter-bar`, `spec-comparison`, `stats-showcase`
- **Media**: `video-scroll-reveal`, `full-bleed-media`, `parallax-layers`
- **Social Proof**: `testimonial-carousel`, `logo-marquee`, `trust-signals`
- **Content**: `faq-accordion`, `interactive-demo`, `sticky-sidebar-content`
- **CTAs**: `gradient-cta`, `product-options-cta`, `newsletter-cta`

Read the template file from `${CLAUDE_SKILL_DIR}/templates/sections/{category}/{name}.tsx`.

## Asset Generation

If `$ARGUMENTS` starts with `assets`, route to the asset generation pipeline:

1. Detect industry from project context or ask
2. Resolve BrandConfig from `${CLAUDE_SKILL_DIR}/templates/assets/shared/brand-config.ts`
3. Ask for: business name, tagline, logo path, custom colors
4. Read the relevant asset template from `${CLAUDE_SKILL_DIR}/templates/assets/`
5. Adapt, write generation script, install deps, and run

**Asset types**: `og-image`, `social-media-kit`, `generative-background`, `device-mockup`, `quality-showcase`, `website-hero`

**Usage**: `/design-forge assets social-media-kit` or `/design-forge assets og-image`

## Component Catalog

If `$ARGUMENTS` names a specific component, read its source from `${CLAUDE_PLUGIN_ROOT}/components/` and show how to integrate it.

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

## References

- `${CLAUDE_SKILL_DIR}/references/canvas-system.md`
- `${CLAUDE_SKILL_DIR}/references/design-patterns.md`
- `${CLAUDE_SKILL_DIR}/references/animation-recipes.md`
- `${CLAUDE_SKILL_DIR}/references/3d-integration.md`
- `${CLAUDE_SKILL_DIR}/references/micro-interactions.md`
- `${CLAUDE_SKILL_DIR}/references/accessibility.md`
- `${CLAUDE_SKILL_DIR}/references/nextjs-conf-patterns.md`
- `${CLAUDE_SKILL_DIR}/taxonomy/scroll-choreography.md`
- `${CLAUDE_SKILL_DIR}/taxonomy/spatial-depth.md`
