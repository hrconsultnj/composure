---
name: design-forge
description: This skill should be used when the user asks to "add premium animations", "create a canvas visualization", "build a glassmorphism panel", "add a custom cursor", "create a generative background", "build an interactive card", "add scroll progress", "add sound design", "create a Three.js hero", "build a creative portfolio", "add particle effects", "add scanlines", "add a typewriter effect", "design a landing page", "implement advanced animations", "add 3D elements", "design using Next.js Conf patterns", "create interactive experience", "add Framer Motion animations", "add GSAP scroll animations", "integrate Spline 3D", or needs guidance on premium web design patterns, creative coding, generative art, micro-interactions, accessibility for animations, or bespoke interactive experiences beyond standard UI components.
user-invocable: true
---

# Design Forge — Premium Web Design Patterns

## Overview

Design Forge provides production-ready components AND design methodology for building premium interactive web experiences in React/Next.js. It covers canvas visualizations, glassmorphism, animations (Framer Motion, GSAP), 3D (Three.js, Spline), micro-interactions, sound design, and accessibility.

**When to use:** Any time a project needs visual richness beyond standard components — generative backgrounds, page transitions, scroll-driven animations, 3D elements, premium layouts, or bespoke interactions.

## Available Components

All components live in `${CLAUDE_PLUGIN_ROOT}/components/`. Read the source file for the component before adapting it for the user's project.

### Canvas Visualization System (Priority 1 — Foundation)

**Core:** `${CLAUDE_PLUGIN_ROOT}/components/visualizations/canvas/`

- `GenerativeCanvas` — Drop-in canvas component with DPR scaling, visibility gating, pointer tracking, reduced motion
- `useCanvas` — Core hook managing the RAF loop, pointer, visibility, DPR
- `getSignalNoise()` — Compound sine wave for unified organic motion across all visualizations
- Utility functions: `lerp`, `mapRange`, `clamp`, `dist`

**Presets:** `${CLAUDE_PLUGIN_ROOT}/components/visualizations/presets/`

| Preset | Factory | Use Case |
|--------|---------|----------|
| Grid Field | `createGridField()` | Perspective grid with sine deformation + pointer distortion |
| Orbital Ellipses | `createOrbitalEllipses()` | Gyroscope-like concentric ellipse animation |
| Point Cloud | `createPointCloud()` | Nebula-like scattered dots with pointer attraction |
| Particle System | `createParticleSystem()` | Configurable emission, physics, and lifetime |

**Pattern:** Each preset is a factory function returning a `DrawFunction`. Internal state (particles, positions) lives in closures. Plug any `DrawFunction` into `GenerativeCanvas`.

### UI Components

**Location:** `${CLAUDE_PLUGIN_ROOT}/components/ui/`

| Component | File | Purpose |
|-----------|------|---------|
| GlassPanel | `glass-panel.tsx` | Glassmorphism panel with blur, gradient, radial glow accent |
| ScrollProgress | `scroll-progress.tsx` | Fixed progress bar with glowing dot at leading edge |
| useNavbarCompact | `navbar-compact.tsx` | Hook for scroll-threshold navbar compaction |
| CustomCursor | `custom-cursor.tsx` | 3-layer cursor: ring + dot + contextual label. Auto-disables on touch |
| HoverCardCanvas | `hover-card-canvas.tsx` | Card with per-card canvas background, animate-on-hover |
| useSoundLayer | `sound-layer.tsx` | Ambient audio + debounced hover tones, lazy-loaded |

### Effects

**Location:** `${CLAUDE_PLUGIN_ROOT}/components/effects/`

| Component | File | Purpose |
|-----------|------|---------|
| Scanlines | `scanlines.tsx` | Full-page CRT scanline overlay |
| Typewriter | `typewriter.tsx` | Character-by-character cycling status messages |

### Scenes

**Location:** `${CLAUDE_PLUGIN_ROOT}/components/scenes/`

| Component | File | Purpose |
|-----------|------|---------|
| HeroScene | `hero-scene.tsx` | Full-screen hero container with telemetry HUD overlay |

## Design Workflow

When approaching any premium design task:

1. **Understand** — What's the goal? What devices? Performance budget? Accessibility requirements?
2. **Choose tools** — Use the decision tree below to pick the right approach
3. **Read components** — Check if Design Forge already has a component for the job
4. **Build progressively** — Semantic HTML → responsive → accessibility → CSS → JS → advanced animations → 3D
5. **Optimize & test** — Lighthouse > 90, 60fps animations, reduced motion support

### Tool Selection

| Tool | Use Case | Performance | Install |
|------|----------|-------------|---------|
| CSS + Tailwind | Static designs, basic transitions | Excellent | Built-in |
| Framer Motion | Page transitions, stagger, hover | Good | `pnpm add framer-motion` |
| GSAP | Scroll-linked parallax, timelines | Good | `pnpm add gsap` |
| GSAP Plugins | Text reveals, SVG drawing/morphing, layout transitions, drag | Good | `pnpm add gsap` (Club plugins need license) |
| Three.js / R3F | 3D scenes, WebGL effects | Heavy | `pnpm add three @react-three/fiber @react-three/drei` |
| Spline | Quick 3D prototypes | Medium | `pnpm add @splinetool/react-spline` |
| Canvas 2D | Generative art, particle systems | Excellent | Built-in (use Design Forge presets) |

### Decision Tree

```
Static or interactive?
├─ Static → CSS + Tailwind (+ Next.js Conf patterns)
├─ Interactive → Motion.dev
├─ Scroll-driven → GSAP ScrollTrigger
├─ Text reveal/split → GSAP SplitText
├─ SVG drawing/morphing → GSAP DrawSVG / MorphSVG
├─ Layout transitions → GSAP Flip (complex) or Framer Motion layout (simple)
├─ Drag interactions → GSAP Draggable
├─ 3D elements → Three.js (custom) or Spline (quick)
└─ Generative art → Canvas 2D (Design Forge presets)
```

## Common Recipes

**Landing page**: Next.js Conf hero pattern → FadeInOnScroll sections → ElevatedCards for features → CTA buttons. See `references/nextjs-conf-patterns.md`.

**3D showcase**: Assess complexity → Three.js for custom, Spline for quick → lazy-load with Suspense → LOD for complex → static fallback for reduced motion. See `references/3d-integration.md`.

**Page transitions**: Framer Motion AnimatePresence → motion variants → layout animations for shared elements → exit animations. See `references/animation-recipes.md`.

**Scroll animations**: GSAP ScrollTrigger → parallax with scrub → pin sections → timeline sequences. See `references/animation-recipes.md`.

**Text animations**: GSAP SplitText → character/word/line reveals → scramble text → mask effects. See `references/gsap-plugins.md`.

**SVG animations**: GSAP DrawSVG → stroke drawing → MorphSVG for shape morphing. See `references/gsap-plugins.md`.

**Micro-interactions**: CSS hover → Framer whileHover → Canvas backgrounds → cursor context labels → sound feedback. See `references/micro-interactions.md`.

## Implementation Workflow

To add a premium design element to a user's project:

1. **Read the component source** from `${CLAUDE_PLUGIN_ROOT}/components/`
2. **Adapt** to the user's framework, theme, and existing patterns
3. **Ensure performance**: visibility gating, reduced motion, DPR cap
4. **Ensure accessibility**: aria labels, pointer-events: none on decorative elements, WCAG 2.1 AA
5. **Test responsive**: touch devices auto-disable custom cursor, fluid sizing

## Key Design Principles

- **Performance through visibility gating** — IntersectionObserver on every canvas
- **DPR cap at 2x** — prevents excessive resolution on high-DPI displays
- **prefers-reduced-motion** — single static frame instead of animation loop
- **Touch adaptation** — custom cursor auto-disables on coarse pointers
- **Signal noise** — shared compound sine wave unifies the "breathing" across all visualizations
- **Sound as opt-in** — all audio lazy-loaded, requires explicit user gesture to start
- **Progressive enhancement** — semantic HTML first, enrich for capable devices
- **WCAG 2.1 AA** — contrast ratios, keyboard navigation, focus indicators, ARIA labels
- **Lighthouse > 90** — all categories, including accessibility
- **60fps target** — GPU-accelerated properties (transform, opacity), lazy-load heavy deps

## Taxonomy-Aware Routing

Design Forge includes a taxonomy that routes to the right patterns based on platform, industry, and style. This replaces one-size-fits-all recommendations.

### How Routing Works

1. **Check for UX researcher report**: Look for the most recent `.claude/research/*.md` file. If it has a `## Classification` block, extract platform, industry, style, and intensity.

2. **If no report exists, detect from project**:
   - Scan `package.json` for framework (Next.js, Expo, etc.)
   - Check for `components.json` (shadcn/ui presence)
   - Read CLAUDE.md or project docs for industry context
   - Examine color tokens in `globals.css` or `tailwind.config`

3. **Load taxonomy files** (selective — never load all):
   - Always: `${CLAUDE_SKILL_DIR}/taxonomy/index.json` (the routing brain)
   - Match: one platform file from `taxonomy/platforms/`
   - Match: one industry file from `taxonomy/industries/`
   - Match: one style file from `taxonomy/styles/`
   - If shadcn detected: `taxonomy/shadcn-bridge.md`

4. **Find the mapping** in `index.json` → get specific patterns, components, intensity, depth strategy

5. **Present recommendations** to the user before implementing

### Explicit Invocation

Users can specify axes directly: `/design-forge health webapp modern`

Accepted values:
- **Platforms**: website, webapp, mobile
- **Industries**: health, saas, fintech, legal, ecommerce, creative, services, hospitality
- **Styles**: modern, minimalistic, glassmorphism, futuristic, brutalist, organic

### UX Researcher Integration

The `/ux-researcher` skill produces reports to `.claude/research/`. When it includes a Classification block, Design Forge uses it automatically:

```markdown
## Classification
- platform: webapp
- industry: health
- style: modern
- animation_intensity: gentle
- depth_strategy: css-layers
- scroll_choreography: section-fade-sequence
```

### Default Behavior

When no taxonomy context is available, defaults to: **saas + webapp + modern** (the most common case).

The "control room" aesthetic (near-black, scanlines, monospace, sharp corners) is now the `futuristic` style in the taxonomy — used for creative portfolios and developer tools, not as the default.

## Research Before Building

Use `/ux-researcher` (bundled in this plugin) to gather design intelligence before implementing:

```
/ux-researcher [topic]     → produces research report with Classification block + patterns
/design-forge [axes]       → loads taxonomy, applies patterns from research or explicit axes
```

The research agent uses WebSearch and WebFetch to discover real-world patterns, evaluate technologies, analyze competitors, and create actionable reports — so you're building on proven approaches, not guessing.

## Section Templates

Composable page sections decomposed from Apple MacBook Pro and Google Gemini. Each section accepts `animationIntensity` from taxonomy routing. Located in `${CLAUDE_SKILL_DIR}/templates/sections/`.

### Available Sections

| Category | Templates | Source |
|----------|-----------|--------|
| **Heroes** | `gradient-headline-hero`, `product-reveal-hero`, `split-media-hero` | Gemini, Apple |
| **Showcases** | `pinned-timeline-showcase`, `feature-card-grid`, `capabilities-bento`, `image-sequence-scroll` | Apple, Gemini |
| **Metrics** | `counter-bar`, `spec-comparison`, `stats-showcase` | Apple |
| **Media** | `video-scroll-reveal`, `full-bleed-media`, `parallax-layers` | Apple, Gemini |
| **Social Proof** | `testimonial-carousel`, `logo-marquee`, `trust-signals` | General |
| **Content** | `faq-accordion`, `interactive-demo`, `sticky-sidebar-content` | Gemini |
| **CTAs** | `gradient-cta`, `product-options-cta`, `newsletter-cta` | Gemini, Apple |

### Section Workflow

When building a page, the taxonomy `sections` key recommends which sections to use per industry/platform/style. Claude reads the relevant section templates and adapts them for the user's project.

Typical page composition: Hero → Showcase(s) → Metrics → Social Proof → Content → CTA

## Asset Generation

Programmatic asset generation pipeline. Generate branded social media posts, OG images, device mockups, and more using code — no Figma or MidJourney needed. Located in `${CLAUDE_SKILL_DIR}/templates/assets/`.

### Available Asset Types

| Type | Pipeline | Output |
|------|----------|--------|
| **OG Image** | Satori → resvg → Sharp | 1200×630 PNG |
| **Social Media Kit** | Satori → resvg → Sharp | 6 platform-sized PNGs |
| **Generative Background** | @napi-rs/canvas → Sharp | Custom-sized PNG |
| **Device Mockup** | Sharp composite | Device-framed PNG |
| **Quality Showcase** | Sharp composite | Annotated zoom-bubble PNG |
| **Website Hero** | @napi-rs/canvas → Sharp | 1920×1080 PNG |

### Asset Workflow

1. Detect or ask for industry → resolve BrandConfig from taxonomy palettes
2. Ask for brand details (name, tagline, logo)
3. Read the relevant asset template
4. Adapt and write generation script to user's project
5. Install core deps if needed (`satori`, `@resvg/resvg-js`, `sharp`)
6. Run script → output to `./generated-assets/`

Core pipeline: **Satori + @resvg/resvg-js + Sharp** (~25MB). Alt: Playwright for full CSS, @napi-rs/canvas for generative art.

## Additional Resources

### Reference Files

For detailed pattern documentation, code recipes, and design rationale:

- **`${CLAUDE_SKILL_DIR}/references/canvas-system.md`** — Canvas visualization architecture, factory pattern, signal noise, custom draw functions
- **`${CLAUDE_SKILL_DIR}/references/design-patterns.md`** — CSS recipes, glassmorphism, layouts, bento grids, color palettes, typography, performance patterns
- **`${CLAUDE_SKILL_DIR}/references/animation-recipes.md`** — Framer Motion, GSAP ScrollTrigger basics, SVG animations with code examples
- **`${CLAUDE_SKILL_DIR}/references/gsap-framework-patterns.md`** — GSAP integration for React/Vue/Svelte: useGSAP hook, lifecycle cleanup, SSR, easing, matchMedia, performance
- **`${CLAUDE_SKILL_DIR}/references/gsap-plugins.md`** — SplitText, DrawSVG, MorphSVG, Flip, Draggable, Observer, MotionPath, ScrollTo, ScrollSmoother recipes
- **`${CLAUDE_SKILL_DIR}/references/gsap-scrolltrigger-advanced.md`** — batch(), snap, horizontal galleries (containerAnimation), gsap.utils, refresh/resize, debugging
- **`${CLAUDE_SKILL_DIR}/references/3d-integration.md`** — Three.js/R3F, Spline, Blender MCP, LOD strategy, dispose patterns
- **`${CLAUDE_SKILL_DIR}/references/micro-interactions.md`** — Haptic feedback, sound effects, hover escalation, scroll-triggered reveals
- **`${CLAUDE_SKILL_DIR}/references/accessibility.md`** — WCAG 2.1 AA checklist, motion accessibility, focus management, ARIA patterns
- **`${CLAUDE_SKILL_DIR}/references/nextjs-conf-patterns.md`** — Premium minimalist design patterns (hero, cards, sections, CTAs)
