---
name: ui-designer
description: Premium web animations, 3D, creative coding, generative art, and interactive experiences.
argument-hint: "[industry] [platform] [style]  or  [component-name]  or  assets [type]  or  sections"
---

Design Forge provides production-ready components AND design methodology for building premium interactive web experiences in React/Next.js. It covers canvas visualizations, glassmorphism, animations (Framer Motion, GSAP), 3D (Three.js, Spline), micro-interactions, sound design, and accessibility.

## Content Loading

Load each step through the fetch command (handles caching, decryption, and auth):

```bash
"$HOME/.composure/bin/composure-fetch.mjs" skill design-forge ui-designer {step-filename}
```

**Do NOT read cache files directly** — they are encrypted at rest. Always use the fetch command above.
