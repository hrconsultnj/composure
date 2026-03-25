# ScrollTrigger — Advanced Patterns

> Patterns derived from GSAP official documentation (MIT). Beyond basic parallax and pin.

Advanced ScrollTrigger techniques and gsap.utils recipes. Assumes familiarity with basic ScrollTrigger setup from [animation-recipes.md](./animation-recipes.md).

**Related**: Framework setup in [gsap-framework-patterns.md](./gsap-framework-patterns.md). Plugin recipes in [gsap-plugins.md](./gsap-plugins.md).

---

## ScrollTrigger.batch()

Staggered entrance for many elements — more performant than individual triggers.

```ts
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
gsap.registerPlugin(ScrollTrigger);

ScrollTrigger.batch('.card', {
  onEnter: (elements) => {
    gsap.to(elements, {
      opacity: 1,
      y: 0,
      stagger: 0.1,
      duration: 0.6,
      ease: 'power2.out',
    });
  },
  onLeave: (elements) => {
    gsap.set(elements, { opacity: 0, y: 30 });
  },
  onEnterBack: (elements) => {
    gsap.to(elements, { opacity: 1, y: 0, stagger: 0.1 });
  },
  start: 'top 85%',
  end: 'bottom 15%',
});

// Set initial state
gsap.set('.card', { opacity: 0, y: 30 });
```

**When to use**: 20+ elements that need staggered entrance (card grids, lists, galleries). Individual ScrollTriggers for each element is wasteful.

---

## Snap

### Snap to Sections (Full-Page Scroll)

```ts
ScrollTrigger.create({
  snap: {
    snapTo: 1 / (sections.length - 1), // Evenly spaced
    duration: { min: 0.2, max: 0.6 },
    ease: 'power1.inOut',
    delay: 0,
  },
});
```

### Snap to Specific Values

```ts
scrollTrigger: {
  snap: {
    snapTo: [0, 0.25, 0.5, 0.75, 1], // Custom positions
    duration: 0.4,
  },
}
```

### Snap to Timeline Labels

```ts
const tl = gsap.timeline({
  scrollTrigger: {
    trigger: '.container',
    scrub: 1,
    snap: 'labels', // Snaps to each label position
  },
});
tl.addLabel('intro')
  .to('.a', { x: 100 })
  .addLabel('middle')
  .to('.b', { y: 50 })
  .addLabel('end');
```

**Directional snapping**: Snap respects scroll direction by default — it won't snap backward if the user is scrolling forward.

---

## containerAnimation (Horizontal Galleries)

The pattern for horizontal scroll triggered by vertical scrolling, with nested triggers for individual panels.

```ts
// 1. Create the horizontal scroll tween
const panels = gsap.utils.toArray<HTMLElement>('.panel');
const scrollContainer = document.querySelector('.panels-wrapper')!;

const scrollTween = gsap.to(panels, {
  xPercent: -100 * (panels.length - 1),
  ease: 'none', // CRITICAL — must be linear
  scrollTrigger: {
    trigger: '.panels-section',
    pin: true,
    scrub: 1,
    end: () => `+=${scrollContainer.scrollWidth}`,
    snap: 1 / (panels.length - 1),
  },
});

// 2. Nested triggers that fire based on horizontal position
gsap.from('.panel-2 .content', {
  opacity: 0,
  y: 50,
  scrollTrigger: {
    containerAnimation: scrollTween, // Ties to horizontal progress
    trigger: '.panel-2',
    start: 'left center',
    toggleActions: 'play none none reset',
  },
});
```

**Rules**:
- The horizontal animation MUST use `ease: "none"` — anything else breaks containerAnimation
- Don't animate the trigger element horizontally — animate its children
- Pinning and snapping are not available on nested containerAnimation triggers
- Individual panel content can use toggleActions or scrub independently

---

## Callbacks & Events

| Callback | Fires When | Common Use |
|----------|-----------|------------|
| `onEnter` | Trigger enters viewport | Start animations |
| `onLeave` | Trigger exits viewport (scrolling down) | Pause/reset |
| `onEnterBack` | Trigger re-enters (scrolling up) | Replay |
| `onLeaveBack` | Trigger exits (scrolling up) | Reset |
| `onUpdate` | Every frame while active | Progress-based effects |
| `onToggle` | Active state changes | Class toggling |
| `onRefresh` | After recalculation | Dynamic adjustments |

### Progress-Based Counter

```ts
ScrollTrigger.create({
  trigger: '.stats-section',
  start: 'top center',
  end: 'bottom center',
  onUpdate: (self) => {
    const count = Math.round(self.progress * 1000);
    document.querySelector('.counter')!.textContent = count.toString();
  },
});
```

### toggleActions (Non-Scrub)

```ts
// Format: "onEnter onLeave onEnterBack onLeaveBack"
// Values: play, pause, resume, reset, restart, complete, reverse, none
scrollTrigger: {
  toggleActions: 'play reverse play reverse', // Plays on enter, reverses on leave
}
```

**Important**: Use `scrub` OR `toggleActions` — not both. If both are set, `scrub` takes precedence.

---

## gsap.utils

Framework-agnostic utility functions. No registration needed.

### Value Mapping

```ts
// Clamp: constrain value to range
gsap.utils.clamp(0, 100, 150); // 100

// Map between ranges
gsap.utils.mapRange(0, 1, 0, 360, 0.5); // 180

// Normalize to 0-1
gsap.utils.normalize(100, 500, 300); // 0.5

// Interpolate (numbers, colors, objects)
gsap.utils.interpolate('#ff0000', '#0000ff', 0.5); // middle color
gsap.utils.interpolate({ x: 0 }, { x: 100 }, 0.5); // { x: 50 }
```

### Function Form (Reusable)

Omit the final argument to get a reusable function:

```ts
const clampProgress = gsap.utils.clamp(0, 1);
clampProgress(1.5); // 1
clampProgress(-0.2); // 0
```

### Random

```ts
gsap.utils.random(-100, 100);       // Random float
gsap.utils.random(-100, 100, 10);   // Snapped to 10s
gsap.utils.random(['a', 'b', 'c']); // Random from array

// In tweens (string form)
gsap.to('.star', { x: 'random(-200, 200)', y: 'random(-100, 100)' });
```

### Snap

```ts
gsap.utils.snap(50, 123);            // 150 (nearest multiple of 50)
gsap.utils.snap([0, 100, 300], 180); // 100 (nearest in array)
```

### Distribute (Stagger from Center/Edges)

```ts
gsap.to('.dot', {
  scale: gsap.utils.distribute({
    base: 0.5,
    amount: 2,
    from: 'center',
    grid: 'auto',
    ease: 'power2',
  }),
});
```

| `from` Value | Distribution |
|-------------|-------------|
| `"start"` | First element gets base, last gets base + amount |
| `"center"` | Center gets base, edges get base + amount |
| `"edges"` | Edges get base, center gets base + amount |
| `"random"` | Random distribution |
| `"end"` | Reverse of start |
| `0`-`1` | Ratio position |

### Pipe (Compose Utilities)

```ts
const transform = gsap.utils.pipe(
  gsap.utils.normalize(0, 100),  // Normalize to 0-1
  gsap.utils.clamp(0, 1),        // Ensure bounds
  gsap.utils.snap(0.1),          // Snap to 0.1 increments
);
transform(75); // 0.8
```

### Wrap & WrapYoyo

```ts
gsap.utils.wrap(0, 360, 400);     // 40 (wraps around)
gsap.utils.wrapYoyo(0, 100, 150); // 50 (bounces back)
```

### toArray

```ts
const boxes = gsap.utils.toArray('.box');           // NodeList -> Array
const mixed = gsap.utils.toArray([el1, '.other']);  // Mixed input
```

---

## Refresh & Resize

```ts
// After dynamic content loads (images, accordions, lazy content)
ScrollTrigger.refresh();

// After specific layout change
requestAnimationFrame(() => ScrollTrigger.refresh());

// Sort triggers by DOM position (useful after async creation)
ScrollTrigger.sort();
```

### matchMedia for Breakpoint-Specific Triggers

```ts
gsap.matchMedia().add('(min-width: 768px)', () => {
  // Desktop-only ScrollTrigger
  gsap.to('.sidebar', {
    scrollTrigger: { trigger: '.main', pin: true, end: 'bottom bottom' },
  });
  // Automatically cleaned up when viewport shrinks below 768px
});
```

### Dynamic Content Handling

```ts
// After images load
document.querySelectorAll('img').forEach((img) => {
  img.addEventListener('load', () => ScrollTrigger.refresh());
});

// After accordion toggle
accordion.addEventListener('toggle', () => {
  requestAnimationFrame(() => ScrollTrigger.refresh());
});
```

---

## Debugging

```ts
// Visual markers (development only)
scrollTrigger: {
  markers: true, // Shows start/end lines on viewport and trigger
  id: 'hero',    // Labels in markers
}

// Inspect all triggers
ScrollTrigger.getAll().forEach((t) => {
  console.log(t.vars.id, t.progress.toFixed(2), t.isActive);
});

// Get specific trigger
const heroTrigger = ScrollTrigger.getById('hero');
```

### Common Pitfalls

| Problem | Cause | Fix |
|---------|-------|-----|
| Trigger fires too early/late | Images not loaded | Call `refresh()` after load |
| Pin jumps on mobile | Address bar resize | Use `pinType: "transform"` |
| Nested overflow clips trigger | Parent has `overflow: hidden` | Move trigger outside clipped parent |
| Multiple triggers fire at wrong time | Created in random order | Add `refreshPriority` or call `ScrollTrigger.sort()` |
| Animations don't revert | Missing cleanup | Use `gsap.context()` + `ctx.revert()` |

**Never ship `markers: true`** to production.
