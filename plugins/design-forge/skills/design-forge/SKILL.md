---
name: design-forge
description: This skill should be used when the user asks to "add premium animations", "create a canvas visualization", "build a glassmorphism panel", "add a custom cursor", "create a generative background", "build an interactive card", "add scroll progress", "add sound design", "create a Three.js hero", "build a creative portfolio", "add particle effects", "add scanlines", "add a typewriter effect", "design a landing page", "implement advanced animations", "add 3D elements", "design using Next.js Conf patterns", "create interactive experience", "add Framer Motion animations", "add GSAP scroll animations", "integrate Spline 3D", or needs guidance on premium web design patterns, creative coding, generative art, micro-interactions, accessibility for animations, or bespoke interactive experiences beyond standard UI components.
---

Design Forge provides production-ready components AND design methodology for building premium interactive web experiences in React/Next.js. It covers canvas visualizations, glassmorphism, animations (Framer Motion, GSAP), 3D (Three.js, Spline), micro-interactions, sound design, and accessibility.

## Content Loading

Load each step through the fetch command (handles caching, decryption, and auth):

```bash
"$HOME/.composure/bin/composure-fetch.mjs" skill design-forge design-forge {step-filename}
```

**Do NOT read cache files directly** — they are encrypted at rest. Always use the fetch command above.

## Templates

- `animations`
- `assets`
- `canvas-2d`
- `interactions`
- `layouts`
- `sections`
- `three-js`

## References

- `3d-integration.md`
- `accessibility.md`
- `animation-recipes.md`
- `asset-generation.md`
- `canvas-system.md`
- `design-patterns.md`
- `gsap-framework-patterns.md`
- `gsap-plugins.md`
- `gsap-scrolltrigger-advanced.md`
- `micro-interactions.md`
- `nextjs-conf-patterns.md`

## Categories

This skill has category-specific content:

- `taxonomy/` — 20 files

Fetch category content: `"$HOME/.composure/bin/composure-fetch.mjs" skill design-forge design-forge {category}/{filename}`
