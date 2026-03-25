'use client'

/**
 * Design Forge Example: Landing Page
 *
 * A complete landing page combining GenerativeCanvas hero background,
 * GlassPanel feature cards, ScrollProgress, Framer Motion stagger reveals,
 * and a CTA section. Demonstrates how Design Forge components compose.
 *
 * Dependencies:
 *   pnpm add motion
 *
 * Components used:
 *   - GenerativeCanvas (hero background)
 *   - createGridField (canvas preset)
 *   - GlassPanel (feature cards)
 *   - ScrollProgress (scroll indicator)
 *   - Typewriter (hero subtitle)
 *
 * Adapt the import paths below to match your project structure.
 */

import { useMemo } from 'react'
import { motion, useReducedMotion } from 'motion/react'

// -- Adapt these imports to your project --
// If using the plugin directly:
import { GenerativeCanvas } from '@forge/visualizations/canvas'
import { createGridField } from '@forge/visualizations/presets'
import { GlassPanel } from '@forge/ui/glass-panel'
import { ScrollProgress } from '@forge/ui/scroll-progress'
import { Typewriter } from '@forge/effects/typewriter'

// -- Design tokens (control room aesthetic) --
const COLORS = {
  bg: '#070809',
  text: '#e8e4dd',
  accent: '#4a78ff',
  green: '#7de58d',
  orange: '#ff9447',
  border: 'rgba(255,255,255,0.08)',
  muted: 'rgba(255,255,255,0.45)',
} as const

// -- Feature data --
const FEATURES = [
  {
    index: '01',
    title: 'Canvas Visualizations',
    description: 'Generative art powered by a factory pattern. Plug any DrawFunction into a single component.',
    glow: COLORS.accent,
  },
  {
    index: '02',
    title: 'Glassmorphism System',
    description: 'Blur, gradient, and radial glow panels. Dark and light themes with zero border-radius.',
    glow: COLORS.green,
  },
  {
    index: '03',
    title: 'Motion & Interaction',
    description: 'Framer Motion stagger reveals, GSAP scroll timelines, custom cursors, sound layers.',
    glow: COLORS.orange,
  },
  {
    index: '04',
    title: 'Accessibility First',
    description: 'Every animation respects prefers-reduced-motion. WCAG 2.1 AA contrast and ARIA throughout.',
    glow: COLORS.accent,
  },
]

// -- Animation variants --
const containerVariants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.12, delayChildren: 0.2 },
  },
}

const cardVariants = {
  hidden: { opacity: 0, y: 32 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] as const },
  },
}

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] as const },
  },
}

export default function LandingPage() {
  const reducedMotion = useReducedMotion()
  const gridDraw = useMemo(() => createGridField({ columns: 28, amplitude: 24 }), [])

  return (
    <div style={{ background: COLORS.bg, color: COLORS.text, minHeight: '100vh' }}>
      <ScrollProgress color={COLORS.accent} />

      {/* ── Hero ── */}
      <section
        style={{ position: 'relative', height: '100svh', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}
        aria-label="Hero"
      >
        {/* Canvas background */}
        <div style={{ position: 'absolute', inset: 0, opacity: 0.35 }} aria-hidden="true">
          <GenerativeCanvas
            draw={gridDraw}
            clearColor={COLORS.bg}
            animate={!reducedMotion}
            aria-label="Animated grid field background"
            className=""
          />
        </div>

        {/* Hero content */}
        <motion.div
          initial="hidden"
          animate="visible"
          variants={containerVariants}
          style={{ position: 'relative', zIndex: 1, textAlign: 'center', padding: '0 24px', maxWidth: 720 }}
        >
          <motion.p
            variants={fadeUp}
            style={{ fontFamily: 'var(--font-mono, monospace)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.12em', color: COLORS.accent, marginBottom: 16 }}
          >
            Design Forge
          </motion.p>
          <motion.h1
            variants={fadeUp}
            style={{ fontSize: 'clamp(2rem, 6vw, 3.5rem)', fontWeight: 600, lineHeight: 1.1, margin: '0 0 20px' }}
          >
            Premium interactive experiences, production-ready.
          </motion.h1>
          <motion.div variants={fadeUp} style={{ color: COLORS.muted, fontSize: 16, marginBottom: 32 }}>
            <Typewriter
              messages={[
                'Generative canvas backgrounds',
                'Glassmorphism panel systems',
                'Scroll-driven animations',
                'Accessibility-first design',
              ]}
            />
          </motion.div>
          <motion.div variants={fadeUp} style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <a
              href="#features"
              style={{
                padding: '12px 28px',
                background: COLORS.accent,
                color: '#fff',
                fontSize: 14,
                fontWeight: 500,
                textDecoration: 'none',
                border: 'none',
              }}
            >
              Explore Components
            </a>
            <a
              href="#cta"
              style={{
                padding: '12px 28px',
                background: 'transparent',
                color: COLORS.text,
                fontSize: 14,
                fontWeight: 500,
                textDecoration: 'none',
                border: `1px solid ${COLORS.border}`,
              }}
            >
              Get Started
            </a>
          </motion.div>
        </motion.div>
      </section>

      {/* ── Features ── */}
      <section id="features" style={{ padding: '120px 24px', maxWidth: 1080, margin: '0 auto' }} aria-label="Features">
        <motion.p
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-80px' }}
          variants={fadeUp}
          style={{ fontFamily: 'var(--font-mono, monospace)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.12em', color: COLORS.green, marginBottom: 12 }}
        >
          Components
        </motion.p>
        <motion.h2
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-80px' }}
          variants={fadeUp}
          style={{ fontSize: 'clamp(1.5rem, 4vw, 2.25rem)', fontWeight: 600, marginBottom: 64, maxWidth: 480 }}
        >
          Everything you need for bespoke web design.
        </motion.h2>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-60px' }}
          variants={containerVariants}
          style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 20 }}
        >
          {FEATURES.map((f) => (
            <motion.div key={f.index} variants={cardVariants}>
              <GlassPanel glowColor={f.glow} glowPosition="bottom-right" style={{ padding: 28, height: '100%' }}>
                <p style={{ fontFamily: 'var(--font-mono, monospace)', fontSize: 11, color: COLORS.muted, marginBottom: 12 }}>
                  {f.index}
                </p>
                <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>{f.title}</h3>
                <p style={{ fontSize: 14, color: COLORS.muted, lineHeight: 1.6 }}>{f.description}</p>
              </GlassPanel>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* ── CTA ── */}
      <section
        id="cta"
        style={{ padding: '120px 24px', textAlign: 'center', borderTop: `1px solid ${COLORS.border}` }}
        aria-label="Call to action"
      >
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={containerVariants}
          style={{ maxWidth: 560, margin: '0 auto' }}
        >
          <motion.h2 variants={fadeUp} style={{ fontSize: 'clamp(1.5rem, 4vw, 2.25rem)', fontWeight: 600, marginBottom: 16 }}>
            Start building premium experiences.
          </motion.h2>
          <motion.p variants={fadeUp} style={{ color: COLORS.muted, fontSize: 15, lineHeight: 1.7, marginBottom: 32 }}>
            Install the plugin, browse the component catalog, and drop production-ready visualizations into your Next.js project.
          </motion.p>
          <motion.div
            variants={fadeUp}
            style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'center' }}
          >
            <code
              style={{
                display: 'inline-block',
                padding: '14px 24px',
                background: 'rgba(255,255,255,0.04)',
                border: `1px solid ${COLORS.border}`,
                fontFamily: 'var(--font-mono, monospace)',
                fontSize: 13,
                color: COLORS.muted,
              }}
            >
              /plugin marketplace add hrconsultnj/design-forge
            </code>
            <code
              style={{
                display: 'inline-block',
                padding: '14px 24px',
                background: 'rgba(255,255,255,0.04)',
                border: `1px solid ${COLORS.border}`,
                fontFamily: 'var(--font-mono, monospace)',
                fontSize: 13,
                color: COLORS.green,
              }}
            >
              /plugin install design-forge@design-forge
            </code>
          </motion.div>
        </motion.div>
      </section>
    </div>
  )
}
