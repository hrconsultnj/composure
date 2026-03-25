# GSAP Plugin Recipes

> Patterns derived from GSAP official documentation (MIT). Plugin-specific patterns adapted for production use.

Copy-paste-ready recipes for GSAP's plugin ecosystem. Each recipe shows registration, usage, and cleanup.

**Related**: Framework setup in [gsap-framework-patterns.md](./gsap-framework-patterns.md). Advanced ScrollTrigger in [gsap-scrolltrigger-advanced.md](./gsap-scrolltrigger-advanced.md).

---

## Plugin Registration (Universal)

Register once at app entry or module level. In React, register before any `useGSAP` call.

```ts
import gsap from 'gsap';
import { Flip } from 'gsap/Flip';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
gsap.registerPlugin(Flip, ScrollTrigger, SplitText);
```

In Next.js App Router, register at the top of client component modules (outside the component body).

---

## SplitText

*Requires GSAP Club license: [gsap.com/pricing](https://gsap.com/pricing)*

Splits text into animatable `chars`, `words`, or `lines` elements.

### Character Reveal

```ts
const split = SplitText.create('.heading', { type: 'chars' });
gsap.from(split.chars, {
  opacity: 0, y: 20, stagger: 0.03, duration: 0.4,
  scrollTrigger: { trigger: '.heading', start: 'top 80%' },
});
```

### Word-by-Word Entrance

```ts
const split = SplitText.create('.paragraph', { type: 'words' });
gsap.from(split.words, { opacity: 0, y: 30, stagger: 0.05, duration: 0.5 });
```

### Line Mask Reveal (Premium Effect)

The `mask` option wraps each line in a clipping container for "slide up from behind" reveals.

```ts
const split = SplitText.create('.text', { type: 'lines', mask: 'lines' });
gsap.from(split.lines, { yPercent: 100, stagger: 0.1, duration: 0.8, ease: 'power3.out' });
```

### Auto-Split (Handles Font Loading)

```ts
SplitText.create('.headline', {
  type: 'lines', autoSplit: true,
  onSplit(self) {
    return gsap.from(self.lines, { y: 100, opacity: 0, stagger: 0.05, duration: 0.5 });
  },
});
```

### Cleanup

```ts
split.revert(); // Restores original DOM — call in cleanup
```

**Tips**: Split only the units you animate. Set `font-kerning: none` to prevent letter shifts. Avoid `text-wrap: balance` on split targets.

---

## ScrambleText

*Requires GSAP Club license*

Glitch/decode text effect for status labels, hero headings, and loading states.

```ts
gsap.to('.status', {
  duration: 1.5,
  scrambleText: { text: 'SYSTEM ONLINE', chars: '01!@#$%', revealDelay: 0.5, speed: 0.3 },
});
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `text` | `string` | — | Final text to reveal |
| `chars` | `string` | `'upperCase'` | Character pool for scramble |
| `revealDelay` | `number` | `0` | Seconds before characters lock in |
| `speed` | `number` | `1` | Scramble speed multiplier |

---

## DrawSVG

*Requires GSAP Club license*

Animates SVG stroke `dashoffset`/`dasharray` to draw or erase paths.

### Stroke Drawing on Scroll

```ts
import { DrawSVGPlugin } from 'gsap/DrawSVGPlugin';
gsap.registerPlugin(DrawSVGPlugin);

gsap.from('#line-path', {
  drawSVG: 0, duration: 2,
  scrollTrigger: { trigger: '#line-path', start: 'top 80%', scrub: true },
});
```

### Segment Animation

```ts
gsap.to('#path', { drawSVG: '20% 80%', duration: 1 });
```

### Multi-Path Stagger

```ts
gsap.from('.icon-path', { drawSVG: 0, stagger: 0.2, duration: 1, ease: 'power2.inOut' });
```

**Requirement**: Element must have visible `stroke` and `stroke-width` set.

---

## MorphSVG

*Requires GSAP Club license*

Morphs any SVG shape into another with smooth interpolation.

### Basic Shape Morph

```ts
import { MorphSVGPlugin } from 'gsap/MorphSVGPlugin';
gsap.registerPlugin(MorphSVGPlugin);

MorphSVGPlugin.convertToPath('circle, rect, ellipse');
gsap.to('#shape-a', { morphSVG: '#shape-b', duration: 1, ease: 'power2.inOut' });
```

### Advanced Morph Options

```ts
gsap.to('#diamond', {
  morphSVG: { shape: '#lightning', type: 'rotational', shapeIndex: 2 },
  duration: 1.5,
});
```

Use `shapeIndex: "log"` once to find the optimal value, then set it explicitly for production.

---

## Flip

Animates between DOM states. Captures position before a change, animates from old to new. Free plugin.

### Basic Layout Transition

```ts
import { Flip } from 'gsap/Flip';
gsap.registerPlugin(Flip);

const state = Flip.getState('.grid-item');       // 1. Capture
container.classList.toggle('reordered');          // 2. Mutate DOM
Flip.from(state, {                               // 3. Animate
  duration: 0.6, ease: 'power2.inOut', stagger: 0.05, absolute: true,
});
```

### Flip with React State

```tsx
'use client';
import { useRef, useState } from 'react';
import gsap from 'gsap';
import { Flip } from 'gsap/Flip';
import { useGSAP } from '@gsap/react';
gsap.registerPlugin(Flip, useGSAP);

export function FlipGrid({ items }: { items: string[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [sorted, setSorted] = useState(false);
  const stateRef = useRef<Flip.FlipState>();

  const handleSort = () => {
    stateRef.current = Flip.getState('.grid-item');
    setSorted((s) => !s);
  };

  useGSAP(() => {
    if (!stateRef.current) return;
    Flip.from(stateRef.current, {
      duration: 0.5, ease: 'power2.inOut', stagger: 0.04, absolute: true,
    });
  }, { dependencies: [sorted], scope: containerRef });

  const displayed = sorted ? [...items].sort() : items;
  return (
    <div ref={containerRef}>
      <button onClick={handleSort}>Toggle Sort</button>
      <div className="grid grid-cols-3 gap-4">
        {displayed.map((item) => (
          <div key={item} className="grid-item p-4 bg-white/5 rounded-lg">{item}</div>
        ))}
      </div>
    </div>
  );
}
```

### Flip vs Framer Motion layout

| Scenario | Use | Why |
|----------|-----|-----|
| Simple expand/collapse | Framer Motion `layout` | Declarative, zero setup |
| Cross-component morphing | Framer Motion `layoutId` | Shared element transitions |
| Complex grid reorder | GSAP Flip | More control over stagger and easing |
| DOM mutation animation | GSAP Flip | Works with any DOM change |

---

## Draggable + Inertia

*InertiaPlugin requires GSAP Club license. Draggable is free.*

### Basic Drag

```ts
import { Draggable } from 'gsap/Draggable';
gsap.registerPlugin(Draggable);

Draggable.create('.card', { type: 'x,y', bounds: '#container', edgeResistance: 0.65 });
```

### Drag with Momentum

```ts
import { Draggable, InertiaPlugin } from 'gsap/all';
gsap.registerPlugin(Draggable, InertiaPlugin);

Draggable.create('.slider-handle', {
  type: 'x', bounds: '#track', inertia: true,
  snap: { x: gsap.utils.snap(100) },
});
```

### Rotation Drag

```ts
Draggable.create('.knob', { type: 'rotation', inertia: true });
```

**Accessibility**: Always provide keyboard alternatives for draggable elements.

---

## Observer

Normalizes pointer, touch, and scroll input across devices. Free plugin.

```ts
import { Observer } from 'gsap/Observer';
gsap.registerPlugin(Observer);

let currentIndex = 0;
const sections = document.querySelectorAll('.section');

Observer.create({
  target: window, type: 'wheel,touch,pointer',
  onUp: () => goToSection(currentIndex - 1),
  onDown: () => goToSection(currentIndex + 1),
  tolerance: 10, preventDefault: true,
});

function goToSection(index: number) {
  currentIndex = gsap.utils.clamp(0, sections.length - 1, index);
  gsap.to(window, { scrollTo: sections[currentIndex], duration: 0.8 });
}
```

**When to use**: Fullscreen section navigation, swipe gestures, custom scroll. For standard scroll-linked animation, use ScrollTrigger.

---

## MotionPath

Animate elements along an SVG path or coordinate array. Free plugin.

### Animate Along SVG Path

```ts
import { MotionPathPlugin } from 'gsap/MotionPathPlugin';
gsap.registerPlugin(MotionPathPlugin);

gsap.to('.dot', {
  duration: 3, ease: 'none',
  motionPath: {
    path: '#flight-path', align: '#flight-path',
    alignOrigin: [0.5, 0.5], autoRotate: true,
  },
  scrollTrigger: { trigger: '#path-section', scrub: 1 },
});
```

### Path from Coordinates

```ts
gsap.to('.element', {
  motionPath: {
    path: [{ x: 0, y: 0 }, { x: 100, y: -50 }, { x: 200, y: 0 }],
    curviness: 1.5,
  },
  duration: 2,
});
```

---

## ScrollTo Plugin

Smooth programmatic scrolling. Free plugin.

```ts
import { ScrollToPlugin } from 'gsap/ScrollToPlugin';
gsap.registerPlugin(ScrollToPlugin);

gsap.to(window, { scrollTo: { y: '#features', offsetY: 80 }, duration: 0.8, ease: 'power2.inOut' });
```

---

## ScrollSmoother

*Requires GSAP Club license*

Adds smooth/momentum scrolling with parallax via data attributes.

```html
<div id="smooth-wrapper">
  <div id="smooth-content"><!-- all page content --></div>
</div>
```

```ts
import { ScrollSmoother } from 'gsap/ScrollSmoother';
gsap.registerPlugin(ScrollTrigger, ScrollSmoother);

ScrollSmoother.create({
  wrapper: '#smooth-wrapper', content: '#smooth-content',
  smooth: 1.5, effects: true,
});
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `smooth` | `number` | `1` | Smoothing amount (higher = more lag) |
| `effects` | `boolean` | `false` | Enable `data-speed` and `data-lag` parallax |
| `normalizeScroll` | `boolean` | `false` | Prevent address bar resize issues on mobile |

**Note**: Not needed for most projects. Use when the design specifically calls for momentum/smooth scrolling.
