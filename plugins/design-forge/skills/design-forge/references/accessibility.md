# Accessibility Checklist

WCAG 2.1 AA requirements for premium web experiences. Animations and visual richness must not come at the cost of accessibility.

**Related**: The `useReducedMotion` hook in `${CLAUDE_PLUGIN_ROOT}/components/visualizations/canvas/` detects `prefers-reduced-motion` and is used by all canvas components.

---

## WCAG 2.1 AA — Required Minimums

### Perceivable

- [ ] **Color contrast** — Text ≥ 4.5:1, large text ≥ 3:1, UI components ≥ 3:1
- [ ] **Alt text** — All informational images have descriptive `alt`. Decorative images use `alt=""`
- [ ] **Video captions** — All video content has captions or transcripts
- [ ] **No color-only meaning** — Don't convey information through color alone (add icons, text, patterns)
- [ ] **Zoom** — Content readable at 200% zoom without horizontal scroll

### Operable

- [ ] **Keyboard navigation** — All interactive elements reachable and operable via keyboard
- [ ] **Focus indicators** — Visible focus ring on all interactive elements (never `outline: none` without replacement)
- [ ] **No keyboard traps** — Users can always Tab out of any component
- [ ] **Skip links** — "Skip to main content" link for keyboard users
- [ ] **Touch targets** — Minimum 44x44px on touch devices

### Understandable

- [ ] **Form labels** — Every input has an associated `<label>` or `aria-label`
- [ ] **Error messages** — Clear, specific error text connected via `aria-describedby`
- [ ] **Language** — `<html lang="en">` set correctly

### Robust

- [ ] **Valid HTML** — Semantic elements, proper heading hierarchy (h1 → h2 → h3)
- [ ] **ARIA** — Used only when native HTML semantics are insufficient
- [ ] **Screen reader tested** — Content reads in logical order

---

## Motion Accessibility

### CSS Approach

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

### Tailwind Utilities

```tsx
// Animation only for users who haven't requested reduced motion
<div className="motion-safe:animate-fadeIn motion-reduce:opacity-100">
  {content}
</div>
```

### Framer Motion

```tsx
<motion.div
  initial={{ opacity: 0 }}
  animate={{ opacity: 1 }}
  transition={{ duration: 0.3 }}
  // Framer Motion automatically respects prefers-reduced-motion
  // when using useReducedMotion() hook
>
  {content}
</motion.div>
```

### Canvas Visualizations

Design Forge canvas components handle this automatically via `useReducedMotion`:
- Reduced motion = one static frame rendered, RAF loop stopped
- Custom cursor = disabled entirely on touch/coarse pointers
- Sound = always opt-in, never auto-play

### Three.js / 3D Scenes

Replace animated 3D with a static image:

```tsx
const reducedMotion = useReducedMotion();

if (reducedMotion) {
  return <img src="/hero-static.webp" alt="Product visualization" />;
}

return <Scene3D />;
```

---

## Focus Management for Modals & Overlays

```tsx
// Trap focus inside modal
<dialog ref={dialogRef} onClose={onClose}>
  {/* Focus automatically trapped by native <dialog> */}
  <h2 id="modal-title">Title</h2>
  <div role="document" aria-labelledby="modal-title">
    {content}
  </div>
</dialog>
```

---

## ARIA Patterns for Design Forge Components

### Decorative Canvases

```tsx
<GenerativeCanvas
  aria-label="Decorative background animation"
  // canvas is role="img" by default — appropriate for decorative use
/>
```

### Scanlines Overlay

```tsx
<Scanlines
  // Already applies pointer-events: none
  // Add aria-hidden since it's purely decorative
  aria-hidden="true"
/>
```

### Custom Cursor

Already auto-disables on touch devices. For screen readers, the cursor is invisible — no ARIA needed since the underlying interactive elements carry their own labels.

---

## Testing Checklist

1. **Keyboard-only navigation** — Tab through the entire page. Can you reach and operate everything?
2. **Screen reader** — VoiceOver (Mac: Cmd+F5) or NVDA (Windows). Does content read logically?
3. **Zoom 200%** — Browser zoom to 200%. Does layout hold?
4. **Color contrast** — Use browser DevTools accessibility panel or axe DevTools extension
5. **Reduced motion** — Enable `prefers-reduced-motion: reduce` in DevTools. Do animations respect it?
6. **High contrast mode** — Windows High Contrast. Do borders and text remain visible?

---

## Success Criteria

A well-designed premium experience meets ALL of:
- WCAG 2.1 AA compliance
- Lighthouse Accessibility score > 90
- Smooth 60fps animations
- Graceful degradation with reduced motion
- Full keyboard operability
- Screen reader compatibility
