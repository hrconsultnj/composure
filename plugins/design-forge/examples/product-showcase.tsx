'use client'

/**
 * Design Forge Example: Product Showcase
 *
 * A product page with a hero slot for 3D models (via Suspense), a feature
 * bento grid, scroll-triggered spec reveals, and sound layer on interactions.
 *
 * Dependencies:
 *   pnpm add motion
 *   pnpm add three @react-three/fiber @react-three/drei  (for 3D model)
 *
 * Components used:
 *   - HeroScene (full-screen hero with telemetry HUD)
 *   - GlassPanel (bento grid cards)
 *   - useSoundLayer (hover tones)
 *   - ScrollProgress (scroll indicator)
 *
 * Adapt the import paths below to match your project structure.
 */

import { Suspense, type ReactNode } from 'react'
import { motion, useReducedMotion } from 'motion/react'

// -- Adapt these imports to your project --
import { HeroScene } from '@forge/scenes/hero-scene'
import { GlassPanel } from '@forge/ui/glass-panel'
import { ScrollProgress } from '@forge/ui/scroll-progress'
import { useSoundLayer } from '@forge/ui/sound-layer'

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

// -- Product specs --
const SPECS = [
  { label: 'Resolution', value: '4K @ 120Hz' },
  { label: 'Latency', value: '<1ms' },
  { label: 'Color Depth', value: '10-bit HDR' },
  { label: 'Connectivity', value: 'USB-C / HDMI 2.1' },
  { label: 'Weight', value: '4.2 kg' },
  { label: 'Dimensions', value: '540 x 320 x 42 mm' },
]

// -- Bento features --
const BENTO_FEATURES = [
  { index: '01', title: 'Adaptive Refresh', description: 'Variable refresh rate syncs to your content for zero tearing.', span: 'wide' },
  { index: '02', title: 'True Black', description: 'Micro-LED backlighting with 2,000+ dimming zones.', span: 'normal' },
  { index: '03', title: 'Color Precision', description: 'Factory-calibrated DCI-P3 coverage for accurate reproduction.', span: 'normal' },
  { index: '04', title: 'Integrated Sound', description: 'Spatial audio array with room calibration. No external speakers needed.', span: 'wide' },
]

// -- Animation variants --
const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.55, ease: [0.25, 0.46, 0.45, 0.94] as const },
  },
}

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1 } },
}

/**
 * 3D model slot. Replace the fallback with your R3F Canvas + model.
 *
 * Example with R3F:
 * ```tsx
 * import { Canvas } from '@react-three/fiber'
 * import { OrbitControls, useGLTF } from '@react-three/drei'
 *
 * function ProductModel() {
 *   const { scene } = useGLTF('/models/product.glb')
 *   return <primitive object={scene} scale={2} />
 * }
 *
 * <ProductModelSlot>
 *   <Canvas dpr={[1, 2]} camera={{ fov: 40, position: [0, 2, 8] }}>
 *     <ambientLight intensity={0.6} />
 *     <directionalLight position={[5, 5, 5]} intensity={0.8} />
 *     <ProductModel />
 *     <OrbitControls enableZoom={false} autoRotate autoRotateSpeed={1.5} />
 *   </Canvas>
 * </ProductModelSlot>
 * ```
 */
function ProductModelSlot({ children }: { children?: ReactNode }) {
  return (
    <Suspense
      fallback={
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: COLORS.muted }}>
          <p style={{ fontFamily: 'var(--font-mono, monospace)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            Loading model...
          </p>
        </div>
      }
    >
      {children ?? (
        /* Placeholder when no 3D model is provided */
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
          <div style={{
            width: 200, height: 200,
            border: `1px solid ${COLORS.border}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'var(--font-mono, monospace)', fontSize: 11,
            textTransform: 'uppercase', letterSpacing: '0.1em', color: COLORS.muted,
          }}>
            3D Model Slot
          </div>
        </div>
      )}
    </Suspense>
  )
}

function SoundToggle({ enabled, muted, onEnable, onToggleMute }: {
  enabled: boolean; muted: boolean; onEnable: () => void; onToggleMute: () => void
}) {
  return (
    <button
      onClick={enabled ? onToggleMute : onEnable}
      aria-label={enabled ? (muted ? 'Unmute sound' : 'Mute sound') : 'Enable sound'}
      style={{
        position: 'fixed', bottom: 16, right: 16, zIndex: 100,
        padding: '8px 14px', background: 'rgba(255,255,255,0.04)',
        border: `1px solid ${COLORS.border}`, color: COLORS.muted,
        fontFamily: 'var(--font-mono, monospace)', fontSize: 10,
        textTransform: 'uppercase', letterSpacing: '0.08em', cursor: 'pointer',
      }}
    >
      {!enabled ? 'Enable Sound' : muted ? 'Unmuted' : 'Muted'}
    </button>
  )
}

export default function ProductShowcase() {
  const reducedMotion = useReducedMotion()
  const { enable, enabled, muted, toggleMute, playHoverTone } = useSoundLayer({
    hoverSrc: '/audio/hover-tick.mp3',  // Provide your own audio file
    hoverVolume: 0.25,
  })

  return (
    <div style={{ background: COLORS.bg, color: COLORS.text, minHeight: '100vh' }}>
      <ScrollProgress color={COLORS.accent} />
      <SoundToggle enabled={enabled} muted={muted} onEnable={enable} onToggleMute={toggleMute} />

      {/* ── Hero with 3D Model ── */}
      <HeroScene
        telemetry={['Product / Display Pro', 'Status: Available', 'Rev: 2.4.0']}
      >
        <ProductModelSlot />
      </HeroScene>

      {/* ── Product Title ── */}
      <section style={{ padding: '80px 24px 40px', maxWidth: 800, margin: '0 auto', textAlign: 'center' }} aria-label="Product introduction">
        <motion.p
          initial="hidden" whileInView="visible" viewport={{ once: true }}
          variants={fadeUp}
          style={{ fontFamily: 'var(--font-mono, monospace)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.12em', color: COLORS.green, marginBottom: 12 }}
        >
          Introducing
        </motion.p>
        <motion.h1
          initial="hidden" whileInView="visible" viewport={{ once: true }}
          variants={fadeUp}
          style={{ fontSize: 'clamp(2rem, 5vw, 3rem)', fontWeight: 600, lineHeight: 1.1, marginBottom: 16 }}
        >
          Display Pro
        </motion.h1>
        <motion.p
          initial="hidden" whileInView="visible" viewport={{ once: true }}
          variants={fadeUp}
          style={{ fontSize: 15, color: COLORS.muted, lineHeight: 1.7, maxWidth: 480, margin: '0 auto' }}
        >
          A reference-grade display engineered for creative professionals. Every pixel calibrated, every frame synchronized.
        </motion.p>
      </section>

      {/* ── Bento Grid ── */}
      <section style={{ padding: '60px 24px 120px', maxWidth: 800, margin: '0 auto' }} aria-label="Features">
        <motion.div
          initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-40px' }}
          variants={stagger}
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: 16,
          }}
        >
          {BENTO_FEATURES.map((f) => (
            <motion.div
              key={f.index}
              variants={fadeUp}
              style={{ gridColumn: f.span === 'wide' ? 'span 2' : 'span 1' }}
              onPointerEnter={playHoverTone}
            >
              <GlassPanel style={{ padding: 28 }}>
                <p style={{ fontFamily: 'var(--font-mono, monospace)', fontSize: 10, color: COLORS.muted, marginBottom: 10 }}>
                  {f.index}
                </p>
                <h3 style={{ fontSize: 17, fontWeight: 600, marginBottom: 6 }}>{f.title}</h3>
                <p style={{ fontSize: 13, color: COLORS.muted, lineHeight: 1.6 }}>{f.description}</p>
              </GlassPanel>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* ── Specs ── */}
      <section style={{ padding: '80px 24px', borderTop: `1px solid ${COLORS.border}`, maxWidth: 800, margin: '0 auto' }} aria-label="Specifications">
        <motion.h2
          initial="hidden" whileInView="visible" viewport={{ once: true }}
          variants={fadeUp}
          style={{ fontFamily: 'var(--font-mono, monospace)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.12em', color: COLORS.accent, marginBottom: 40 }}
        >
          Specifications
        </motion.h2>
        <motion.div
          initial="hidden" whileInView="visible" viewport={{ once: true }}
          variants={stagger}
        >
          {SPECS.map((spec) => (
            <motion.div
              key={spec.label}
              variants={fadeUp}
              onPointerEnter={playHoverTone}
              style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
                padding: '16px 0', borderBottom: `1px solid ${COLORS.border}`,
              }}
            >
              <span style={{ fontFamily: 'var(--font-mono, monospace)', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.06em', color: COLORS.muted }}>
                {spec.label}
              </span>
              <span style={{ fontSize: 15, fontWeight: 500 }}>{spec.value}</span>
            </motion.div>
          ))}
        </motion.div>
      </section>
    </div>
  )
}
