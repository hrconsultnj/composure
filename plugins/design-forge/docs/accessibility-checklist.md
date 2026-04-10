# Accessibility Checklist

Quick-reference checklist for WCAG 2.1 AA compliance with Design Forge components. Every item is actionable -- check it off before shipping.

## Reduced Motion

The most critical accessibility concern for a visual-heavy plugin.

- [ ] **All canvas animations** check `prefers-reduced-motion` and render a single static frame when enabled (`useCanvas` handles this automatically)
- [ ] **Framer Motion** uses `useReducedMotion()` to conditionally disable animations
- [ ] **CSS animations** include a media query override:

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

- [ ] **Auto-playing content** (typewriter, particle systems) shows static text/image instead
- [ ] **Parallax and scroll-linked effects** degrade to static positioning

## Decorative vs Meaningful

- [ ] Canvas visualizations use `role="img"` with `aria-label` when they convey meaning
- [ ] Purely decorative canvas elements use `aria-hidden="true"`
- [ ] Scanlines overlay has `aria-hidden="true"` and `pointer-events: none`
- [ ] Custom cursor elements have `aria-hidden="true"` (the real cursor still works)
- [ ] Glow overlays inside GlassPanel have `aria-hidden="true"`

## Keyboard Navigation

- [ ] All interactive elements (links, buttons) are reachable via Tab
- [ ] Focus order follows visual order (no `tabindex` > 0)
- [ ] Focus indicators are visible -- at minimum `outline: 2px solid` with sufficient contrast
- [ ] Modal/dialog content traps focus when open
- [ ] Skip-to-content link provided for pages with heavy header navigation:

```html
<a href="#main" style="position: absolute; top: -40px; left: 0; ...focus styles...">
  Skip to content
</a>
```

## Focus Indicators

- [ ] Default browser focus ring is not removed without replacement
- [ ] Custom focus styles have **3:1 contrast ratio** against adjacent colors
- [ ] Focus is visible on both light and dark backgrounds:

```css
:focus-visible {
  outline: 2px solid #4a78ff;
  outline-offset: 2px;
}
```

## Color Contrast

- [ ] Body text meets **4.5:1** contrast ratio against background
- [ ] Large text (18px+ bold or 24px+ regular) meets **3:1**
- [ ] UI components and icons meet **3:1**
- [ ] Design Forge defaults pass: `#e8e4dd` on `#070809` = **14.3:1**
- [ ] Accent colors used for text also pass: `#4a78ff` on `#070809` = **4.8:1**

**Tool:** Use the [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/) when customizing colors.

## ARIA Labels

- [ ] `<section>` elements have `aria-label` describing their purpose
- [ ] `<nav>` elements have `aria-label` (e.g., "Main navigation")
- [ ] Icon-only buttons have `aria-label` text
- [ ] Sound toggle button has `aria-label` reflecting current state
- [ ] GenerativeCanvas receives `aria-label` describing the visualization

## Semantic HTML

- [ ] Heading hierarchy is sequential (h1 > h2 > h3, no skipped levels)
- [ ] Lists use `<ul>` / `<ol>` / `<dl>` -- not styled divs
- [ ] Navigation uses `<nav>` element
- [ ] Main content uses `<main>` element
- [ ] Page sections use `<section>` with labels
- [ ] Footer uses `<footer>` element

## Touch Devices

- [ ] Custom cursor auto-disables on `pointer: coarse` devices (built into `CustomCursor`)
- [ ] Touch targets are at least **44x44px**
- [ ] Hover-only interactions have touch alternatives (tap instead of hover)
- [ ] No content is hidden behind hover-only states on mobile

## Sound

- [ ] Audio is **never auto-playing** -- requires explicit user gesture
- [ ] Sound toggle is visible and accessible
- [ ] `useSoundLayer` is opt-in by design (call `enable()` on user action)
- [ ] Sound state label reflects current state ("Mute" / "Unmute")

## Images and Media

- [ ] Decorative images have empty `alt=""` or `aria-hidden="true"`
- [ ] Meaningful images have descriptive `alt` text
- [ ] Video content has captions/transcripts
- [ ] Canvas content has text alternatives when conveying information

## Testing Checklist

Before shipping, verify with:

- [ ] **Keyboard only** -- navigate entire page with Tab, Enter, Escape
- [ ] **Screen reader** -- test with VoiceOver (Mac) or NVDA (Windows)
- [ ] **Reduced motion** -- enable in OS settings, verify static fallbacks
- [ ] **Zoom 200%** -- content remains readable and usable
- [ ] **High contrast mode** -- Windows high contrast mode doesn't hide content
- [ ] **axe DevTools** -- run browser extension, fix all violations

```bash
# Automated testing with axe-core
pnpm add -D @axe-core/playwright

# In your Playwright test:
import AxeBuilder from '@axe-core/playwright'

test('accessibility', async ({ page }) => {
  await page.goto('/')
  const results = await new AxeBuilder({ page }).analyze()
  expect(results.violations).toEqual([])
})
```

## Design Forge Defaults

These accessibility features are built in -- you get them automatically:

| Feature | Component | Behavior |
|---------|-----------|----------|
| Reduced motion | `useCanvas` | Renders 1 static frame, stops RAF |
| Touch detection | `CustomCursor` | Returns `null` on coarse pointer |
| Decorative labels | `Scanlines`, glow overlays | `aria-hidden="true"` |
| Canvas role | `GenerativeCanvas` | `role="img"` + `aria-label` |
| Pointer safety | All overlays | `pointer-events: none` |
| Sound opt-in | `useSoundLayer` | Requires `enable()` call |
| Typewriter fallback | `Typewriter` | Shows full text on reduced motion |
