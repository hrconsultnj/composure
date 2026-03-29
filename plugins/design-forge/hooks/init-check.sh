#!/bin/bash
# ============================================================
# Design Forge Init Check — SessionStart Hook
# ============================================================
# Only announces Design Forge if the project uses design/canvas deps.
# Non-blocking (exit 0 always). Runs on startup only.

# Check for design-related dependencies in package.json
if [ -f "package.json" ]; then
  if grep -qE '"(framer-motion|gsap|three|@react-three/fiber|@react-three/drei|lottie-react|motion|animejs|p5)"' package.json 2>/dev/null; then
    printf 'Design Forge plugin active. Components: GenerativeCanvas, GlassPanel, CustomCursor, ScrollProgress, HoverCardCanvas, Scanlines, Typewriter, HeroScene, useSoundLayer. Presets: grid-field, orbital-ellipses, point-cloud, particle-system. Guides: animation-recipes, 3d-integration, micro-interactions, accessibility, nextjs-conf-patterns, design-patterns, canvas-system, gsap-framework-patterns, gsap-plugins, gsap-scrolltrigger-advanced. Use /design-forge to browse or ask about any pattern.\n'
    exit 0
  fi
fi

# Also check monorepo packages
for pkg in packages/*/package.json apps/*/package.json; do
  if [ -f "$pkg" ] && grep -qE '"(framer-motion|gsap|three|@react-three/fiber|@react-three/drei|lottie-react|motion|animejs|p5)"' "$pkg" 2>/dev/null; then
    printf 'Design Forge plugin active. Components: GenerativeCanvas, GlassPanel, CustomCursor, ScrollProgress, HoverCardCanvas, Scanlines, Typewriter, HeroScene, useSoundLayer. Presets: grid-field, orbital-ellipses, point-cloud, particle-system. Guides: animation-recipes, 3d-integration, micro-interactions, accessibility, nextjs-conf-patterns, design-patterns, canvas-system, gsap-framework-patterns, gsap-plugins, gsap-scrolltrigger-advanced. Use /design-forge to browse or ask about any pattern.\n'
    exit 0
  fi
done

# No design deps found — stay silent
exit 0
