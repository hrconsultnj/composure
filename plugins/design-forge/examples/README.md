# Design Forge Examples

Three complete implementations demonstrating how Design Forge components compose together. Each file is self-contained -- read one file and understand a full layout.

## Examples

### landing-page.tsx

A marketing landing page with generative hero, feature cards, and CTA.

| Component | Role |
|-----------|------|
| `GenerativeCanvas` + `createGridField` | Animated hero background |
| `GlassPanel` | Feature cards with radial glow accents |
| `ScrollProgress` | Fixed scroll indicator bar |
| `Typewriter` | Cycling subtitle messages |
| Framer Motion | Stagger reveal on scroll |

**Key patterns:** Canvas behind hero content at reduced opacity, `useMemo` for draw function, viewport-triggered stagger animation, `useReducedMotion` check.

---

### creative-portfolio.tsx

A project showcase with interactive cards and CRT overlay.

| Component | Role |
|-----------|------|
| `CustomCursor` | 3-layer cursor with contextual labels |
| `HoverCardCanvas` | Per-card generative background on hover |
| `Scanlines` | Full-page CRT scanline overlay |
| `Typewriter` | Rotating status text |
| `createPointCloud` / `createGridField` | Canvas presets per card |

**Key patterns:** `data-cursor="view"` on card elements for cursor labels, `animateOnHover` for performance (only active card animates), `AnimatePresence` for page transitions.

---

### product-showcase.tsx

A product page with 3D hero slot, bento grid, and sound feedback.

| Component | Role |
|-----------|------|
| `HeroScene` | Full-screen hero with telemetry HUD |
| `GlassPanel` | Bento grid feature cards |
| `ScrollProgress` | Scroll indicator |
| `useSoundLayer` | Hover tones on interaction |
| Suspense | 3D model lazy loading |

**Key patterns:** `Suspense` boundary for heavy 3D content, sound as opt-in (button to enable), `gridColumn: span 2` for wide bento cards, spec list with scroll-triggered stagger.

---

## Adapting to Your Project

### 1. Copy the component

Read the Design Forge component source, then copy it into your project:

```
your-project/
  components/
    ui/
      glass-panel.tsx      <-- copied from design-forge
    visualizations/
      generative-canvas.tsx
```

### 2. Update imports

Change the relative imports in the example to point at your copied components:

```tsx
// Before (example path)
import { GlassPanel } from '../components/ui/glass-panel'

// After (your project)
import { GlassPanel } from '@/components/ui/glass-panel'
```

### 3. Match your theme

Replace the `COLORS` object with your design tokens:

```tsx
const COLORS = {
  bg: '#070809',       // Your background
  text: '#e8e4dd',     // Your text color
  accent: '#4a78ff',   // Your primary accent
  // ...
}
```

### 4. Install dependencies

Each example lists its dependencies at the top. The minimum:

```bash
pnpm add motion
```

For the product showcase with 3D:

```bash
pnpm add three @react-three/fiber @react-three/drei
```

## Accessibility

All examples include:

- **`prefers-reduced-motion`** -- Framer Motion's `useReducedMotion` disables animations; canvas components render a static frame
- **`aria-label`** on sections and interactive elements
- **`aria-hidden="true"`** on decorative elements (scanlines, canvas, cursor)
- **Keyboard navigation** -- all links and buttons are focusable
- **Semantic HTML** -- proper heading hierarchy, nav, main, section, footer

## Performance Notes

- Canvas components are **visibility-gated** via IntersectionObserver (built into `useCanvas`)
- `HoverCardCanvas` only animates the hovered card (`animateOnHover={true}`)
- Draw functions are **memoized** with `useMemo` to avoid recreation
- 3D content loads inside `Suspense` with a lightweight fallback
- Sound is **lazy-loaded** and requires explicit user gesture to enable
