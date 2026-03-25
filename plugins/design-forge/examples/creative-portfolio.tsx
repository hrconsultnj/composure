'use client'

/**
 * Design Forge Example: Creative Portfolio
 *
 * A portfolio layout combining CustomCursor, HoverCardCanvas project grid,
 * Scanlines overlay, and Framer Motion page transitions. Shows how to build
 * a project showcase with per-card generative backgrounds.
 *
 * Dependencies:
 *   pnpm add motion
 *
 * Components used:
 *   - CustomCursor (3-layer cursor system)
 *   - HoverCardCanvas (interactive project cards)
 *   - Scanlines (CRT overlay)
 *   - createPointCloud / createGridField (canvas presets)
 *   - Typewriter (status bar)
 *
 * Adapt the import paths below to match your project structure.
 */

import { useMemo } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'motion/react'

// -- Adapt these imports to your project --
import { CustomCursor } from '@forge/ui/custom-cursor'
import { HoverCardCanvas } from '@forge/ui/hover-card-canvas'
import { Scanlines } from '@forge/effects/scanlines'
import { Typewriter } from '@forge/effects/typewriter'
import { createPointCloud, createGridField } from '@forge/visualizations/presets'

// -- Design tokens --
const COLORS = {
  bg: '#070809',
  text: '#e8e4dd',
  accent: '#4a78ff',
  green: '#7de58d',
  orange: '#ff9447',
  muted: 'rgba(255,255,255,0.45)',
  border: 'rgba(255,255,255,0.08)',
} as const

// -- Project data --
const PROJECTS = [
  {
    slug: 'stellar-ui',
    title: 'Stellar UI',
    category: 'Design System',
    year: '2025',
    preset: 'point-cloud' as const,
  },
  {
    slug: 'dataflow',
    title: 'Dataflow',
    category: 'Dashboard',
    year: '2025',
    preset: 'grid-field' as const,
  },
  {
    slug: 'meridian',
    title: 'Meridian',
    category: 'Marketing Site',
    year: '2024',
    preset: 'point-cloud' as const,
  },
  {
    slug: 'control-room',
    title: 'Control Room',
    category: 'Interactive Experience',
    year: '2024',
    preset: 'grid-field' as const,
  },
  {
    slug: 'signal',
    title: 'Signal',
    category: 'Generative Art',
    year: '2024',
    preset: 'point-cloud' as const,
  },
  {
    slug: 'construct',
    title: 'Construct',
    category: 'Product Page',
    year: '2023',
    preset: 'grid-field' as const,
  },
]

// -- Animation variants --
const pageTransition = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: 0.5 } },
  exit: { opacity: 0, transition: { duration: 0.3 } },
}

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08, delayChildren: 0.15 } },
}

const cardReveal = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.45, ease: [0.25, 0.46, 0.45, 0.94] as const },
  },
}

/** Maps preset name to a factory call. Memoize per-card. */
function usePresetDraw(preset: 'point-cloud' | 'grid-field') {
  return useMemo(() => {
    if (preset === 'point-cloud') return createPointCloud({ count: 120, spread: 0.35 })
    return createGridField({ columns: 14, rows: 10, amplitude: 16 })
  }, [preset])
}

function ProjectCard({ project }: { project: (typeof PROJECTS)[number] }) {
  const draw = usePresetDraw(project.preset)

  return (
    <HoverCardCanvas
      draw={draw}
      animateOnHover
      idleOpacity={0.15}
      hoverOpacity={0.6}
      style={{ background: 'rgba(255,255,255,0.02)' }}
    >
      {/* data-cursor enables the contextual label on CustomCursor */}
      <div data-cursor="view" style={{ padding: 28, minHeight: 200, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
        <p style={{ fontFamily: 'var(--font-mono, monospace)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em', color: COLORS.muted, marginBottom: 6 }}>
          {project.category} / {project.year}
        </p>
        <h3 style={{ fontSize: 20, fontWeight: 600, color: COLORS.text }}>{project.title}</h3>
      </div>
    </HoverCardCanvas>
  )
}

export default function CreativePortfolio() {
  const reducedMotion = useReducedMotion()

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key="portfolio"
        {...(reducedMotion ? {} : pageTransition)}
        style={{ background: COLORS.bg, color: COLORS.text, minHeight: '100vh' }}
      >
        <CustomCursor ringColor="rgba(74, 120, 255, 0.5)" dotColor={COLORS.accent} />
        <Scanlines opacity={0.12} />

        {/* ── Header ── */}
        <header style={{ padding: '48px 24px 0', maxWidth: 1080, margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 64 }}>
            <p style={{ fontFamily: 'var(--font-mono, monospace)', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.1em', color: COLORS.accent }}>
              Portfolio
            </p>
            <nav style={{ display: 'flex', gap: 24 }} aria-label="Main navigation">
              {['Work', 'About', 'Contact'].map((link) => (
                <a
                  key={link}
                  href={`#${link.toLowerCase()}`}
                  data-cursor={link.toLowerCase()}
                  style={{ fontFamily: 'var(--font-mono, monospace)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em', color: COLORS.muted, textDecoration: 'none' }}
                >
                  {link}
                </a>
              ))}
            </nav>
          </div>

          <h1 style={{ fontSize: 'clamp(2rem, 6vw, 3.5rem)', fontWeight: 600, lineHeight: 1.1, maxWidth: 600, marginBottom: 16 }}>
            Bespoke digital experiences.
          </h1>
          <div style={{ color: COLORS.muted, fontSize: 14, marginBottom: 80 }}>
            <Typewriter messages={['Design systems', 'Interactive dashboards', 'Generative art', 'Creative development']} />
          </div>
        </header>

        {/* ── Project Grid ── */}
        <main id="work" style={{ padding: '0 24px 120px', maxWidth: 1080, margin: '0 auto' }} aria-label="Projects">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-40px' }}
            variants={stagger}
            style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}
          >
            {PROJECTS.map((project) => (
              <motion.div key={project.slug} variants={cardReveal}>
                <ProjectCard project={project} />
              </motion.div>
            ))}
          </motion.div>
        </main>

        {/* ── Status bar ── */}
        <footer style={{ padding: '16px 24px', borderTop: `1px solid ${COLORS.border}` }}>
          <p style={{ fontFamily: 'var(--font-mono, monospace)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em', color: COLORS.muted, textAlign: 'center' }}>
            {PROJECTS.length} projects / Design Forge
          </p>
        </footer>
      </motion.div>
    </AnimatePresence>
  )
}
