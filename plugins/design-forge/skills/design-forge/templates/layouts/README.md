# Layout Templates

Premium layout patterns ready to copy into any Next.js / React project. All templates follow the Next.js Conf / Vercel / Geist design aesthetic: dark themes, sharp typography, deliberate whitespace, and subtle interaction.

## Quick Reference

| Template | Best For | Responsive |
|----------|----------|------------|
| `bento-grid` | Feature showcases, dashboards, portfolio highlights | 1 -> 2 -> 4 cols |
| `hero-split` | Product pages, landing pages with visual demos | Stacked -> side-by-side |
| `hero-centered` | Marketing heroes, conference pages, launch announcements | Fluid typography |
| `feature-cards` | Feature sections, pricing tiers, capability lists | 1 -> 2 -> 3 cols |
| `sticky-sidebar` | Documentation, settings pages, long-form content | Sidebar hidden on mobile |
| `masonry-grid` | Image galleries, testimonials, blog cards | 1 -> 2 -> 3 cols |
| `glassmorphism-dashboard` | Admin panels, analytics dashboards, control rooms | Sidebar -> bottom bar |

## Selection Guide

**"I need a hero section"**
- Visual demo on one side? -> `hero-split`
- Centered text + CTAs? -> `hero-centered`
- Both? Stack `hero-centered` above `bento-grid`

**"I need to display features"**
- 3-6 features with icons -> `feature-cards`
- Mixed sizes, visual hierarchy -> `bento-grid`
- Many items, variable heights -> `masonry-grid`

**"I need an app shell"**
- Dashboard with sidebar -> `glassmorphism-dashboard`
- Docs with navigation -> `sticky-sidebar`

## Design Tokens

All templates use these values from the Vercel/Geist system:

```
Background:  #000000 (page) / #0a0a0a (surfaces)
Text:        #ededed (primary) / #a1a1a1 (secondary) / #888 (muted)
Borders:     #333333 (default) / #444444 (hover)
Glass:       white/4% -> white/1% gradient, blur(28px)
Radius:      0px (sharp) or 12px (cards) — no 8px
Font:        Geist Sans (body) / Geist Mono (labels, code)
Tracking:    -4% to -6% on headings, normal on body
```

## Usage Pattern

Each template exports typed components with slot props:

```tsx
import { HeroCentered } from './templates/layouts/hero-centered'

export default function Page() {
  return (
    <HeroCentered
      heading="Your headline here"
      description="Supporting copy."
      primaryCta={<Button>Get Started</Button>}
      background={<GridLines />}
    />
  )
}
```

## Composition

Templates are designed to stack vertically. A typical landing page:

```tsx
<HeroCentered />
<FeatureCards />
<BentoGrid />
```

A typical docs page:

```tsx
<StickySidebar sidebar={<DocNav />} toc={<TableOfContents />}>
  <article>{mdxContent}</article>
</StickySidebar>
```

## Accessibility Checklist

All templates include:
- Semantic landmarks (`section`, `nav`, `main`, `aside`)
- Proper heading hierarchy (h1 in heroes, h2 in sections, h3 in cards)
- Focus-visible indicators on interactive cells
- `aria-label` on navigation regions
- `aria-hidden` on decorative elements
- Mobile-first responsive behavior (no content hidden permanently)
