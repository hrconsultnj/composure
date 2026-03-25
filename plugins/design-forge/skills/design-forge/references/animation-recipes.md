# Animation Recipes

Copy-paste-ready animation patterns for React/Next.js projects. Each recipe is self-contained — install the package, drop in the code.

**Related**: CSS-only animation recipes are in [design-patterns.md](./design-patterns.md) (hover easing, glint animation, bracket effect).

---

## Framer Motion

### Installation

```bash
pnpm add framer-motion
```

### Page Transitions

Wrap your route content with `AnimatePresence` for enter/exit animations on navigation.

```tsx
import { motion, AnimatePresence } from 'framer-motion';

// In your layout or page wrapper
<AnimatePresence mode="wait">
  <motion.div
    key={pathname}
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -20 }}
    transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
  >
    {children}
  </motion.div>
</AnimatePresence>
```

**Ease curve note**: `[0.16, 1, 0.3, 1]` is a fast-in, slow-out curve — snappy and premium-feeling.

### Stagger Children

Reveal a list of items one by one with cascading delay.

```tsx
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

<motion.div variants={containerVariants} initial="hidden" animate="visible">
  {items.map((item, i) => (
    <motion.div key={i} variants={itemVariants}>
      {item}
    </motion.div>
  ))}
</motion.div>
```

### Fade In On Scroll (Viewport)

Trigger animation when element enters viewport — no IntersectionObserver boilerplate needed.

```tsx
<motion.section
  initial={{ opacity: 0, y: 40 }}
  whileInView={{ opacity: 1, y: 0 }}
  viewport={{ once: true, margin: '-100px' }}
  transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
>
  {content}
</motion.section>
```

### Layout Animations (Shared Element)

Animate between states with automatic layout interpolation.

```tsx
<motion.div layout layoutId="card-highlight">
  {isExpanded ? <ExpandedCard /> : <CompactCard />}
</motion.div>
```

### Hover & Tap

```tsx
<motion.button
  whileHover={{ scale: 1.04 }}
  whileTap={{ scale: 0.97 }}
  transition={{ type: 'spring', stiffness: 400, damping: 20 }}
>
  Click me
</motion.button>
```

### Accessible Animation

Always respect `prefers-reduced-motion`:

```tsx
<motion.div
  initial={{ opacity: 0 }}
  animate={{ opacity: 1 }}
  className="motion-safe:transition-opacity motion-reduce:transition-none"
>
  {content}
</motion.div>
```

---

## GSAP + ScrollTrigger

### Installation

```bash
pnpm add gsap
```

### Basic Parallax

```tsx
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useEffect, useRef } from 'react';

export function ParallaxSection() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);

    gsap.to(ref.current, {
      yPercent: -30,
      ease: 'none',
      scrollTrigger: {
        trigger: ref.current,
        scrub: true,
      },
    });

    return () => ScrollTrigger.getAll().forEach((t) => t.kill());
  }, []);

  return <div ref={ref}>{/* parallax content */}</div>;
}
```

### Pin & Scrub (Horizontal Scroll)

```tsx
useEffect(() => {
  gsap.registerPlugin(ScrollTrigger);
  const panels = gsap.utils.toArray<HTMLElement>('.panel');

  gsap.to(panels, {
    xPercent: -100 * (panels.length - 1),
    ease: 'none',
    scrollTrigger: {
      trigger: containerRef.current,
      pin: true,
      scrub: 1,
      snap: 1 / (panels.length - 1),
      end: () => `+=${containerRef.current!.offsetWidth}`,
    },
  });

  return () => ScrollTrigger.getAll().forEach((t) => t.kill());
}, []);
```

### Timeline (Sequenced Animations)

```tsx
useEffect(() => {
  gsap.registerPlugin(ScrollTrigger);

  const tl = gsap.timeline({
    scrollTrigger: {
      trigger: sectionRef.current,
      start: 'top center',
      end: 'bottom center',
      scrub: true,
    },
  });

  tl.from('.title', { opacity: 0, y: 50 })
    .from('.subtitle', { opacity: 0, y: 30 }, '-=0.3')
    .from('.cta', { opacity: 0, scale: 0.9 }, '-=0.2');

  return () => tl.kill();
}, []);
```

**Cleanup**: Always kill ScrollTrigger instances in the cleanup function to prevent memory leaks.

---

## SVG Animations (Framer Motion)

### Path Drawing

```tsx
import { motion } from 'framer-motion';

<motion.svg width="100" height="100" viewBox="0 0 100 100">
  <motion.circle
    cx="50"
    cy="50"
    r="40"
    stroke="#4a78ff"
    strokeWidth="4"
    fill="transparent"
    initial={{ pathLength: 0 }}
    animate={{ pathLength: 1 }}
    transition={{ duration: 2, ease: 'easeInOut' }}
  />
</motion.svg>
```

### Logo Reveal (Draw + Fill)

```tsx
const pathVariants = {
  hidden: { pathLength: 0, fillOpacity: 0 },
  visible: {
    pathLength: 1,
    fillOpacity: 1,
    transition: {
      pathLength: { duration: 1.5, ease: 'easeInOut' },
      fillOpacity: { duration: 0.5, delay: 1.2 },
    },
  },
};

<motion.path d="M10 80 Q 95 10 180 80" variants={pathVariants} />;
```

---

## Choosing Between Libraries

| Scenario | Use | Why |
|----------|-----|-----|
| Component enter/exit | Framer Motion | `AnimatePresence` handles mount/unmount |
| Scroll-linked parallax | GSAP ScrollTrigger | Scrub-based, precise timing |
| Hover/tap micro-feedback | Framer Motion | `whileHover`, `whileTap` are declarative |
| Complex multi-step timeline | GSAP | Timeline API is more expressive |
| SVG path drawing (simple) | Framer Motion | `pathLength` is built-in |
| SVG stroke drawing (advanced) | GSAP DrawSVG | Multi-path stagger, segment control |
| SVG shape morphing | GSAP MorphSVG | Auto point-matching, rotational morphs |
| Layout morphing | Framer Motion | `layout` prop handles it automatically |
| Complex grid reorder | GSAP Flip | More control over stagger, easing, DOM mutations |
| Text character/word animation | GSAP SplitText | Split into chars/words/lines with stagger |
| Pinned sections | GSAP ScrollTrigger | `pin: true` is battle-tested |
| Drag with momentum | GSAP Draggable | Inertia plugin, snap to grid |
| Swipe/gesture navigation | GSAP Observer | Normalizes touch/wheel/pointer input |

**General rule**: Start with Framer Motion. Reach for GSAP when you need scroll-scrubbing, complex timelines, text splitting, SVG morphing, or drag interactions.

---

## Next Steps

For deeper GSAP coverage beyond the basics above:

- **[gsap-framework-patterns.md](./gsap-framework-patterns.md)** — useGSAP hook (React), Vue/Svelte lifecycle, SSR, easing reference, matchMedia, performance
- **[gsap-plugins.md](./gsap-plugins.md)** — SplitText, DrawSVG, MorphSVG, Flip, Draggable, Observer, MotionPath recipes
- **[gsap-scrolltrigger-advanced.md](./gsap-scrolltrigger-advanced.md)** — batch(), snap, horizontal galleries, gsap.utils, debugging
