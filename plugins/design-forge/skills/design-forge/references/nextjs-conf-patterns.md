# Next.js Conf & Vercel Design Patterns

Premium minimalist design patterns extracted from Next.js Conf (2024/2025), vercel.com, nextjs.org, and the Geist Design System. These patterns prioritize typography, whitespace, and deliberate motion over decoration.

> **Last researched**: 2026-03-23 (updated with live-extracted values from browser inspection)

---

## Table of Contents

1. [Color System (Geist)](#1-color-system-geist)
2. [Typography System](#2-typography-system)
3. [Hero Section Patterns](#3-hero-section-patterns)
4. [Navigation Patterns](#4-navigation-patterns)
5. [Card & Bento Grid Layouts](#5-card--bento-grid-layouts)
6. [Button Variants](#6-button-variants)
7. [Gradient & Background Treatments](#7-gradient--background-treatments)
8. [Animation & Interaction Patterns](#8-animation--interaction-patterns)
9. [Code Block Styling](#9-code-block-styling)
10. [Section Patterns](#10-section-patterns)
11. [Dark/Light Mode Implementation](#11-darklight-mode-implementation)
12. [Web Interface Guidelines (Vercel)](#12-web-interface-guidelines-vercel)
13. [Geist Pixel Display Font](#13-geist-pixel-display-font)
14. [What's Timeless: Patterns That Persist](#14-whats-timeless-patterns-that-persist-oct-2025---mar-2026)

---

## 1. Color System (Geist)

### CSS Variable Architecture

Geist uses a 10-step semantic scale per color family with `--ds-` prefix:

```css
/* Backgrounds (pages, root containers) */
--ds-background-100   /* Default page background */
--ds-background-200   /* Secondary/subtle background differentiation */

/* Gray Scale (component backgrounds -> text) */
--ds-gray-100         /* Component default background */
--ds-gray-200         /* Component hover background */
--ds-gray-300         /* Component active background */
--ds-gray-400         /* Default border */
--ds-gray-500         /* Hover border */
--ds-gray-600         /* Active border */
--ds-gray-700         /* High contrast background */
--ds-gray-800         /* High contrast hover background */
--ds-gray-900         /* Secondary text and icons */
--ds-gray-1000        /* Primary text and icons */
```

Same pattern for: `--ds-blue-*`, `--ds-red-*`, `--ds-amber-*`, `--ds-green-*`, `--ds-teal-*`, `--ds-purple-*`, `--ds-pink-*`

### Concrete Hex Values (Legacy/Classic Vercel Palette)

These values come from the established Vercel CSS variables system:

```css
:root {
  /* Accent gray scale (light mode) */
  --accents-1: #fafafa;
  --accents-2: #eaeaea;
  --accents-3: #999999;
  --accents-4: #888888;
  --accents-5: #666666;
  --accents-6: #444444;
  --accents-7: #333333;
  --accents-8: #111111;

  /* Core */
  --geist-white: #ffffff;
  --geist-black: #000000;
  --geist-background: var(--geist-white);
  --geist-foreground: var(--geist-black);

  /* Brand blue */
  --geist-success: #0070f3;
  --geist-success-light: #3291ff;
  --geist-success-lighter: #d3e5ff;
  --geist-success-dark: #0761d1;

  /* Error red */
  --geist-error: #ee0000;
  --geist-error-light: #ff1a1a;
  --geist-error-lighter: #f7d4d6;
  --geist-error-dark: #c50000;

  /* Warning amber */
  --geist-warning: #f5a623;
  --geist-warning-light: #f7b955;
  --geist-warning-lighter: #ffefcf;
  --geist-warning-dark: #ab570a;

  /* Violet */
  --geist-violet: #7928ca;
  --geist-violet-light: #8a63d2;
  --geist-violet-lighter: #e3d7fc;
  --geist-violet-dark: #4c2889;

  /* Cyan */
  --geist-cyan-light: #79ffe1;
  --geist-cyan-lighter: #aaffec;
}
```

### Practical Dark Mode Palette

```css
/* Dark theme values commonly observed on vercel.com */
--background: #000000;        /* Pure black */
--background-subtle: #0a0a0a; /* Near-black */
--surface-1: #111111;         /* Card backgrounds */
--surface-2: #171717;         /* Elevated surfaces */
--border-default: #333333;    /* Borders */
--border-hover: #444444;      /* Hovered borders */
--text-primary: #ededed;      /* Primary text */
--text-secondary: #a1a1a1;    /* Secondary text */
--text-tertiary: #888888;     /* Muted text */

/* Light theme values */
--background: #ffffff;
--background-subtle: #fafafa;
--surface-1: #ffffff;
--border-default: #eaeaea;
--text-primary: #000000;
--text-secondary: #666666;
```

### Tailwind Configuration

```ts
// tailwind.config.ts
export default {
  theme: {
    extend: {
      colors: {
        background: {
          DEFAULT: 'var(--ds-background-100)',
          subtle: 'var(--ds-background-200)',
        },
        gray: {
          100: 'var(--ds-gray-100)',
          200: 'var(--ds-gray-200)',
          300: 'var(--ds-gray-300)',
          400: 'var(--ds-gray-400)',
          500: 'var(--ds-gray-500)',
          600: 'var(--ds-gray-600)',
          700: 'var(--ds-gray-700)',
          800: 'var(--ds-gray-800)',
          900: 'var(--ds-gray-900)',
          1000: 'var(--ds-gray-1000)',
        },
      },
    },
  },
}
```

---

## 2. Typography System

### Font Families

```ts
// app/layout.tsx
import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
```

```css
/* CSS variables */
--font-geist-sans  /* Primary UI font */
--font-geist-mono  /* Code, labels, technical content */

/* Tailwind config */
fontFamily: {
  sans: ['var(--font-geist-sans)'],
  mono: ['var(--font-geist-mono)'],
}
```

### Typography Scale (Tailwind Classes) — Verified March 2026

Geist provides composite typography classes that bundle font-size, line-height, letter-spacing, and font-weight. Extracted from live `vercel.com/geist/typography`:

```
CLASS                   SIZE    LINE-HT  TRACKING       WEIGHT  USAGE
─────────────────────── ─────── ──────── ────────────── ─────── ─────────────────────────────
/* Headings */
text-heading-72         72px    72px     -4.32px (-6%)  600     Marketing heroes
text-heading-64         64px    64px     -3.84px (-6%)  600     —
text-heading-56         56px    56px     -3.36px (-6%)  600     —
text-heading-48         48px    56px     -2.88px (-6%)  600     vercel.com hero H1
text-heading-40         40px    48px     -2.4px  (-6%)  600     —
text-heading-32         32px    40px     -1.28px (-4%)  600     Section headers, dashboards
text-heading-24         24px    32px     -0.96px (-4%)  600     Card headers
text-heading-20         20px    26px     -0.4px  (-2%)  600     —
text-heading-16         16px    24px     -0.32px (-2%)  600     —
text-heading-14         14px    20px     -0.28px (-2%)  600     —

/* Copy (multi-line, higher line-height) */
text-copy-24            24px    36px     normal         400     Hero body marketing
text-copy-20            20px    36px     normal         400     Hero subtitles
text-copy-18            18px    28px     normal         400     Marketing paragraphs
text-copy-16            16px    28px     normal         400     Default body, modals
text-copy-14            14px    24px     normal         400     Most common body text
text-copy-13            13px    20px     normal         400     Secondary, compact
text-copy-13-mono       13px    20px     normal         400     Inline code mentions

/* Labels (single-line, generous LH for icons) */
text-label-20           20px    32px     normal         400     Marketing text
text-label-18           18px    20px     normal         400     —
text-label-16           16px    20px     normal         400     Titles, differentiation
text-label-14           14px    20px     normal         400     Most common (menus)
text-label-14-mono      14px    20px     normal         400     Largest mono pairing
text-label-13           13px    16px     normal         400     Secondary, tabular nums
text-label-13-mono      13px    16px     normal         400     Pairs with Label 14
text-label-12           12px    16px     normal         400     Tertiary, caps, calendars
text-label-12-mono      12px    16px     normal         400     —

/* Buttons */
text-button-16          16px    20px     normal         500     Largest button
text-button-14          14px    20px     normal         500     Default button
text-button-12          12px    16px     normal         500     Tiny input buttons

/* Notes:
   - <strong> nested in a typography class applies the "Strong" modifier
   - Heading tracking formula: roughly -6% above 40px, -4% at 24-32px, -2% below
   - Copy vs Label: Copy has higher line-height for multi-line text
   - Font: Geist Sans (all), Geist Mono (*-mono variants)
*/
```

### Practical Heading Pattern (without Geist classes)

```tsx
{/* Hero headline — tight tracking, heavy weight */}
<h1 className="text-5xl md:text-7xl lg:text-[80px] font-semibold
               tracking-[-0.04em] leading-[0.95]
               font-sans">
  Build and deploy<br />on the AI Cloud
</h1>

{/* Section header */}
<h2 className="text-3xl md:text-4xl lg:text-5xl font-medium
               tracking-[-0.03em] leading-[1.1]">
  Your complete platform
</h2>

{/* Card title */}
<h3 className="text-lg md:text-xl font-medium tracking-tight">
  Instant Rollbacks
</h3>

{/* Body text */}
<p className="text-base md:text-lg text-gray-900 leading-relaxed">
  {description}
</p>

{/* Eyebrow / overline */}
<span className="text-sm font-medium uppercase tracking-widest
                 text-gray-900 font-mono">
  Features
</span>
```

### Typography Rules (from Vercel Guidelines)

- Use curly quotes (" ") not straight quotes (" ")
- Use ellipsis character (...) not three periods (...)
- Use `font-variant-numeric: tabular-nums` for numeric comparisons
- Separate numbers from units with non-breaking space: `10&nbsp;MB`
- Use numerals for counts: "8 deployments" not "eight deployments"
- Avoid widows/orphans; tidy rag and line breaks

### Spacing System (Verified March 2026)

Geist uses a 4px base unit with named aliases:

```css
--geist-space: 4px;
--geist-space-2x: 8px;
--geist-space-3x: 12px;
--geist-space-4x: 16px;
--geist-space-6x: 24px;
--geist-space-8x: 32px;
--geist-space-10x: 40px;
--geist-space-16x: 64px;
--geist-space-24x: 96px;
--geist-space-32x: 128px;
--geist-space-48x: 192px;
--geist-space-64x: 256px;

/* Named sizes */
--geist-space-small: 32px;
--geist-space-medium: 40px;
--geist-space-large: 48px;

/* Gap aliases (used in grid/flex) */
--geist-space-gap: 24px;
--geist-space-gap-half: 12px;
--geist-space-gap-quarter: 8px;
```

### Materials / Surface System (Verified March 2026)

Geist defines material classes for elevation via border + box-shadow combos:

```css
/* Surface materials (on the page) */
.material-base {
  /* Everyday use. Radius 6px. */
  background: rgb(10, 10, 10);
  border-radius: 6px;
  box-shadow:
    rgba(255, 255, 255, 0.145) 0px 0px 0px 1px,  /* subtle white ring */
    rgb(0, 0, 0) 0px 0px 0px 1px;                 /* outer ring */
}

.material-small {
  /* Slightly raised. Radius 6px. */
  background: rgb(10, 10, 10);
  border-radius: 6px;
  box-shadow:
    rgba(255, 255, 255, 0.145) 0px 0px 0px 1px,
    rgba(0, 0, 0, 0.16) 0px 1px 2px 0px,          /* drop shadow */
    rgb(0, 0, 0) 0px 0px 0px 1px;
}

.material-medium {
  /* Further raised. Radius 12px. */
  background: rgb(10, 10, 10);
  border-radius: 12px;
  box-shadow:
    rgba(255, 255, 255, 0.145) 0px 0px 0px 1px,
    rgba(0, 0, 0, 0.32) 0px 2px 2px 0px,
    rgba(0, 0, 0, 0.16) 0px 8px 8px -8px,
    rgb(0, 0, 0) 0px 0px 0px 1px;
}

.material-large {
  /* Further raised. Radius 12px. */
  background: rgb(10, 10, 10);
  border-radius: 12px;
  box-shadow:
    rgba(255, 255, 255, 0.145) 0px 0px 0px 1px,
    rgba(0, 0, 0, 0.04) 0px 2px 2px 0px,
    /* additional shadow layers for higher elevation */
    rgb(0, 0, 0) 0px 0px 0px 1px;
}

/* Floating materials (above the page) */
.material-tooltip   { border-radius: 6px;  /* lightest shadow, triangular stem */ }
.material-menu      { border-radius: 12px; /* lift from page */ }
.material-modal     { border-radius: 12px; /* further lift */ }
.material-fullscreen{ border-radius: 16px; /* biggest lift */ }

/* Pattern: white ring at 14.5% opacity is the Geist signature border */
/* Use inset box-shadow 0 0 0 1px rgba(255,255,255,0.145) instead of border */
```

---

## 3. Hero Section Patterns

### Pattern A: Next.js Conf 2025 (Minimal + Monospace)

Uses Geist Pixel display font with scramble text animation on links, minimal color, `bg-background-200` base.

```tsx
<section className="relative min-h-[calc(100vh-var(--header-height)-var(--footer-height))]
                    bg-background-200">
  <div className="mx-auto max-w-7xl px-6 md:px-20 py-24 md:py-32
                  flex flex-col justify-center">
    {/* Pixel font hero text (Conf 2025 uses GeistPixelCircle/Square) */}
    <h1 className="font-pixel text-6xl md:text-8xl lg:text-[120px]
                   font-normal tracking-tight leading-none">
      Next.js Conf
    </h1>

    <p className="mt-6 text-lg md:text-xl text-gray-900 max-w-xl font-mono">
      October 22, 2025 — San Francisco
    </p>

    <div className="mt-10 flex items-center gap-6">
      <a href="/conf/speakers"
         className="text-sm md:text-base font-mono
                    hover:underline transition-colors">
        Speakers
      </a>
      <a href="/conf#sessions"
         className="text-sm md:text-base font-mono
                    hover:underline transition-colors">
        Sessions
      </a>
    </div>
  </div>
</section>
```

### Pattern B: Vercel Homepage (Dark + Dual CTA) — Verified March 2026

Live-extracted values from vercel.com (March 2026):

```
ELEMENT              VALUE (VERIFIED)
──────────────────── ─────────────────────────────────────────────
Page background      #000000
Hero H1 text         rgb(237,237,237) = #ededed
Hero H1 size         48px / line-height 48px
Hero H1 tracking     -2.4px (matches text-heading-48 exactly)
Hero H1 weight       600 (semibold)
Subtitle size        20px / line-height 36px (matches text-copy-20)
Subtitle color       rgb(161,161,161) = #a1a1a1 (--ds-gray-900)
Nav buttons          bg: rgb(10,10,10), border-radius: 6px, h: 32px
Nav font             14px, weight 500
Events badge color   rgb(82,168,255) = #52a8ff (custom blue)
Events badge size    12px, weight 500
Font stack           Geist, Arial, "Apple Color Emoji", ...
```

Announcement banner above hero: "Events" badge in blue (`#52a8ff`), event text, "Save the date" outline button. Grid-line background pattern overlaid on hero area with subtle crosshatch at section boundaries.

```tsx
<section className="relative min-h-screen bg-black text-white overflow-hidden">
  {/* Grid-line background — Vercel's signature crosshatch */}
  <div className="absolute inset-0 pointer-events-none">
    {/* Implemented via SVG or CSS gradient repeating lines */}
    {/* Vertical + horizontal thin lines at ~128px intervals, ~#1f1f1f color */}
  </div>

  {/* Prism/gradient orb below hero text */}
  <div className="absolute inset-0 overflow-hidden">
    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/3
                    w-[800px] h-[600px]">
      {/* Multi-color radial gradient: green, blue, red bands
          with a metallic triangle (Vercel logo) at center */}
    </div>
  </div>

  <div className="relative z-10 mx-auto max-w-5xl px-6 py-32 md:py-48
                  flex flex-col items-center text-center">
    {/* Announcement banner */}
    <div className="mb-8 flex items-center gap-3 text-sm">
      <span className="text-xs font-medium text-[#52a8ff]">Events</span>
      <span className="text-[#ededed]">Ship 26 is coming to 5 cities</span>
      <a className="inline-flex items-center gap-1 rounded-full
                    border border-[#333] px-3 py-1 text-xs text-[#ededed]
                    hover:bg-white/5 transition-colors">
        Save the date <svg className="h-3 w-3" /* chevron */ />
      </a>
    </div>

    {/* H1 — uses text-heading-48 class */}
    <h1 className="text-heading-48 text-[#ededed] max-w-4xl">
      Build and deploy on the AI Cloud.
    </h1>

    {/* Subtitle — uses text-copy-20 class */}
    <p className="mt-6 text-copy-20 text-[#a1a1a1] max-w-2xl">
      Vercel provides the developer tools and cloud infrastructure
      to build, scale, and secure a faster, more personalized web.
    </p>

    <div className="mt-10 flex flex-col sm:flex-row gap-4">
      {/* Primary CTA — pill, white bg, includes Vercel triangle icon */}
      <a href="/new"
         className="inline-flex items-center justify-center gap-2
                    rounded-full bg-white text-black
                    h-12 px-8 text-sm font-medium
                    hover:bg-gray-200 transition-colors">
        <svg /* Vercel triangle */ className="h-4 w-4" />
        Start Deploying
      </a>
      {/* Secondary CTA — pill, outline */}
      <a href="/contact/sales"
         className="inline-flex items-center justify-center
                    rounded-full border border-[#333]
                    bg-transparent text-[#ededed]
                    h-12 px-8 text-sm font-medium
                    hover:bg-white/5 transition-colors">
        Get a Demo
      </a>
    </div>
  </div>
</section>
```

### Pattern C: nextjs.org Homepage — Verified March 2026

Live-extracted values:

```
ELEMENT              VALUE (VERIFIED)
──────────────────── ─────────────────────────────────────────────
Page background      rgb(0,0,0) = #000000
H1 text              "The React Framework for the Web"
H1 size              76px / line-height 76px
H1 tracking          -3.8px (-5%)
H1 weight            600, text-align: center
H1 color             rgb(237,237,237) = #ededed
Subtitle size        20px / line-height 36px
Subtitle color       rgb(136,136,136) = #888888 (--accents-5)
Subtitle align       center
Code snippet font    "Geist Mono", ui-monospace, SFMono-Regular, ...
Code snippet size    13px / color: #ededed
Font stack           Geist, Inter, -apple-system, system-ui, ...
Feature card border  1px solid rgb(51,51,51) = #333333
Feature card radius  12px
Feature card padding 24px
Feature card bg      rgb(0,0,0) / rgba(0,0,0,0)
```

### Pattern D: Next.js Conf 2025 — Before & After

**PRE-CONFERENCE (Oct 14, 2025):** Registration page with "Next.js Conf is here" heading, venue/date info, ticket pricing ($800 in-person / Free virtual), "Get Tickets" blue CTA, featured speakers list. Nav: SCHEDULE, SPEAKERS, FAQ, SIGN UP, LOGIN.

**POST-CONFERENCE (Oct 24, 2025 - present):** Recap page with video hero showing keynote speakers (Guillermo Rauch, Sam Selikoff, Jimmy Lai) with blue pixel/halftone pattern decorations on white background. Nav changed to: SPEAKERS, SESSIONS, WORKSHOPS, LOGIN.

Live-extracted Conf 2025 values (March 2026):

```
ELEMENT              VALUE (VERIFIED)
──────────────────── ─────────────────────────────────────────────
Page background      near-black (lab color space)
Hero area            White background card with blue pixel squares
Hero H1              "Opening keynote" — italic, ~56px
Speaker names        All-caps monospace, ~16px
Nav links            Uppercase, 16px, letter-spacing: 0.32px
"New" badge          Blue bg, white text, rounded-full
Primary CTA          bg: rgb(0,87,255) = #0057ff, white text
                     border-radius: 0px (SQUARE, not rounded!)
                     height: 48px, width: 250px, font-weight: 600
Secondary CTA        Transparent bg, 1px border, border-radius: 4px
                     height: 48px, width: 250px
Conf subtitle font   "Geist Mono" — monospace for date/location text
```

Key design insight: The Conf 2025 page deliberately breaks from the standard Vercel dark/rounded aesthetic. It uses **square-cornered buttons**, a **white hero area** (light mode island in dark page), **blue pixel halftone patterns** (leveraging Geist Pixel font inspiration), and **all-caps uppercase nav** with wide letter-spacing. This is an event-specific identity system layered on top of the base Geist system.

### Pattern E: Next.js Conf 2024 (Video Hero)

```tsx
<section className="relative w-full overflow-hidden">
  {/* Full-width autoplay video */}
  <video
    autoPlay muted loop playsInline
    className="w-full aspect-video object-cover"
  >
    <source src="/conf-hero.mp4" type="video/mp4" />
  </video>

  {/* Mix-blend overlay for subtle darkening */}
  <div className="absolute inset-0 bg-black/20 mix-blend-difference" />

  {/* Content overlay */}
  <div className="absolute inset-0 flex items-end p-6 md:p-20">
    <div className="animate-fade-up">
      <h1 className="text-[32px] font-semibold text-white">
        Next.js Conf 2024
      </h1>
      <p className="mt-2 text-xl text-white/80 leading-8">
        October 24 — San Francisco & Online
      </p>
    </div>
  </div>
</section>
```

---

## 4. Navigation Patterns

### Vercel.com Header — Verified March 2026

```
ELEMENT              VALUE (VERIFIED)
──────────────────── ─────────────────────────────────────────────
Header bg            transparent (rgba(0,0,0,0))
Position             sticky top-0
Nav links            14px, weight 400, color: #ededed
"Ask AI" button      bg: #0a0a0a, 14px, weight 500, h: 32px, radius: 6px
"Log In" button      bg: #0a0a0a, 14px, weight 500, h: 32px, radius: 6px
"Sign Up" button     bg: #ededed (inverted), color: #0a0a0a, h: 32px, radius: 6px
Nav items            Products(dropdown), Resources(dropdown), Solutions(dropdown),
                     Enterprise, Pricing
Max width            ~1448px
```

```tsx
<header className="sticky top-0 z-50 w-full bg-transparent">
  <div className="mx-auto flex h-16 max-w-[1448px] items-center justify-between
                  px-6 md:px-8">
    {/* Logo */}
    <a href="/" className="flex items-center gap-2">
      <svg /* Vercel triangle logo */ className="h-5 w-5" />
      <span className="font-semibold text-sm">Vercel</span>
    </a>

    {/* Desktop navigation */}
    <nav className="flex flex-1 items-center gap-6 lg:gap-8
                    justify-start ml-8">
      <button className="text-sm text-[#ededed] hover:text-white
                         inline-flex items-center gap-1 transition-colors">
        Products <svg className="h-3 w-3" /* chevron */ />
      </button>
      <button className="text-sm text-[#ededed] inline-flex items-center gap-1">
        Resources <svg className="h-3 w-3" />
      </button>
      <button className="text-sm text-[#ededed] inline-flex items-center gap-1">
        Solutions <svg className="h-3 w-3" />
      </button>
      <a className="text-sm text-[#ededed]" href="/enterprise">Enterprise</a>
      <a className="text-sm text-[#ededed]" href="/pricing">Pricing</a>
    </nav>

    {/* Right side — dark bg buttons (pill-like) */}
    <nav className="flex items-center gap-2">
      <a className="h-8 px-3 rounded-md bg-[#0a0a0a] text-[#ededed]
                    text-sm font-medium inline-flex items-center"
         href="/ask-ai">Ask AI</a>
      <a className="h-8 px-3 rounded-md bg-[#0a0a0a] text-[#ededed]
                    text-sm font-medium inline-flex items-center"
         href="/login">Log In</a>
      <a className="h-8 px-3 rounded-md bg-[#ededed] text-[#0a0a0a]
                    text-sm font-medium inline-flex items-center"
         href="/signup">Sign Up</a>
    </nav>
  </div>
</header>
```

### Sidebar Navigation (Vercel Dashboard Style)

```tsx
{/* Resizable sidebar — collapsible */}
<aside className="fixed left-0 top-0 z-40 h-screen w-60
                  border-r border-gray-400 bg-background-100
                  transition-all duration-200
                  data-[collapsed=true]:w-14">
  <div className="flex h-full flex-col">
    {/* Team switcher */}
    <div className="flex h-14 items-center gap-3 border-b border-gray-400 px-4">
      <div className="h-6 w-6 rounded-full bg-gradient-to-br from-pink-500 to-violet-500" />
      <span className="text-sm font-medium truncate">My Team</span>
    </div>

    {/* Nav links */}
    <nav className="flex-1 overflow-y-auto py-2">
      <a href="/dashboard"
         className="flex items-center gap-3 px-4 py-2 text-sm
                    text-gray-900 hover:bg-gray-200 rounded-md mx-2
                    data-[active=true]:bg-gray-200 data-[active=true]:text-gray-1000">
        <svg /* icon */ className="h-4 w-4 text-gray-900" />
        Overview
      </a>
      {/* ... more links */}
    </nav>
  </div>
</aside>

{/* Mobile: floating bottom bar */}
<nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden
                border-t border-gray-400 bg-background-100
                safe-area-pb">
  <div className="flex items-center justify-around h-14">
    {/* 4-5 icon tabs */}
  </div>
</nav>
```

### Documentation Sidebar (nextjs.org Style)

```tsx
<aside className="sticky top-16 h-[calc(100vh-4rem)] w-64 overflow-y-auto
                  border-r border-gray-400 py-6 pr-4">
  {/* Category */}
  <div className="mb-4">
    <h4 className="text-sm font-semibold text-gray-1000 px-3 mb-1">
      Getting Started
    </h4>
    <ul className="space-y-0.5">
      <li>
        <a href="/docs/installation"
           className="flex items-center px-3 py-1.5 text-sm rounded-md
                      text-gray-900 hover:text-gray-1000 hover:bg-gray-200
                      data-[active=true]:bg-blue-100 data-[active=true]:text-blue-700
                      data-[active=true]:font-medium transition-colors">
          Installation
        </a>
      </li>
    </ul>
  </div>
</aside>
```

---

## 5. Card & Bento Grid Layouts

### Elevated Card

```tsx
<div className="group rounded-lg border border-gray-400 bg-background-100 p-6
                transition-all duration-300
                hover:border-gray-500 hover:shadow-lg hover:-translate-y-0.5">
  <div className="mb-4 flex h-10 w-10 items-center justify-center
                  rounded-lg bg-gray-200">
    <svg className="h-5 w-5 text-gray-1000" />
  </div>
  <h3 className="text-lg font-medium tracking-tight text-gray-1000">{title}</h3>
  <p className="mt-2 text-sm text-gray-900 leading-relaxed">{description}</p>
</div>
```

### Spotlight Card (Mouse-tracking Glow)

```tsx
function SpotlightCard({ children }: { children: React.ReactNode }) {
  const cardRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    cardRef.current.style.setProperty('--mouse-x', `${x}px`);
    cardRef.current.style.setProperty('--mouse-y', `${y}px`);
  };

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      className="group relative rounded-xl border border-gray-400 bg-background-100 p-6
                 overflow-hidden transition-colors hover:border-gray-500"
    >
      {/* Spotlight glow */}
      <div className="pointer-events-none absolute -inset-px opacity-0
                      group-hover:opacity-100 transition-opacity duration-300"
           style={{
             background: `radial-gradient(
               300px circle at var(--mouse-x) var(--mouse-y),
               rgba(0, 112, 243, 0.1),
               transparent 60%
             )`,
           }}
      />
      <div className="relative z-10">{children}</div>
    </div>
  );
}
```

### Bento Grid (3-Column)

```tsx
<div className="grid grid-cols-1 gap-4 md:grid-cols-3 md:gap-6">
  {/* Large card — spans 2 columns */}
  <div className="md:col-span-2 rounded-xl border border-gray-400
                  bg-background-100 p-8 overflow-hidden">
    <h3 className="text-xl font-medium">{title}</h3>
    <p className="mt-2 text-sm text-gray-900">{description}</p>
    <div className="mt-6 -mx-8 -mb-8">
      <img src={preview} alt="" className="w-full" />
    </div>
  </div>

  {/* Small card */}
  <div className="rounded-xl border border-gray-400
                  bg-background-100 p-8">
    <h3 className="text-xl font-medium">{title}</h3>
    <p className="mt-2 text-sm text-gray-900">{description}</p>
  </div>

  {/* Second row — 3 equal cards */}
  {features.map((feature) => (
    <div key={feature.id}
         className="rounded-xl border border-gray-400
                    bg-background-100 p-6">
      <div className="mb-3 flex h-8 w-8 items-center justify-center
                      rounded-md bg-gray-200">
        <feature.icon className="h-4 w-4" />
      </div>
      <h4 className="text-base font-medium">{feature.title}</h4>
      <p className="mt-1.5 text-sm text-gray-900">{feature.description}</p>
    </div>
  ))}
</div>
```

### Bento Grid (2-Column with Asymmetry)

```tsx
<div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6">
  {/* Row 1 */}
  <div className="rounded-xl border border-gray-400 bg-background-100 p-8">
    {/* Feature with code snippet preview */}
  </div>
  <div className="rounded-xl border border-gray-400 bg-background-100 p-8">
    {/* Feature with metric/graph */}
  </div>

  {/* Row 2 — full width */}
  <div className="md:col-span-2 rounded-xl border border-gray-400
                  bg-background-100 p-8">
    {/* Wide feature showcase */}
  </div>
</div>
```

### Session/Talk Card (Conference Style)

```tsx
<a href={`/conf/sessions/${slug}`}
   className="group block rounded-lg overflow-hidden
              border border-gray-400 bg-background-100
              transition-all duration-200
              hover:border-gray-500 hover:shadow-md">
  {/* Thumbnail */}
  <div className="relative aspect-video bg-gray-200 overflow-hidden">
    <img src={thumbnail}
         alt=""
         className="h-full w-full object-cover
                    transition-transform duration-300
                    group-hover:scale-[1.02]" />
    {/* Duration badge */}
    <span className="absolute bottom-2 right-2 rounded bg-black/70
                     px-1.5 py-0.5 text-xs font-mono text-white">
      {duration}
    </span>
  </div>
  {/* Meta */}
  <div className="p-4">
    <h4 className="text-base font-medium tracking-tight line-clamp-2">
      {title}
    </h4>
    <p className="mt-1 text-sm text-gray-900">{speaker}</p>
  </div>
</a>
```

---

## 6. Button Variants

### Geist Button System

Variants: **Default** (primary), **Secondary**, **Tertiary**, **Error** (destructive), **Warning**
Sizes: **Small**, **Medium** (default), **Large**
Shapes: Default (rounded-md) and `shape="rounded"` (pill)

```tsx
{/* Primary — solid foreground color */}
<button className="inline-flex items-center justify-center
                   rounded-md bg-gray-1000 text-background-100
                   h-10 px-4 text-sm font-medium
                   hover:bg-gray-800 active:bg-gray-700
                   disabled:opacity-50 disabled:pointer-events-none
                   transition-colors">
  Deploy
</button>

{/* Secondary */}
<button className="inline-flex items-center justify-center
                   rounded-md bg-gray-200 text-gray-1000
                   h-10 px-4 text-sm font-medium
                   hover:bg-gray-300 active:bg-gray-400
                   border border-gray-400
                   transition-colors">
  Cancel
</button>

{/* Tertiary (ghost) */}
<button className="inline-flex items-center justify-center
                   rounded-md bg-transparent text-gray-1000
                   h-10 px-4 text-sm font-medium
                   hover:bg-gray-200
                   transition-colors">
  Learn More
</button>

{/* Error / Destructive */}
<button className="inline-flex items-center justify-center
                   rounded-md bg-red-700 text-white
                   h-10 px-4 text-sm font-medium
                   hover:bg-red-800
                   transition-colors">
  Delete
</button>

{/* Pill / Rounded (marketing CTAs) */}
<button className="inline-flex items-center justify-center
                   rounded-full bg-white text-black
                   h-12 px-8 text-sm font-medium
                   shadow-sm hover:bg-gray-100
                   transition-colors">
  Start Deploying
</button>

{/* Outline pill */}
<button className="inline-flex items-center justify-center
                   rounded-full border border-gray-400
                   bg-transparent text-gray-1000
                   h-12 px-8 text-sm font-medium
                   hover:bg-gray-200 hover:border-gray-500
                   transition-colors">
  Get a Demo
</button>

{/* Icon-only (requires aria-label) */}
<button aria-label="Settings"
        className="inline-flex items-center justify-center
                   rounded-md h-10 w-10
                   hover:bg-gray-200 text-gray-900
                   transition-colors">
  <svg className="h-4 w-4" />
</button>

{/* Button with loading state */}
<button disabled={isLoading}
        className="inline-flex items-center justify-center gap-2
                   rounded-md bg-gray-1000 text-background-100
                   h-10 px-4 text-sm font-medium
                   disabled:opacity-70 transition-colors">
  {isLoading && <Spinner className="h-4 w-4 animate-spin" />}
  {isLoading ? 'Deploying...' : 'Deploy'}
</button>
```

### Button Sizes

```tsx
{/* Small:  h-8  px-3  text-xs */}
{/* Medium: h-10 px-4  text-sm (default) */}
{/* Large:  h-12 px-6  text-base */}
```

### Scale Animation (Next.js Conf 2024 Pattern)

```tsx
<button className="... hover:scale-[1.01] active:scale-[0.99]
                   transition-transform duration-200">
  {label}
</button>
```

---

## 7. Gradient & Background Treatments

### Vercel Animated Gradient Text

Cycles through multiple gradient overlays with staggered opacity keyframes:

```css
:root {
  --gradient-color-1: #ef008f;  /* Pink */
  --gradient-color-2: #6ec3f4;  /* Cyan */
  --gradient-color-3: #7038ff;  /* Purple */
  --gradient-color-4: #c9c9c9;  /* Gray */
}

.gradient-text-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  -webkit-text-fill-color: transparent;
  -webkit-background-clip: text;
  background-clip: text;
}

/* Three overlapping layers, 8-second cycle */
.gradient-layer-1 {
  background-image: linear-gradient(90deg, var(--gradient-color-1), var(--gradient-color-2));
  animation: gradient-fade-1 8s infinite;
}
.gradient-layer-2 {
  background-image: linear-gradient(90deg, var(--gradient-color-2), var(--gradient-color-3));
  animation: gradient-fade-2 8s infinite;
}
.gradient-layer-3 {
  background-image: linear-gradient(90deg, var(--gradient-color-3), var(--gradient-color-1));
  animation: gradient-fade-3 8s infinite;
}

@keyframes gradient-fade-1 {
  0%, 16.667%, 100% { opacity: 1; }
  33.333%, 83.333% { opacity: 0; }
}
@keyframes gradient-fade-2 {
  0%, 16.667%, 66.667%, 100% { opacity: 0; }
  33.333%, 50% { opacity: 1; }
}
@keyframes gradient-fade-3 {
  0%, 50%, 100% { opacity: 0; }
  66.667%, 83.333% { opacity: 1; }
}
```

### Static Gradient Text

```css
.gradient-text {
  background-image: linear-gradient(90deg, #007CF0, #00DFD8);
  -webkit-text-fill-color: transparent;
  background-clip: text;
  -webkit-background-clip: text;
}
```

```tsx
<span className="bg-gradient-to-r from-[#007CF0] to-[#00DFD8]
                 bg-clip-text text-transparent">
  Deploy Instantly
</span>
```

### Vercel Button Gradient

```css
background: linear-gradient(-90deg, #007cf0, #00dfd8, #ff0080, #007cf0);
background-size: 400% 100%;
animation: gradient-shift 8s ease infinite;

@keyframes gradient-shift {
  0%   { background-position: 0% 50%; }
  50%  { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}
```

### Gradient Mesh Background (Dark Hero)

```tsx
<div className="relative min-h-screen bg-black overflow-hidden">
  {/* Top-left blob */}
  <div className="absolute -top-40 -left-40 w-[600px] h-[600px]
                  rounded-full bg-blue-500/15 blur-[128px]" />

  {/* Center blob */}
  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2
                  w-[800px] h-[500px] rounded-full
                  bg-gradient-to-br from-purple-600/20 via-blue-500/10 to-transparent
                  blur-[100px]" />

  {/* Bottom-right blob */}
  <div className="absolute -bottom-20 -right-20 w-[500px] h-[500px]
                  rounded-full bg-cyan-400/10 blur-[96px]" />

  {/* Content */}
  <div className="relative z-10">
    {children}
  </div>
</div>
```

### Noise Texture Overlay

```tsx
{/* Add subtle grain/noise to gradient backgrounds */}
<div className="absolute inset-0 opacity-[0.03] pointer-events-none"
     style={{
       backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
     }}
/>
```

### Radial Gradient Depth (Section Background)

```tsx
{/* Subtle center glow behind content */}
<section className="relative bg-background-200 py-24">
  <div className="absolute inset-0
                  bg-[radial-gradient(ellipse_at_center,_var(--ds-blue-100)_0%,_transparent_70%)]
                  opacity-50" />
  <div className="relative z-10 mx-auto max-w-7xl px-6">
    {children}
  </div>
</section>
```

---

## 8. Animation & Interaction Patterns

### Vercel Animation Principles

From the official Web Interface Guidelines:

- Honor `prefers-reduced-motion` with reduced-motion variants
- Preference order: **CSS > Web Animations API > JS libraries**
- Prioritize GPU-accelerated properties (`transform`, `opacity`)
- **Never** animate `width`, `height`, `top`, `left` (trigger reflow)
- Never use `transition: all` — explicitly list properties
- Animations are cancelable by user input
- Correct `transform-origin` to anchor motion at starting point
- Only animate when clarifying cause/effect or adding delight
- Easing should fit the subject (size, distance, trigger)

### Fade-Up Entrance

```css
@keyframes fade-up {
  from {
    opacity: 0;
    transform: translateY(16px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.animate-fade-up {
  animation: fade-up 0.5s ease-out forwards;
}
```

```tsx
{/* Staggered entrance */}
{items.map((item, i) => (
  <div
    key={item.id}
    className="animate-fade-up"
    style={{ animationDelay: `${i * 100}ms`, animationFillMode: 'backwards' }}
  >
    {item.content}
  </div>
))}
```

### Scramble Text Effect (Next.js Conf 2025)

Text characters scramble/decode on hover or entrance:

```tsx
'use client';
import { useState, useEffect, useCallback } from 'react';

const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

export function ScrambleText({ text, className }: { text: string; className?: string }) {
  const [display, setDisplay] = useState(text);

  const scramble = useCallback(() => {
    let iteration = 0;
    const interval = setInterval(() => {
      setDisplay(
        text
          .split('')
          .map((char, i) => {
            if (i < iteration) return text[i];
            return CHARS[Math.floor(Math.random() * CHARS.length)];
          })
          .join('')
      );
      iteration += 1 / 3;
      if (iteration >= text.length) clearInterval(interval);
    }, 30);
    return () => clearInterval(interval);
  }, [text]);

  return (
    <span className={className} onMouseEnter={scramble}>
      {display}
    </span>
  );
}
```

### Loading Spinner Timing

From Vercel Guidelines:
- Show-delay: 150-300ms (prevent flicker for fast loads)
- Minimum visible time: 300-500ms (prevent flash)
- Loading states end with ellipsis: "Loading...", "Saving...", "Generating..."

```tsx
function DelayedSpinner({ delay = 200, minVisible = 400 }) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setShow(true), delay);
    return () => clearTimeout(timer);
  }, [delay]);

  if (!show) return null;
  return <div className="animate-spin h-4 w-4 border-2 border-gray-400 border-t-gray-1000 rounded-full" />;
}
```

### Hit Target Sizing

```css
/* Visual < 24px: expand hit target to >= 24px */
.small-target {
  position: relative;
}
.small-target::after {
  content: '';
  position: absolute;
  inset: -8px; /* expand clickable area */
}

/* Mobile minimum: 44px */
@media (pointer: coarse) {
  .touch-target {
    min-height: 44px;
    min-width: 44px;
  }
}
```

### 3D Perspective Card (Conference Ticket Style)

```tsx
function PerspectiveCard({ children }: { children: React.ReactNode }) {
  const cardRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!cardRef.current) return;
    const { x, y, width, height } = cardRef.current.getBoundingClientRect();
    const centerX = x + width / 2;
    const centerY = y + height / 2;
    const degreeX = (e.clientY - centerY) * 0.008;
    const degreeY = (e.clientX - centerX) * -0.008;
    cardRef.current.style.transform =
      `perspective(1000px) rotateX(${degreeX}deg) rotateY(${degreeY}deg)`;
  };

  const handleMouseLeave = () => {
    if (cardRef.current) {
      cardRef.current.style.transform = 'perspective(1000px) rotateX(0) rotateY(0)';
    }
  };

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="transition-transform duration-300 ease-out"
      style={{ transition: 'all 300ms cubic-bezier(0.03, 0.98, 0.53, 0.99)' }}
    >
      {children}
    </div>
  );
}
```

### Gradient Border Ticket (Next.js Conf Style)

```css
:root {
  --ticket-color-1: #d25778;
  --ticket-color-2: #ec585c;
  --ticket-color-3: #e7d155;
  --ticket-color-4: #56a8c6;
}

.ticket-outer {
  background: linear-gradient(to right,
    var(--ticket-color-1),
    var(--ticket-color-2),
    var(--ticket-color-3),
    var(--ticket-color-4)
  );
  border-radius: 20px;
  padding: 5px; /* gradient border width */
  max-width: 650px;
}

.ticket-inner {
  background: #000;
  border-radius: 15px;
  padding: 2rem;
  position: relative;
}
```

---

## 9. Code Block Styling

### Shiki-based Code Blocks — Verified March 2026

Live-extracted from vercel.com code samples:

```
ELEMENT              VALUE (VERIFIED)
──────────────────── ─────────────────────────────────────────────
Code font family     "Geist Mono", ui-monospace, SFMono-Regular, "Roboto Mono", ...
Code font size       13px
Code line height     20px (1.54 ratio)
Code text color      rgb(237,237,237) = #ededed
Tab headers          "AI SDK", "Python", "OpenAI HTTP" — 14px labels
Line numbers         13px, color: #666, monospace, tabular-nums
Highlighted line     Blue-tinted background strip
Container border     1px solid #1f1f1f
```

```css
/* Code block container */
.code-block {
  font-family: var(--font-geist-mono);
  font-size: 13px;         /* verified — smaller than body text */
  line-height: 20px;       /* 1.54 ratio */
  background: var(--ds-gray-100);       /* Light mode */
  border: 1px solid var(--ds-gray-400);
  border-radius: 8px;
  padding: 1rem 1.25rem;
  overflow-x: auto;
}

/* Dark mode */
.dark .code-block {
  background: #0a0a0a;
  border-color: #1f1f1f;   /* verified — uses gray-200 not #333 */
}

/* Inline code */
.inline-code {
  font-family: var(--font-geist-mono);
  font-size: 0.875em;
  background: var(--ds-gray-200);
  border: 1px solid var(--ds-gray-400);
  border-radius: 4px;
  padding: 0.15em 0.4em;
}
```

```tsx
{/* Tailwind version */}
<pre className="rounded-lg border border-gray-400 bg-gray-100
               dark:bg-[#0a0a0a] dark:border-[#333]
               p-4 overflow-x-auto">
  <code className="font-mono text-sm leading-relaxed">
    {code}
  </code>
</pre>

{/* Inline code */}
<code className="rounded bg-gray-200 border border-gray-400
                px-1.5 py-0.5 font-mono text-[0.875em]">
  {code}
</code>
```

### Code Block with Copy Button

```tsx
<div className="group relative rounded-lg border border-gray-400 bg-gray-100">
  {/* Language label */}
  <div className="flex items-center justify-between border-b border-gray-400
                  px-4 py-2">
    <span className="text-xs font-mono text-gray-900">typescript</span>
    <button className="opacity-0 group-hover:opacity-100 transition-opacity
                       text-xs text-gray-900 hover:text-gray-1000
                       flex items-center gap-1"
            onClick={copyToClipboard}>
      <svg /* copy icon */ className="h-3.5 w-3.5" />
      {copied ? 'Copied!' : 'Copy'}
    </button>
  </div>
  <pre className="p-4 overflow-x-auto">
    <code className="font-mono text-sm leading-relaxed">{code}</code>
  </pre>
</div>
```

### Line Highlighting (Diff Style)

```css
/* Added line */
.line-added {
  background: rgba(0, 200, 83, 0.1);
  border-left: 3px solid #00c853;
}

/* Removed line */
.line-removed {
  background: rgba(255, 0, 0, 0.08);
  border-left: 3px solid #ff0000;
}

/* Highlighted line */
.line-highlighted {
  background: rgba(0, 112, 243, 0.08);
  border-left: 3px solid var(--geist-success);
}
```

---

## 10. Section Patterns

### Section Header with Eyebrow

```tsx
<div className="mx-auto max-w-7xl px-6 py-24 md:py-32">
  <div className="max-w-2xl space-y-3">
    <p className="text-sm font-medium uppercase tracking-[0.15em]
                  text-gray-900 font-mono">
      {eyebrow}
    </p>
    <h2 className="text-3xl md:text-4xl lg:text-5xl font-medium
                   tracking-[-0.02em] leading-tight">
      {title}
    </h2>
    <p className="text-base md:text-lg text-gray-900 leading-relaxed">
      {description}
    </p>
  </div>
</div>
```

### Pricing Section (3-Tier) — Verified March 2026

Live-extracted from vercel.com/pricing:

```
ELEMENT              VALUE (VERIFIED)
──────────────────── ─────────────────────────────────────────────
Page H1              "Find a plan to power your apps."
H1 size              48px, weight 600, tracking -2.88px
H1 color             rgb(237,237,237)
Subtitle             20px, color: gray-900
"Popular" badge      bg: #ededed, color: #1a1a1a, rounded-full
                     padding: 0 10px, font-size: 12px
Tier heading         bold, ~20px
Feature list items   16px, color: #ededed, normal line-height
Tier columns         3-column layout separated by grid lines
Cards                Black bg with 1px solid #1f1f1f borders
Accent text          "All Hobby features, plus:" in blue-ish color
```

```tsx
<section className="py-24 md:py-32">
  <div className="mx-auto max-w-7xl px-6">
    <div className="text-center mb-16">
      <h1 className="text-heading-48 text-[#ededed]">
        Find a plan to power your apps.
      </h1>
      <p className="mt-4 text-copy-20 text-[#a1a1a1]">
        Vercel supports teams of all sizes, with pricing that scales.
      </p>
    </div>

    {/* Grid lines background pattern behind the tiers */}
    <div className="grid grid-cols-1 md:grid-cols-3">
      {/* "Popular" badge floats above Pro column */}
      <div className="relative md:col-start-2 flex justify-center -mb-2">
        <span className="rounded-full bg-[#ededed] text-[#1a1a1a]
                         px-2.5 py-0.5 text-xs font-medium">
          Popular
        </span>
      </div>

      {tiers.map((tier) => (
        <div key={tier.name}
             className="border border-[#1f1f1f] p-8 flex flex-col">
          <h3 className="text-xl font-bold text-[#ededed]">{tier.name}</h3>
          <p className="mt-2 text-sm text-[#a1a1a1]">{tier.description}</p>
          <p className="mt-2 text-sm font-semibold text-[#ededed]">
            {tier.price}
          </p>

          {tier.upsell && (
            <p className="mt-6 text-sm text-blue-400">
              {tier.upsell}
            </p>
          )}

          <ul className="mt-4 space-y-3 flex-1">
            {tier.features.map((feature) => (
              <li key={feature} className="flex items-start gap-3 text-base text-[#ededed]">
                <svg className="mt-0.5 h-5 w-5 shrink-0 text-[#888]" /* icon */ />
                {feature}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  </div>
</section>
```

### Announcement Banner

```tsx
<div className="relative z-50 flex items-center justify-center gap-3
                border-b border-gray-400 bg-background-100 px-4 py-2.5
                text-sm">
  <span className="rounded-full bg-blue-700 px-2 py-0.5
                   text-xs font-medium text-white">
    New
  </span>
  <span className="text-gray-1000">
    Next.js 16 is here.
  </span>
  <a href="/blog/next-16"
     className="font-medium text-blue-700 hover:underline
                inline-flex items-center gap-1">
    Read more
    <svg className="h-3.5 w-3.5" /* arrow */ />
  </a>
</div>
```

### Footer — Verified March 2026

```
ELEMENT              VALUE (VERIFIED)
──────────────────── ─────────────────────────────────────────────
Footer bg            transparent (inherits page black)
Padding              40px 24px
Max width            1448px
Link text            14px, color: rgb(136,136,136) = #888888
Link hover           transitions to #ededed
Column headings      14px, font-medium, #ededed
Copyright            14px, #888888
```

```tsx
<footer className="bg-transparent">
  <div className="mx-auto max-w-[1448px] px-6 py-10 md:py-16">
    <div className="grid grid-cols-2 gap-8 md:grid-cols-5">
      {footerSections.map((section) => (
        <div key={section.title}>
          <h4 className="text-sm font-medium text-[#ededed] mb-3">
            {section.title}
          </h4>
          <ul className="space-y-2">
            {section.links.map((link) => (
              <li key={link.label}>
                <a href={link.href}
                   className="text-sm text-[#888] hover:text-[#ededed]
                              transition-colors">
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>

    <div className="mt-12 flex items-center justify-between border-t
                    border-[#1f1f1f] pt-8">
      <svg /* Logo */ className="h-5 w-5 text-[#ededed]" />
      <p className="text-sm text-[#888]">
        &copy; {new Date().getFullYear()} Vercel, Inc.
      </p>
    </div>
  </div>
</footer>
```

---

## 11. Dark/Light Mode Implementation

### Theme Provider Pattern (Geist/Vercel)

```tsx
// app/layout.tsx
import { GeistProvider } from 'geist/provider';

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Inline script to prevent FOUC */}
        <script dangerouslySetInnerHTML={{
          __html: `
            (function() {
              try {
                var theme = localStorage.getItem('theme') || 'system';
                if (theme === 'system') {
                  theme = window.matchMedia('(prefers-color-scheme: dark)').matches
                    ? 'dark' : 'light';
                }
                document.documentElement.classList.add(theme + '-theme');
                document.documentElement.style.colorScheme = theme;
              } catch(e) {}
            })();
          `,
        }} />
      </head>
      <body>
        <GeistProvider>{children}</GeistProvider>
      </body>
    </html>
  );
}
```

### CSS Theme Classes

```css
/* Apply on <html> element */
.light-theme {
  color-scheme: light;
  --ds-background-100: #ffffff;
  --ds-background-200: #fafafa;
  --ds-gray-100: #f2f2f2;
  --ds-gray-200: #ebebeb;
  --ds-gray-300: #e0e0e0;
  --ds-gray-400: #d4d4d4;
  --ds-gray-500: #b0b0b0;
  --ds-gray-600: #8c8c8c;
  --ds-gray-700: #6e6e6e;
  --ds-gray-800: #555555;
  --ds-gray-900: #3d3d3d;
  --ds-gray-1000: #171717;
}

.dark-theme {
  color-scheme: dark;
  /* Backgrounds */
  --ds-background-100: hsla(0, 0%, 4%, 1);    /* #0a0a0a */
  --ds-background-200: hsla(0, 0%, 0%, 1);    /* #000000 */

  /* Gray solid scale (verified Mar 2026) */
  --ds-gray-100: hsla(0, 0%, 10%, 1);  /* #1a1a1a — component bg */
  --ds-gray-200: hsla(0, 0%, 12%, 1);  /* #1f1f1f — hover bg */
  --ds-gray-300: hsla(0, 0%, 16%, 1);  /* #292929 — active bg */
  --ds-gray-400: hsla(0, 0%, 18%, 1);  /* #2e2e2e — default border */
  --ds-gray-500: hsla(0, 0%, 27%, 1);  /* #454545 — hover border */
  --ds-gray-600: hsla(0, 0%, 53%, 1);  /* #878787 — active border */
  --ds-gray-700: hsla(0, 0%, 56%, 1);  /* #8f8f8f — high contrast bg */
  --ds-gray-800: hsla(0, 0%, 49%, 1);  /* #7d7d7d — high contrast hover */
  --ds-gray-900: hsla(0, 0%, 63%, 1);  /* #a1a1a1 — secondary text */
  --ds-gray-1000: hsla(0, 0%, 93%, 1); /* #ededed — primary text */

  /* Gray alpha scale (for overlays on varied backgrounds) */
  --ds-gray-alpha-100: #ffffff0f;  /* 6% white */
  --ds-gray-alpha-200: #ffffff17;  /* 9% white */
  --ds-gray-alpha-300: #ffffff21;  /* 13% white */
  --ds-gray-alpha-400: #ffffff24;  /* 14% white */
  --ds-gray-alpha-500: #ffffff3d;  /* 24% white */
  --ds-gray-alpha-600: #ffffff82;  /* 51% white */
  --ds-gray-alpha-700: #ffffff8a;  /* 54% white */
  --ds-gray-alpha-800: #ffffff78;  /* 47% white */
  --ds-gray-alpha-900: #ffffff9c;  /* 61% white */
  --ds-gray-alpha-1000: #ffffffeb; /* 92% white */

  /* Blue scale (verified) */
  --ds-blue-100: hsla(216, 50%, 12%, 1);
  --ds-blue-200: hsla(214, 59%, 15%, 1);
  --ds-blue-300: hsla(213, 71%, 20%, 1);
  --ds-blue-400: hsla(212, 78%, 23%, 1);
  --ds-blue-500: hsla(211, 86%, 27%, 1);
  --ds-blue-600: hsla(206, 100%, 50%, 1); /* #0099ff — primary blue */
  --ds-blue-700: hsla(212, 100%, 48%, 1);
  --ds-blue-800: hsla(212, 100%, 41%, 1);
  --ds-blue-900: hsla(210, 100%, 66%, 1); /* link color */
  --ds-blue-1000: hsla(206, 100%, 96%, 1);

  /* Red scale (verified) */
  --ds-red-100: hsla(357, 37%, 12%, 1);
  --ds-red-200: hsla(357, 46%, 16%, 1);
  --ds-red-300: hsla(356, 54%, 22%, 1);
  --ds-red-400: hsla(357, 55%, 26%, 1);
  --ds-red-500: hsla(357, 60%, 32%, 1);
  --ds-red-600: hsla(358, 75%, 59%, 1);
  --ds-red-700: hsla(358, 75%, 59%, 1);
  --ds-red-800: hsla(358, 69%, 52%, 1);
  --ds-red-900: hsla(358, 100%, 69%, 1);
  --ds-red-1000: hsla(353, 90%, 96%, 1);
}
```

### Key Implementation Notes

- Store theme in `localStorage` with a key (e.g., `'theme'`, `'zeit-theme'`, `'conf-2025'`)
- Set `color-scheme` CSS property on `<html>` for native UI elements (scrollbars, form controls)
- Set `<meta name="theme-color">` to match page background
- Use `suppressHydrationWarning` on `<html>` and `<body>` for SSR safety
- In dark themes: hue-tint borders/shadows toward the same hue on colored backgrounds

---

## 12. Web Interface Guidelines (Vercel)

Key actionable rules from Vercel's official Web Interface Guidelines:

### Interactions
- All focusable elements need visible focus rings; prefer `:focus-visible`
- Visual targets < 24px must have hit targets >= 24px
- Mobile minimum hit target: 44px
- Input `font-size >= 16px` on mobile (prevents iOS auto-zoom)
- Set `touch-action: manipulation` to prevent double-tap zoom
- Show-delay for spinners: 150-300ms; minimum visible time: 300-500ms
- Persist state in URL for sharing and refresh
- Destructive actions require confirmation or Undo
- `<a>`/`<Link>` for navigation, never `<button>` or `<div>`

### Layout
- Adjust +/-1px for optical alignment when perception beats geometry
- Prefer flex/grid/intrinsic layout over JS measurements
- Verify on mobile, laptop, and ultra-wide
- Use safe-area CSS variables for notches/insets
- Set `overscroll-behavior: contain` in modals/drawers

### Shadows & Borders
- At least two shadow layers (ambient + direct light)
- Semi-transparent borders improve edge clarity
- Child `border-radius` <= parent radius (concentric alignment)

### Performance
- POST/PATCH/DELETE complete in < 500ms
- Virtualize large lists (`content-visibility: auto`)
- Preload above-the-fold images; lazy-load the rest
- Set explicit image dimensions to prevent CLS
- `<link rel="preconnect">` for CDN domains
- Subset fonts; ship only used code points

### Content
- `scroll-margin-top` for anchored headings behind sticky headers
- Use `font-variant-numeric: tabular-nums` for numeric comparisons
- Format dates/numbers by locale
- Don't rely on color alone for status

---

## 13. Geist Pixel Display Font

Five pixel-based display variants for headlines and logos:

### Variants & CSS Variables

| Variant | Import | CSS Variable |
|---------|--------|-------------|
| Square  | `GeistPixelSquare` | `--font-geist-pixel-square` |
| Grid    | `GeistPixelGrid`   | `--font-geist-pixel-grid` |
| Circle  | `GeistPixelCircle` | `--font-geist-pixel-circle` |
| Triangle| `GeistPixelTriangle`| `--font-geist-pixel-triangle` |
| Line    | `GeistPixelLine`   | `--font-geist-pixel-line` |

### Implementation

```tsx
// app/layout.tsx
import { GeistPixelSquare } from 'geist/font/pixel';

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={GeistPixelSquare.variable}>
      <body>{children}</body>
    </html>
  );
}
```

### Specs
- 480 glyphs per variant
- 7 stylistic sets
- 32 language support
- Vertical metrics aligned with Geist Sans and Geist Mono

### Usage
- Headlines and hero text at large display sizes
- Logos and branding elements
- Conference/event identity (Next.js Conf 2025 uses Circle and Square)
- Banners, dashboards, experimental layouts
- NOT for body text or small UI elements

---

## Quick Reference: Common Tailwind Patterns (Verified)

```
/* Container */          mx-auto max-w-[1448px] px-6 md:px-8
/* Section spacing */    py-24 md:py-32
/* Card border */        rounded-xl border border-[#333]
/* Material border */    shadow-[inset_0_0_0_1px_rgba(255,255,255,0.145)]
/* Card padding */       p-6 md:p-8
/* Card hover */         hover:border-gray-500 hover:shadow-lg hover:-translate-y-0.5
/* Heading large */      text-heading-48 (48px/48px, -2.88px, 600)
/* Heading huge */       text-heading-72 (72px/72px, -4.32px, 600)
/* Section heading */    text-heading-32 (32px/40px, -1.28px, 600)
/* Body text */          text-copy-14 or text-copy-16
/* Subtitle */           text-copy-20 text-[#a1a1a1]
/* Muted text */         text-sm text-[#888]
/* Mono label */         text-label-13-mono text-[#a1a1a1]
/* Primary CTA */        rounded-full bg-white text-black h-12 px-8 text-sm font-medium
/* Conf CTA (blue) */    bg-[#0057ff] text-white h-12 px-5 font-semibold (square corners!)
/* Nav button */         h-8 px-3 rounded-md bg-[#0a0a0a] text-[#ededed] text-sm font-medium
/* Nav button (inv) */   h-8 px-3 rounded-md bg-[#ededed] text-[#0a0a0a] text-sm font-medium
/* Popular badge */      rounded-full bg-[#ededed] text-[#1a1a1a] px-2.5 py-0.5 text-xs
/* Events badge */       text-xs text-[#52a8ff] font-medium
/* Backdrop header */    bg-background/80 backdrop-blur-xl
/* Smooth transition */  transition-colors duration-200
/* Grid 3-col */         grid grid-cols-1 md:grid-cols-3 gap-6
/* Grid 2-col */         grid grid-cols-1 md:grid-cols-2 gap-6
/* Flex row */           flex items-center gap-4
/* Full-height */        min-h-[calc(100vh-var(--header-height))]
/* Dark page base */     bg-black text-[#ededed]
/* Surface */            bg-[#0a0a0a]
/* Border default */     border-[#1f1f1f] (dark) or border-[#333] (nextjs.org)
```

---

## 14. What's Timeless: Patterns That Persist (Oct 2025 - Mar 2026)

Based on comparing Wayback Machine snapshots (Oct 2025) with current live sites (Mar 2026):

### Unchanged Patterns
- **Color palette**: Pure black (#000) backgrounds, #ededed primary text, #888/#a1a1a1 secondary text
- **Font**: Geist Sans for all UI, Geist Mono for code/technical
- **Heading tracking**: Consistent -6% for large, -4% for medium, -2% for small
- **Button variants**: Pill-shaped (rounded-full) for marketing CTAs, rounded-md (6px) for nav/action buttons
- **Card borders**: 1px solid at 12-18% lightness on dark, 12px border-radius
- **Material system**: White ring at 14.5% opacity as signature card border
- **Spacing**: 4px base unit, 24px standard gap
- **Animation philosophy**: Max 200ms, GPU-accelerated properties only, prefers-reduced-motion always

### Evolved Patterns
- **Announcement banner**: Changed from "Next.js 16" to "Ship 26" — format stays the same
- **Hero visual**: Prism/gradient orb with grid-line overlay remains consistent
- **Pricing**: Same 3-tier layout, same structure, content updates only
- **Conf page**: Complete redesign per event — uses event-specific identity system (2025: blue pixel/halftone)

### The Vercel Design DNA (always present)
1. **Dark-first**: Design for dark mode first, derive light mode
2. **Tight tracking**: Negative letter-spacing on all headings
3. **High contrast text**: Near-white (#ededed) on pure black
4. **Subtle borders**: Very low-contrast borders (18% lightness on dark)
5. **Dual CTA**: Primary (filled) + Secondary (outline) side by side
6. **Grid-line backgrounds**: Faint crosshatch pattern at section boundaries
7. **Monospace accents**: Geist Mono for dates, code, technical labels
8. **48px button height**: Consistent for marketing CTAs
9. **1448px max-width**: Container constraint for content

---

## Sources

### Official Vercel / Geist
- [Vercel Geist Design System](https://vercel.com/geist/introduction)
- [Vercel Geist Typography](https://vercel.com/geist/typography) — full scale with Tailwind classes
- [Vercel Geist Colors](https://vercel.com/geist/colors) — 10-step semantic scales, P3 support
- [Vercel Geist Materials](https://vercel.com/geist/materials) — radii, fills, strokes, shadows
- [Vercel Geist Font](https://vercel.com/font) — Sans, Mono, Pixel variants
- [Vercel Web Interface Guidelines](https://vercel.com/design/guidelines) — 100+ rules
- [Vercel Web Interface Guidelines (GitHub)](https://github.com/vercel-labs/web-interface-guidelines)
- [Geist Font Repository](https://github.com/vercel/geist-font)
- [Introducing Geist Pixel](https://vercel.com/blog/introducing-geist-pixel)
- [Geist npm Package](https://www.npmjs.com/package/geist)

### Live Sites (Verified March 2026)
- [vercel.com](https://vercel.com/) — homepage hero, nav, footer patterns
- [vercel.com/pricing](https://vercel.com/pricing) — 3-tier pricing layout
- [nextjs.org](https://nextjs.org/) — homepage, feature card grid
- [nextjs.org/conf](https://nextjs.org/conf) — Conf 2025 recap page
- [Vercel Hero Gallery Entry](https://hero.gallery/hero-gallery/vercel) — hero pattern analysis

### Wayback Machine Snapshots
- [nextjs.org/conf Oct 14, 2025](https://web.archive.org/web/20251014/https://nextjs.org/conf) — pre-conference
- [nextjs.org/conf Oct 24, 2025](https://web.archive.org/web/20251024/https://nextjs.org/conf) — post-conference

### Community Resources
- [Geist Colors Package](https://github.com/ephraimduncan/geist-colors)
- [Vercel Gradient Text Effect](https://dev.to/mohsenkamrani/create-a-gradient-text-effect-like-vercel-with-css-38g5)
- [Vercel Animated Gradient](https://kevinhufnagl.com/verceltext-gradient/)
- [Next.js Conf Ticket Clone (Gradient Borders)](https://dev.to/medhatdawoud/gradient-borders-with-curves-and-3d-movement-in-css-nextjs-ticket-clone-3cho)
- [Next.js Conf 2024 Recap](https://vercel.com/blog/recap-next-js-conf-2024)
- [Spotlight Card Hover Effect](https://cruip.com/how-to-create-a-spotlight-card-hover-effect-with-tailwind-css/)
- [Tailwind Bento Grids](https://tailwindcss.com/plus/ui-blocks/marketing/sections/bento-grids)
- [Vercel Dashboard Redesign](https://vercel.com/changelog/new-dashboard-navigation-available)
- [Geist Design System Figma](https://www.figma.com/community/file/1330020847221146106/geist-design-system-vercel)
- [Geist Font DeepWiki](https://deepwiki.com/vercel/geist-font)
