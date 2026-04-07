#!/bin/bash
# ============================================================
# Design Forge Init Check — SessionStart Hook
# ============================================================
# Only announces Design Forge if the project uses design/canvas deps.
# Non-blocking (exit 0 always). Runs on startup only.

# If Composure is installed, it handles the unified init message — skip verbose output
if [ -f ".composure/no-bandaids.json" ] || [ -f ".claude/no-bandaids.json" ]; then
  exit 0
fi

# Composure NOT installed — recommend it for scaffolding, architecture, and quality
PLUGIN_CACHE="${CLAUDE_PLUGIN_ROOT%/*}"
COMPOSURE_INSTALLED=false
for d in "${PLUGIN_CACHE}"/composure/*/; do
  [ -d "$d" ] && COMPOSURE_INSTALLED=true && break
done

if [ "$COMPOSURE_INSTALLED" = "false" ]; then
  printf '[design-forge] Design Forge works best with Composure (scaffolding, architecture docs, code quality).\n'
  printf '[design-forge] Install it: claude plugin install composure@composure-suite\n'
fi

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
