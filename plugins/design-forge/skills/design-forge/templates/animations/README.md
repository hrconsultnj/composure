# Animation Templates

Production-ready animation snippets for React 19 / Next.js 15 projects. Each file is self-contained — install the dependency, drop in the code.

## Templates

| File | Dependency | Use When |
|------|-----------|----------|
| `motion-page-transition.tsx` | motion | Route changes need smooth enter/exit animations |
| `motion-stagger-list.tsx` | motion | Lists or grids should reveal items one by one |
| `motion-scroll-reveal.tsx` | motion | Sections should fade in as the user scrolls |
| `gsap-scroll-trigger.tsx` | gsap | Background elements need scroll-linked parallax |
| `gsap-pin-section.tsx` | gsap | A section should pin in place and animate a sequence on scroll |
| `gsap-split-text-reveal.tsx` | gsap + SplitText | Heading text should reveal character-by-character or word-by-word |
| `gsap-flip-layout.tsx` | gsap + Flip | Grid items should animate when reordered or filtered |
| `gsap-horizontal-gallery.tsx` | gsap | Panels should scroll horizontally driven by vertical scroll |
| `css-hover-transitions.tsx` | none | Hover effects needed without adding a JS animation library |
| `shared-layout-animation.tsx` | motion | Active indicators, tabs, or cards need to morph between states |

## Choosing a Library

**Start with CSS/Tailwind** for hover effects and simple transitions. Reach for **Framer Motion** when you need enter/exit animations, layout morphing, or viewport-triggered reveals. Use **GSAP** when you need scroll-scrubbing, pinned sections, or complex multi-step timelines.

```
Which animation?
  Static hover/transition  --> css-hover-transitions.tsx
  Page transitions         --> motion-page-transition.tsx
  List/grid reveal         --> motion-stagger-list.tsx
  Scroll fade-in           --> motion-scroll-reveal.tsx
  Scroll parallax          --> gsap-scroll-trigger.tsx
  Pinned scroll section    --> gsap-pin-section.tsx
  Text reveal (chars/words)--> gsap-split-text-reveal.tsx
  Grid reorder animation   --> gsap-flip-layout.tsx
  Horizontal scroll gallery--> gsap-horizontal-gallery.tsx
  Shared element morph     --> shared-layout-animation.tsx
```

## Accessibility

Every template includes `prefers-reduced-motion` support:

- **Framer Motion templates** use `useReducedMotion()` or Tailwind's `motion-reduce:` prefix
- **GSAP templates** check `window.matchMedia('(prefers-reduced-motion: reduce)')` and skip animation setup entirely
- **CSS templates** use `motion-safe:` and `motion-reduce:` Tailwind variants

## Installation

```bash
# Framer Motion templates
pnpm add motion

# GSAP templates
pnpm add gsap

# CSS templates — no extra dependencies
```
