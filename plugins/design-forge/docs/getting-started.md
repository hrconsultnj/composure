# Getting Started with Design Forge

## Install

### Marketplace (recommended)

```bash
/plugin marketplace add hrconsultnj/design-forge
/plugin install design-forge@design-forge
```

### Local / development

```bash
git clone https://github.com/hrconsultnj/design-forge.git
```

Then inside Claude Code:

```
/plugin marketplace add ./design-forge
/plugin install design-forge@design-forge
```

### Update

```bash
/plugin marketplace update design-forge
```

## How It Works

Design Forge is a **Claude Code plugin** -- it gives Claude access to production components, design references, and implementation methodology. You don't import it into your project directly. Instead:

1. You describe what you want ("add a generative canvas background")
2. Claude reads the relevant component source from the plugin
3. Claude adapts the component to your project's framework, theme, and patterns
4. The adapted component is written into your codebase

## Quick Start

### 1. Browse the catalog

After installing, run the slash command to see available components:

```
/design-forge
```

Or ask directly:

```
"What Design Forge components are available?"
```

### 2. Add your first component

Start with something visual. Ask Claude:

```
"Add a generative canvas background to my hero section using the grid field preset"
```

Claude will:
- Read `GenerativeCanvas` and `createGridField` from the plugin
- Create the component in your project with proper imports
- Add visibility gating, reduced motion support, and DPR cap
- Match your existing Tailwind / CSS conventions

### 3. Compose multiple components

Design Forge components are designed to layer:

```
"Add a glassmorphism panel with a glow accent for my feature cards"
"Add a scroll progress bar to the page"
"Add a custom cursor with contextual labels"
```

### 4. Customize

Every component accepts configuration props. Common customizations:

| Component | Key Props |
|-----------|-----------|
| `GenerativeCanvas` | `draw`, `clearColor`, `fps`, `animate` |
| `GlassPanel` | `blur`, `glowColor`, `glowPosition`, `radius` |
| `ScrollProgress` | `color`, `height`, `position` |
| `CustomCursor` | `ringColor`, `dotColor`, `ringSize`, `ringLag` |
| `HoverCardCanvas` | `draw`, `animateOnHover`, `idleOpacity` |
| `Scanlines` | `spacing`, `opacity`, `color` |
| `Typewriter` | `messages`, `typeSpeed`, `cursor` |
| `HeroScene` | `telemetry`, `background`, `height` |
| `useSoundLayer` | `ambientSrc`, `hoverSrc`, `hoverVolume` |

## Dependencies

Design Forge components have minimal dependencies. Install as needed:

| Feature | Install |
|---------|---------|
| Basic (canvas, glass, scroll) | None -- uses React + CSS |
| Page transitions, stagger | `pnpm add motion` |
| Scroll-linked parallax | `pnpm add gsap` |
| 3D scenes | `pnpm add three @react-three/fiber @react-three/drei` |
| Quick 3D prototypes | `pnpm add @splinetool/react-spline` |

## Project Compatibility

Design Forge works with:

- **React 18+** or **React 19**
- **Next.js 14+** (App Router or Pages Router)
- **Tailwind CSS** (components use inline styles but respect Tailwind conventions)
- **shadcn/ui** (extends, does not replace)
- **TypeScript** (all components are fully typed)

## Next Steps

- Read the [Architecture Guide](./architecture.md) to understand how the canvas system works
- Check the [Performance Guide](./performance-guide.md) before adding multiple canvas elements
- Review the [Accessibility Checklist](./accessibility-checklist.md) for compliance
- Browse the [Examples](../examples/) for full page implementations
