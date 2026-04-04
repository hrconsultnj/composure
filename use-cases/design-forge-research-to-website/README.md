# From Research to 13-Page Website in 26 Minutes

> Two Design Forge skills — UX Researcher for competitive intelligence, then Design Forge for implementation — produced a full Next.js marketing site with Radix mega menus, 5 industry verticals, interactive playground, and research-driven branding. Total hands-on build time: 26 minutes.

## What Happened

A developer needed a full marketing website for AIGRaaS (AI Guardrails as a Service) — a new product entering a $1.9B market with 6+ direct competitors. The workflow used two Design Forge skills across two sessions:

**Session 1 — UX Researcher (research phase):**
- Analyzed 6 direct competitors (Guardrails AI, NVIDIA NeMo, Lakera, Arthur AI, Patronus AI, CalypsoAI) plus 4 adjacent players
- Mapped the $109.9B projected market (65.8% CAGR)
- Identified 5 unaddressed gaps (voice AI guardrails, constitutional framework, deterministic evaluation, operator-first no-code, sub-10ms latency)
- Developed 4 buyer personas with pain points, objections, and buying triggers
- Produced validated pricing tiers benchmarked against all competitors
- Created complete visual direction (color palette, typography, animation intensity, layout patterns)
- Defined site structure with conversion flow and metric targets
- Compiled 35+ sourced citations

**Session 2 — Design Forge (build phase):**
- Read both research reports (~96KB, 1,802 lines total)
- Loaded taxonomy routing (saas × website × modern) with research-classified overrides
- Scaffolded Next.js 16 project with pnpm
- Built complete design system (brand tokens, dark/light mode, mesh gradients, Geist typography)
- Created 47 files, 4,244 lines of production code
- Built 13 statically-generated routes
- Implemented Radix NavigationMenu mega menus and Sheet mobile nav
- Iterated on mega menu layout based on live feedback (3 rounds)
- Clean build on every iteration

## The Research Phase

### UX Researcher — Two Reports

The `/design-forge:ux-researcher` skill was invoked twice in a prior session, producing two research documents:

| Report | Lines | Words | Content |
|--------|-------|-------|---------|
| Competitive Analysis | 1,082 | 7,210 | 6 competitors deep-dived, gaps analysis, differentiation matrix, social proof inventory, messaging analysis |
| Market Intelligence + Design Direction | 720 | 6,072 | Market sizing (TAM/SAM), vertical rankings, 4 personas, messaging framework, site structure, pricing validation, full visual direction with hex codes and font choices, 35+ citations |
| **Total** | **1,802** | **13,282** | Complete product positioning + website design brief |

### What the Researcher Discovered

**Critical finding — consolidation wave:** 3 of 7 primary competitors were acquired in 18 months (Lakera → Check Point ~$300M, CalypsoAI → F5 $180M, Aporia → Coralogix ~$50M). This became a key messaging angle.

**Gap analysis that drove the design:**

| Gap | Who Has It | AIGRaaS Fills It |
|-----|-----------|------------------|
| Voice AI guardrails | Nobody | VAPI/11Labs/Bland integration, sub-10ms for real-time voice |
| Constitutional behavioral eval | Nobody | 4 decision trees, 8 harm variables, 3 validation tests |
| Deterministic (no LLM judge) | Nobody | Pure TypeScript, no adversarial attacks on the judge |
| Operator-first no-code | Aporia (now Coralogix) | Dashboard-first, describe domain in English |
| Sub-10ms guaranteed | Lakera (injection only) | All evaluation types, not just prompt injection |

**Visual direction decisions:**
- **Teal-mint primary** (#34D399) — differentiates from purple-heavy competitors, signals "safe/approved/go"
- **Dark mode default** — 87% of target audience uses dark mode
- **Geist typography** — matches VAPI's ecosystem (primary customer segment)
- **Animation intensity: gentle** — professional credibility over flash (research override of taxonomy's "expressive" default)

## The Build Phase

### Timeline

| Time (ET) | Milestone | Elapsed |
|-----------|-----------|---------|
| 3:20 PM | Design Forge invoked with research reference | 0:00 |
| 3:20-3:22 | Read both research files, loaded taxonomy + style files | ~2m |
| 3:22:58 | `create-next-app` scaffolded | ~3m |
| 3:23 | Dependencies installed (Iconify, Framer Motion, Geist) | ~3m |
| 3:25 | Design system complete (globals.css, brand tokens, theme) | ~5m |
| 3:28 | All shared UI + animation components written | ~8m |
| 3:30 | Layout components complete (Header, MegaMenu, MobileNav, Footer) | ~10m |
| 3:30 | Homepage with 8 sections assembled | ~10m |
| 3:32 | How It Works page (5-phase pipeline, 3 modes, 3 tests) | ~12m |
| 3:33 | Pricing page (4 tiers + FAQ) | ~13m |
| 3:34 | All 5 Use Cases pages + overview | ~14m |
| 3:35 | Playground, Blog, About pages done | ~15m |
| **3:36** | **First clean build — all 13 routes** | **~16m** |
| 3:38-3:40 | Radix refactor (NavigationMenu + Sheet replacing Framer Motion) | ~20m |
| 3:41 | Clean build after Radix refactor | ~21m |
| 3:41-3:46 | Mega menu layout iterations (3 rounds of live feedback) | ~26m |

### What Was Built

| Category | Count | Details |
|----------|-------|---------|
| **Files created** | 47 | .tsx, .ts, .css across src/ |
| **Lines of code** | 4,244 | Production-ready, no placeholders |
| **Routes** | 13 | All statically generated |
| **Section components** | 9 | Hero, SocialProofBar, FeatureBento, HowItWorksSteps, StatsCounter, CompetitiveEdge, Testimonials, CTASection, UseCaseDetail |
| **UI primitives** | 7 | Container, Button, Card, Badge, Icon, NavigationMenu (Radix), Sheet (Radix) |
| **Layout components** | 6 | Header, DesktopNav, MobileNav, NavLinkCard, Footer, ThemeToggle |
| **Animation components** | 3 | FadeIn, Counter, StaggerChildren |
| **Data constants** | 450+ lines | Navigation, pricing, features, stats, use cases, blog posts, footer — zero inline data |

### Pages Built

| Route | Content |
|-------|---------|
| `/` | Hero + social proof + feature bento + how-it-works + stats + competitive edge + testimonials + CTA |
| `/how-it-works` | 5-phase constitutional pipeline, 3 evaluation modes, 3 validation tests, architecture diagram |
| `/use-cases` | Overview grid linking to 5 verticals |
| `/use-cases/voice-ai` | Pain points + solutions, VAPI/11Labs/Bland integration context |
| `/use-cases/healthcare` | HIPAA compliance, telehealth, audit trails |
| `/use-cases/financial` | PCI DSS, FINRA, hallucination losses |
| `/use-cases/customer-service` | Air Canada ruling, unauthorized promises |
| `/use-cases/real-estate` | Fair Housing Act, steering language detection |
| `/pricing` | 4-tier cards (Free/$29/$99/Enterprise) + 6 FAQ items |
| `/playground` | Interactive evaluation demo with 4 examples, ruleset selector, animated verdicts |
| `/blog` | Article grid with categories, 6 research-backed posts |
| `/about` | Mission, values, timeline, constitutional AI attribution |

### Mid-Session Refactor: Framer Motion → Radix

The initial mega menu used Framer Motion for animations and manual state for open/close. Based on the Composure Pro website's existing pattern, this was refactored to Radix UI primitives:

| Component | Before | After |
|-----------|--------|-------|
| Desktop mega menu | Framer Motion `AnimatePresence` + manual `useState` | Radix `NavigationMenu` with `viewport={false}` |
| Mobile nav | Framer Motion slide + manual backdrop | Radix `Sheet` (Dialog) with focus trap + portal |
| Nav items | Inline divs with hover handlers | `NavLinkCard` wrapping `NavigationMenuLink` with `asChild` |

**Why:** Radix handles keyboard navigation, focus management, aria attributes, and escape dismissal automatically. The Framer Motion approach worked visually but missed accessibility requirements.

## How Design Forge Made This Possible

### 1. Research eliminated decision paralysis

Without the UX Researcher output, the developer would have needed to:
- Manually research 10+ competitors (hours of browsing, note-taking)
- Decide on color palette, typography, animation approach without market context
- Guess at pricing tiers without competitive benchmarking
- Define site structure without persona-driven conversion flow analysis

The research reports provided **every design decision pre-made with rationale**: why teal-mint over purple, why Geist over Inter, why gentle animation over expressive, why $29/mo Pro tier, why dark mode default.

### 2. Taxonomy routing selected the right patterns

The UX Researcher's Classification block (`saas / website / modern`) was fed into the Design Forge taxonomy, which auto-selected:
- Layout patterns (hero-split, bento-grid, feature-cards)
- Animation intensity (overridden from "expressive" to "gentle" by research)
- Scroll choreography (section-fade-sequence)
- Depth strategy (css-layers + subtle WebGL mesh gradient)
- Section templates (gradient-headline-hero, feature-card-grid, counter-bar, etc.)

### 3. Data-driven architecture prevented coupling

All content lives in `constants.ts` (450+ lines). Pages are pure assembly — they import sections and pass data. This meant:
- Adding a new use case = add an object to the array + create a 10-line page file
- Changing navigation = edit the `NAV_ITEMS` array, all menus update
- Swapping a section = replace one import, layout untouched

### 4. Reference site patterns matched production quality

The research identified specific patterns to borrow from Vercel (restraint, Geist typography), Stripe (mesh gradient hero), Linear (dark mode execution), and VAPI (color palette, voice AI native feel) — with explicit notes on what to skip from each.

## Key Metrics

| Metric | Value |
|--------|-------|
| Research output | 1,802 lines, 96KB across 2 reports |
| Research sources cited | 35+ |
| Competitors analyzed | 10 (6 deep, 4 adjacent) |
| Build time (research → first clean build) | ~16 minutes |
| Build time (including iterations) | ~26 minutes |
| Files created | 47 |
| Lines of code | 4,244 |
| Routes built | 13 (all static) |
| Build iterations with user feedback | 3 (mega menu layout) |
| Type errors on first build | 2 (fixed in <1 minute) |
| Final build status | Clean, all routes statically generated |

## Next in the Series

This use case ends with a clean local build at 3:46 PM ET. For the deployment phase — GitHub repo creation, Shipyard preflight, Vercel deploy, live header audit, and security header hardening — continue with:

**→ [From Repo to Production with Hardened Security — 22 Minutes](../shipyard-sentinel-hardened-deploy/README.md)**

Together, the two use cases cover the full workflow from "/ux-researcher invoked" to "aigraas.com live with A/A+ security headers" in under 70 minutes of hands-on time.
