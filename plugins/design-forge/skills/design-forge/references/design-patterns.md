# Design Patterns Catalog

## CSS Recipes

### Glassmorphism Panel
```css
.glass-panel {
  background: linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.01));
  backdrop-filter: blur(28px) saturate(120%);
  -webkit-backdrop-filter: blur(28px) saturate(120%);
  border: 1px solid rgba(255,255,255,0.08);
}
.glass-panel::after {
  content: '';
  position: absolute;
  inset: 0;
  background: radial-gradient(ellipse at bottom right, rgba(74,120,255,0.15) 0%, transparent 70%);
  pointer-events: none;
}
```

### Full-Bleed Breakout
```css
/* Break out of a constrained parent to full viewport width */
.full-bleed {
  margin-inline: calc(50% - 50vw);
}
```

### Body Scanline Overlay
```css
body::before {
  content: '';
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 9998;
  background: repeating-linear-gradient(
    to bottom,
    transparent 0, transparent 3px,
    rgba(0,0,0,0.18) 3px, rgba(0,0,0,0.18) 4px
  );
}
```

### Custom Scrollbar
```css
::-webkit-scrollbar { width: 6px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb {
  background: linear-gradient(to bottom, #ff9447, #4a78ff);
  border-radius: 3px;
}
```

### Fluid Typography
```css
.display { font-size: clamp(3rem, 6vw, 5.5rem); }
.body { font-size: clamp(0.875rem, 1.5vw, 1.125rem); }
```

### Hover Easing Standard
```css
.interactive {
  transition: color 0.2s cubic-bezier(0.2, 0.8, 0.2, 1),
              opacity 0.2s cubic-bezier(0.2, 0.8, 0.2, 1),
              transform 0.2s cubic-bezier(0.2, 0.8, 0.2, 1);
}
```

### Scale + Lift Hover
```css
.btn:hover { transform: scale(1.02) translateY(-0.08rem); }
.btn:active { transform: scale(0.98); }
```

### Bracket Hover Effect
```css
.nav-link { position: relative; }
.nav-link::before,
.nav-link::after {
  content: '';
  position: absolute;
  top: -4px; bottom: -4px;
  width: 6px;
  border: 1.5px solid transparent;
  transition: border-color 0.2s, opacity 0.2s, transform 0.2s;
  opacity: 0;
}
.nav-link::before { left: -10px; border-right: none; transform: translateX(4px); }
.nav-link::after { right: -10px; border-left: none; transform: translateX(-4px); }
.nav-link:hover::before,
.nav-link:hover::after {
  border-color: #ff9447;
  opacity: 1;
  transform: translateX(0);
}
```

### Glint Animation
```css
@keyframes glint {
  0%, 100% { background-position: -200% 0; }
  50% { background-position: 200% 0; }
}
.glint-surface {
  background-image: linear-gradient(
    90deg, transparent 0%, rgba(255,255,255,0.03) 50%, transparent 100%
  );
  background-size: 200% 100%;
  animation: glint 8s ease-in-out infinite;
}
```

## Layout Patterns

### Three-Column Sticky Navbar
```css
.navbar {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
  position: sticky;
  top: 0;
  z-index: 100;
}
```

### Modern Max-Width Container
```css
.container {
  width: min(calc(100% - 2rem), var(--max-width, 1200px));
  margin-inline: auto;
}
```

### Responsive Without Breakpoints
Key techniques:
- `clamp()` for fluid sizing
- `min()` for capped max-widths
- `min-height: min(calc(100svh - 5rem), 62rem)` for mobile viewport
- `@media (pointer: coarse)` for touch adaptation (NOT width-based)

## Performance Patterns

1. **Visibility gating**: `IntersectionObserver` on every animated element
2. **DPR cap**: `Math.min(window.devicePixelRatio, 2)`
3. **Font loading**: `media="print" onload="this.media='all'"` pattern
4. **Audio lazy loading**: `preload="none"`, loaded on first interaction
5. **overflow-x: clip** instead of `hidden` (avoids new scroll container)
6. **pointer-events: none** on ALL decorative pseudo-elements
7. **prefers-reduced-motion**: all animation loops skip, single static render

## Theme System

### Flash-Free Theme Toggle
```html
<!-- In <head> BEFORE any CSS -->
<script>
  const t = localStorage.getItem('theme') ||
    (matchMedia('(prefers-color-scheme:dark)').matches ? 'dark' : 'light');
  document.documentElement.dataset.theme = t;
</script>
```

### Canvas Theme Sync
When theme changes, call `syncPaletteFromTheme()` on each canvas:
- Read current CSS custom properties
- Update draw function color references
- Trigger one immediate re-render

## Color Palettes

### Control Room (Dark)
| Token | Value | Usage |
|-------|-------|-------|
| --bg | #070809 | Background |
| --text | #f3efe8 | Body text |
| --blue | #4a78ff | Primary accent, links |
| --green | #7de58d | Status indicators, success |
| --orange | #ff9447 | Warning, hover accents |
| --line | rgba(255,255,255,0.08) | Borders |
| --panel-top | rgba(255,255,255,0.04) | Panel gradient start |
| --panel-bottom | rgba(255,255,255,0.01) | Panel gradient end |

### Control Room (Light)
| Token | Value | Usage |
|-------|-------|-------|
| --bg | #f3efe8 | Background (warm paper) |
| --text | #070809 | Body text |
| --blue | #3562d9 | Primary accent |
| --green | #2d8f3e | Status indicators |
| --orange | #d67a30 | Warning, hover accents |
| --line | rgba(0,0,0,0.08) | Borders |

## Typography

### Recommended Pairings
- **Body**: Instrument Sans (or Geist Sans for Vercel ecosystem)
- **Labels/UI**: IBM Plex Mono (or Geist Mono)
- **Display**: Pick something with character — avoid Inter, Roboto, system fonts

### Label Pattern
```css
.label {
  font-family: var(--font-mono);
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: rgba(255,255,255,0.5);
}
```

## Advanced Layout Techniques

### Bento Grid (Apple-Style)

```tsx
<div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 auto-rows-[200px]">
  <div className="col-span-2 row-span-2 rounded-xl bg-card p-6">
    {/* Large featured card */}
  </div>
  <div className="col-span-2 row-span-1 rounded-xl bg-card p-6">
    {/* Wide card */}
  </div>
  <div className="col-span-1 row-span-2 rounded-xl bg-card p-6">
    {/* Tall card */}
  </div>
  <div className="col-span-1 row-span-1 rounded-xl bg-card p-6">
    {/* Standard card */}
  </div>
</div>
```

Key: Use `auto-rows-[200px]` for uniform row height, vary span for visual hierarchy.

### Container Queries

Component-level responsiveness independent of viewport width:

```css
.card-wrapper {
  container-type: inline-size;
}

@container (min-width: 400px) {
  .card-content {
    display: grid;
    grid-template-columns: 1fr 1fr;
  }
}
```

In Tailwind (v4+): `@container` classes like `@md:grid-cols-2`.

## Performance-Optimized Assets

### Next.js Image Optimization

```tsx
import Image from 'next/image';

<Image
  src="/hero-image.jpg"
  alt="Hero"
  width={1920}
  height={1080}
  priority              // Above-the-fold: skip lazy loading
  placeholder="blur"
  blurDataURL="data:image/jpeg;base64,..."
/>
```

### Lazy Loading Heavy Components

```tsx
import { Suspense, lazy } from 'react';

const Scene3D = lazy(() => import('./Scene3D'));

<Suspense fallback={<div className="animate-pulse bg-muted h-[400px]" />}>
  <Scene3D />
</Suspense>
```

### Code Splitting for 3D

Never include Three.js in the main bundle. Dynamic import ensures it only loads when the component mounts:

```tsx
const HeroCanvas = dynamic(() => import('./HeroCanvas'), {
  ssr: false,   // Three.js needs browser APIs
  loading: () => <LoadingSkeleton />,
});
```
