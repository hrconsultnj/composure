# GSAP Framework Patterns

> Patterns derived from GSAP official documentation (MIT). Adapted for modern frameworks.

Framework-specific lifecycle patterns for GSAP integration. Covers setup, cleanup, scoping, and SSR considerations for React, Vue, and Svelte.

**Related**: Basic GSAP recipes are in [animation-recipes.md](./animation-recipes.md). Advanced ScrollTrigger patterns in [gsap-scrolltrigger-advanced.md](./gsap-scrolltrigger-advanced.md). Plugin recipes in [gsap-plugins.md](./gsap-plugins.md).

---

## Installation

```bash
# Core
pnpm add gsap

# React hook (recommended)
pnpm add @gsap/react

# GSAP Club plugins (requires license: gsap.com/pricing)
# SplitText, DrawSVG, MorphSVG, ScrollSmoother, etc.
```

**Note**: Free plugins (ScrollTrigger, Flip, Observer, TextPlugin, Draggable) are included in the `gsap` package. Import them from `gsap/PluginName`.

---

## React (with Next.js)

### useGSAP Hook (The Right Way)

The `useGSAP` hook from `@gsap/react` replaces the manual `useEffect` + cleanup pattern. It scopes selectors to a container and automatically reverts all animations on unmount.

```tsx
'use client';

import { useRef } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';

gsap.registerPlugin(useGSAP);

export function AnimatedSection() {
  const containerRef = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    gsap.from('.item', { opacity: 0, y: 20, stagger: 0.1 });
  }, { scope: containerRef });

  return (
    <div ref={containerRef}>
      <div className="item">One</div>
      <div className="item">Two</div>
    </div>
  );
}
```

**Why scope matters**: Without `scope`, `.item` selects every matching element on the page. With `scope`, selectors are limited to children of `containerRef` — safe for component isolation.

### contextSafe for Event Handlers

Animations created inside the `useGSAP` callback are tracked automatically. Animations created in event handlers are not — wrap them with `contextSafe` so they clean up properly.

```tsx
useGSAP((_context, contextSafe) => {
  // Direct animations — tracked automatically
  gsap.to('.box', { x: 100 });

  // Event handlers must be wrapped with contextSafe
  const onClick = contextSafe!(() => {
    gsap.to('.box', { rotation: 360 });
  });

  boxRef.current?.addEventListener('click', onClick);
  return () => boxRef.current?.removeEventListener('click', onClick);
}, { scope: containerRef });
```

### Dependency Array & revertOnUpdate

Re-run animations when state changes. `revertOnUpdate` reverts the previous animation before creating the new one — prevents stacking.

```tsx
useGSAP(() => {
  gsap.to('.box', { x: endX });
}, {
  dependencies: [endX],
  scope: containerRef,
  revertOnUpdate: true,
});
```

### Dynamic Import Pattern (Code-Splitting)

For heavier GSAP usage where bundle size matters — the async-in-useEffect pattern used in existing design-forge templates.

```tsx
'use client';

import { useEffect, useRef } from 'react';

export function HeavyAnimation() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced || !ref.current) return;

    let cleanup: (() => void) | undefined;

    (async () => {
      const gsap = (await import('gsap')).default;
      const { ScrollTrigger } = await import('gsap/ScrollTrigger');
      gsap.registerPlugin(ScrollTrigger);

      const tl = gsap.timeline({
        scrollTrigger: { trigger: ref.current, scrub: 1 },
      });
      tl.from('.el', { opacity: 0, y: 50 });
      cleanup = () => tl.kill();
    })();

    return () => cleanup?.();
  }, []);

  return <div ref={ref}>{/* ... */}</div>;
}
```

**When to use which**: Use `useGSAP` for most animations (simpler, auto-cleanup). Use dynamic import when GSAP is only used on one page and bundle size is critical.

### SSR / Next.js App Router

- Always add `'use client'` — GSAP is browser-only
- Never call `gsap.*` or `ScrollTrigger.*` at module level outside a client component
- `useGSAP` and `useEffect` both run client-only — safe for App Router
- `registerPlugin` at module level is fine inside a `'use client'` file

---

## Vue 3

### Composition API Pattern

Vue uses `gsap.context()` directly — the same scoping mechanism that `useGSAP` wraps for React.

```vue
<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const container = ref<HTMLElement | null>(null);
let ctx: gsap.Context;

onMounted(() => {
  ctx = gsap.context(() => {
    gsap.from('.item', { opacity: 0, y: 20, stagger: 0.1 });

    gsap.to('.parallax-bg', {
      yPercent: -30,
      ease: 'none',
      scrollTrigger: { trigger: container.value, scrub: true },
    });
  }, container.value!);
});

onUnmounted(() => {
  ctx.revert(); // kills all animations + ScrollTriggers in context
});
</script>

<template>
  <div ref="container">
    <div class="parallax-bg" />
    <div class="item">One</div>
    <div class="item">Two</div>
  </div>
</template>
```

**Key points**:
- `gsap.context(callback, scope)` scopes selectors to the component root
- `ctx.revert()` in `onUnmounted` handles all cleanup automatically
- Register plugins at module level (runs once)

### Nuxt 3 SSR

- Use `onMounted` — it only runs client-side
- For Nuxt plugins, wrap in `defineNuxtPlugin` with `if (process.client)` guard
- Never call GSAP at the top level of a composable that runs on the server

---

## Svelte

### onMount Pattern

```svelte
<script lang="ts">
  import { onMount } from 'svelte';
  import gsap from 'gsap';
  import { ScrollTrigger } from 'gsap/ScrollTrigger';

  gsap.registerPlugin(ScrollTrigger);

  let container: HTMLElement;

  onMount(() => {
    const ctx = gsap.context(() => {
      gsap.from('.item', { opacity: 0, y: 20, stagger: 0.1 });

      gsap.to('.parallax-bg', {
        yPercent: -30,
        ease: 'none',
        scrollTrigger: { trigger: container, scrub: true },
      });
    }, container);

    return () => ctx.revert();
  });
</script>

<div bind:this={container}>
  <div class="parallax-bg"></div>
  <div class="item">One</div>
  <div class="item">Two</div>
</div>
```

**Key points**:
- Svelte's `onMount` return function is the cleanup — same as React's useEffect
- `bind:this` gives the DOM reference (equivalent to React ref)
- SvelteKit: `onMount` only runs client-side, safe for SSR

---

## Easing Reference

Built-in eases and when to reach for them.

| Ease | Feel | Use For |
|------|------|---------|
| `"none"` | Linear | Scrub-linked animations |
| `"power1.out"` | Gentle deceleration | Subtle entrances |
| `"power2.out"` | Medium deceleration | Standard UI motion |
| `"power3.out"` | Fast start, soft land | Snappy reveals |
| `"power4.out"` | Very fast start | Dramatic entrances |
| `"back.out(1.7)"` | Overshoot | Bouncy elements |
| `"elastic.out(1, 0.3)"` | Spring/wobble | Playful UI |
| `"bounce.out"` | Bounce at end | Ball/physics feel |
| `"expo.out"` | Exponential deceleration | Premium snappiness |
| `"circ.out"` | Circular curve | Smooth arcs |

**Variants**: Each ease supports `.in`, `.out`, `.inOut`. Default is `.out`.

**CustomEase** (Club plugin): For bespoke curves:

```ts
import { CustomEase } from 'gsap/CustomEase';
gsap.registerPlugin(CustomEase);

CustomEase.create('premium', '0.16, 1, 0.3, 1');
gsap.to('.el', { x: 100, ease: 'premium' });
```

---

## matchMedia — Responsive & Accessibility

### Responsive Breakpoints

```ts
gsap.matchMedia().add({
  isMobile: '(max-width: 767px)',
  isDesktop: '(min-width: 768px)',
}, (context) => {
  const { isMobile } = context.conditions!;

  gsap.to('.hero', {
    x: isMobile ? 0 : 200,
    scrollTrigger: { trigger: '.hero', scrub: true },
  });

  // Animations created here are automatically reverted
  // when the media query no longer matches
});
```

### prefers-reduced-motion

```ts
gsap.matchMedia().add('(prefers-reduced-motion: no-preference)', () => {
  // Only runs when user has NOT requested reduced motion
  gsap.from('.animate', { opacity: 0, y: 40, stagger: 0.1 });
});
```

### Combined (Recommended)

```ts
gsap.matchMedia().add({
  isDesktop: '(min-width: 768px) and (prefers-reduced-motion: no-preference)',
  isMobile: '(max-width: 767px) and (prefers-reduced-motion: no-preference)',
  isReduced: '(prefers-reduced-motion: reduce)',
}, (context) => {
  const { isDesktop, isMobile, isReduced } = context.conditions!;

  if (isReduced) {
    // Show final state immediately, no animation
    gsap.set('.animate', { opacity: 1, y: 0 });
    return;
  }

  gsap.from('.animate', {
    opacity: 0,
    y: isDesktop ? 60 : 30,
    stagger: 0.1,
  });
});
```

**All frameworks**: matchMedia is framework-agnostic — works the same in React, Vue, and Svelte. Call it inside your framework's lifecycle hook.

---

## Performance

### Compositor-Only Properties

Animate only `transform` and `opacity` for 60fps.

| Prefer | Avoid | Why |
|--------|-------|-----|
| `x`, `y`, `scale`, `rotation` | `width`, `height`, `top`, `left` | Transforms skip layout recalculation |
| `opacity` / `autoAlpha` | `visibility` alone | Compositor-optimized |
| `xPercent`, `yPercent` | `margin`, `padding` | No reflow |

**autoAlpha**: Like `opacity` but also sets `visibility: hidden` at 0 — removes the element from the accessibility tree when invisible.

### will-change

```css
/* Only on elements that ARE animating — remove after */
.animating { will-change: transform, opacity; }
```

**Warning**: Don't blanket-apply `will-change`. Each declaration creates a new compositor layer and consumes GPU memory.

### quickTo (Pointer Followers)

Reuse a single tween for high-frequency updates (mousemove, scroll).

```ts
const xTo = gsap.quickTo('.cursor', 'x', { duration: 0.4, ease: 'power3' });
const yTo = gsap.quickTo('.cursor', 'y', { duration: 0.4, ease: 'power3' });

window.addEventListener('pointermove', (e) => {
  xTo(e.clientX);
  yTo(e.clientY);
});
```

**Why not gsap.to in a loop**: Creating a new tween every frame generates garbage. `quickTo` reuses one tween internally.

### gsap.ticker

Hook into GSAP's RAF loop instead of creating your own.

```ts
gsap.ticker.add((time) => {
  // Runs every frame — use for custom render loops
});
gsap.ticker.fps(60); // Cap frame rate
```

### Batch for Many Elements

Use `ScrollTrigger.batch()` instead of individual triggers when animating 20+ elements.

```ts
ScrollTrigger.batch('.card', {
  onEnter: (elements) => {
    gsap.to(elements, { opacity: 1, y: 0, stagger: 0.1 });
  },
  start: 'top 85%',
});
```

---

## Universal Accessibility Pattern

A reusable guard for any animation setup. Use this when `gsap.matchMedia()` is overkill.

```ts
function shouldAnimate(): boolean {
  return !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

// Usage
if (!shouldAnimate()) {
  gsap.set('.animate', { opacity: 1, y: 0 }); // Show final state
  return;
}
// ... proceed with animations
```

**Or use matchMedia** (preferred for complex cases — see the matchMedia section above).
