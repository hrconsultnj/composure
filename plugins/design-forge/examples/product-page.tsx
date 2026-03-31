"use client"

/**
 * Product Page — Full Apple MacBook Pro-style page composed from section templates + showcase components.
 *
 * 16 sections: Hero → Highlights → Configurator → Chip Explorer → Performance →
 * AI → Battery → macOS → Apps → Display → Camera → Security → Compare →
 * Upgrade → Testimonials → CTA
 *
 * Taxonomy: website · saas/creative · expressive intensity
 *
 * Note: In the gallery preview app, imports resolve via @sections/* and @/components/*.
 * When copying to a user project, adjust import paths to match your file structure.
 */

// Section templates (via @sections/* alias in gallery app)
import { GradientHeadlineHero } from "../skills/design-forge/templates/sections/heroes/gradient-headline-hero";
import { PinnedTimelineShowcase } from "../skills/design-forge/templates/sections/showcases/pinned-timeline-showcase";
import { FeatureCardGrid } from "../skills/design-forge/templates/sections/showcases/feature-card-grid";
import { CounterBar } from "../skills/design-forge/templates/sections/metrics/counter-bar";
import { SpecComparison } from "../skills/design-forge/templates/sections/metrics/spec-comparison";
import { TestimonialCarousel } from "../skills/design-forge/templates/sections/social-proof/testimonial-carousel";
import { TrustSignals } from "../skills/design-forge/templates/sections/social-proof/trust-signals";
import { FAQAccordion } from "../skills/design-forge/templates/sections/content/faq-accordion";
import { GradientCTA } from "../skills/design-forge/templates/sections/ctas/gradient-cta";

// Showcase components (via @/components/showcase/* in gallery app)
import { MacBookVisual } from "../components/showcase/macbook-visual";
import { ChipExplorePill } from "../components/showcase/chip-explore-pill";
import { DisplayShowcase } from "../components/showcase/display-showcase";
import { HighlightsGallery } from "../components/showcase/highlights-gallery";
import { ProductConfigurator } from "../components/showcase/product-configurator";
import { IconFeatureGrid } from "../components/showcase/icon-feature-grid";
import { AppCategoryGrid } from "../components/showcase/app-category-grid";
import { UpgradeComparison } from "../components/showcase/upgrade-comparison";

function Btn({ children, primary }: { children: string; primary?: boolean }) {
  return (
    <span className={`inline-flex items-center justify-center rounded-full px-7 py-3 text-sm font-medium transition-all ${primary ? "bg-white text-black hover:bg-white/90" : "border border-white/20 text-white hover:bg-white/10"}`}>
      {children}
    </span>
  );
}

function GradientBox({ colors, label }: { colors: string; label?: string }) {
  return (
    <div className={`absolute inset-0 bg-gradient-to-br ${colors}`}>
      {label && <div className="absolute bottom-3 left-3 font-mono text-[9px] text-white/30 uppercase tracking-wider">{label}</div>}
    </div>
  );
}

export default function ProductPage() {
  return (
    <div className="bg-black text-white">
      {/* 1. HERO */}
      <GradientHeadlineHero
        announcement={<span className="text-xs">New — The M5 chip family is here</span>}
        heading="MacBook Pro"
        gradientHeading
        description="Unprecedented power. Unmistakable design. The most advanced Mac laptop ever."
        primaryCta={<Btn primary>Buy</Btn>}
        secondaryCta={<Btn>Learn more</Btn>}
        animationIntensity="expressive"
        gradientFrom="#4a78ff"
        gradientTo="#9333ea"
      />

      {/* 2. HIGHLIGHTS */}
      <HighlightsGallery
        tabs={[
          { label: "M5 Chips", heading: "M5, M5 Pro, and M5 Max.", description: "Up to 8x faster than M1. Unprecedented performance for AI, graphics, and compute.", visual: <GradientBox colors="from-indigo-600/20 to-violet-600/20" label="M5 chip" /> },
          { label: "AI", heading: "Built for AI. From the silicon up.", description: "Hardware-accelerated AI with Neural Accelerators. Run LLMs, generate images — all on device.", visual: <GradientBox colors="from-cyan-600/20 to-blue-600/20" label="AI" /> },
          { label: "Battery", heading: "All-day battery life.", description: "Up to 24 hours. Fast charge to 50% in 30 minutes.", visual: <GradientBox colors="from-emerald-600/20 to-teal-600/20" label="Battery" /> },
          { label: "macOS", heading: "macOS Tahoe.", description: "Liquid Glass, enhanced Spotlight, Live Translation.", visual: <GradientBox colors="from-amber-600/20 to-orange-600/20" label="macOS" /> },
          { label: "iPhone", heading: "Mac + iPhone.", description: "iPhone Mirroring, Live Activities, Universal Clipboard.", visual: <GradientBox colors="from-pink-600/20 to-rose-600/20" label="Continuity" /> },
        ]}
        intensity="moderate"
      />

      {/* 3. CONFIGURATOR */}
      <ProductConfigurator
        tabs={[
          { label: "Sizes", content: <div className="text-center py-12"><p className="text-white/40 text-sm">The 14-inch with M5 or M5 Pro. The 16-inch with M5 Pro or M5 Max.</p><div className="mt-6 flex justify-center gap-8"><div className="text-center"><div className="text-3xl font-bold text-white/80">14&quot;</div><div className="text-xs text-white/30 mt-1">From $1,599</div></div><div className="text-center"><div className="text-3xl font-bold text-white/80">16&quot;</div><div className="text-xs text-white/30 mt-1">From $2,499</div></div></div></div> },
          { label: "Colors", content: <div className="text-center py-12"><div className="flex justify-center gap-6"><div className="text-center"><div className="h-12 w-12 rounded-full bg-[#1d1d1f] border border-white/10 mx-auto" /><span className="text-xs text-white/40 mt-2 block">Space Black</span></div><div className="text-center"><div className="h-12 w-12 rounded-full bg-[#e3e4e5] mx-auto" /><span className="text-xs text-white/40 mt-2 block">Silver</span></div></div></div> },
          { label: "Display", content: <div className="text-center py-12"><p className="text-white/40 text-sm">Liquid Retina XDR. 1600 nits peak HDR. ProMotion 120Hz.</p></div> },
          { label: "Ports", content: <div className="text-center py-12"><p className="text-white/40 text-sm">Thunderbolt 5, HDMI, SDXC, headphone jack, MagSafe.</p></div> },
        ]}
        productVisual={<MacBookVisual />}
        intensity="moderate"
      />

      {/* 4. CHIP EXPLORER — fades in after configurator */}
      <ChipExplorePill />

      {/* 5. PERFORMANCE */}
      <PinnedTimelineShowcase
        title="Performance"
        subtitle="M5. M5 Pro. M5 Max. Pick your quick."
        metrics={[
          { value: "8x", label: "Faster AI than M1" },
          { value: "40", label: "GPU Cores (Max)" },
          { value: "128GB", label: "Unified Memory" },
          { value: "6.4x", label: "Faster LLM" },
        ]}
        visual={<MacBookVisual />}
        animationIntensity="expressive"
      />

      {/* 6. AI */}
      <FeatureCardGrid
        eyebrow="Artificial Intelligence"
        heading="Built for AI. From the silicon up."
        items={[
          { title: "Neural Accelerator", description: "Up to 8x faster AI than M1. LLMs, image generation, ML models — on device." },
          { title: "Apple Intelligence", description: "Writing Tools, Image Playground, Siri — on-device with Private Cloud Compute." },
          { title: "AI Apps", description: "DiffusionBee, LM Studio, Topaz Video — optimized for Apple silicon." },
        ]}
        columns={3}
        animationIntensity="moderate"
      />

      {/* 7. BATTERY */}
      <CounterBar
        heading="All-day battery life."
        metrics={[
          { target: 24, label: "Hours Battery" },
          { target: 14, suffix: "+", label: "More than Intel" },
          { target: 50, suffix: "%", label: "in 30 Min" },
        ]}
        animationIntensity="expressive"
      />

      {/* 8. macOS */}
      <IconFeatureGrid
        heading="macOS Tahoe"
        tagline="Fresh faced. Timelessly Mac."
        features={[
          { icon: <span>💎</span>, title: "Liquid Glass", description: "Translucent surfaces, dynamic reflections, fluid animations." },
          { icon: <span>🔍</span>, title: "Spotlight", description: "Message, take notes, launch workflows instantly." },
          { icon: <span>🌐</span>, title: "Live Translation", description: "Translate in Messages, FaceTime, Phone in real time." },
          { icon: <span>⚡</span>, title: "Shortcuts", description: "Triggered by time, location, or app context." },
        ]}
        columns={4}
        intensity="moderate"
      />

      {/* 9. APPS */}
      <AppCategoryGrid
        categories={[
          { label: "Coding", heading: "Get with the program.", description: "Build, compile, deploy faster.", apps: ["Xcode", "VS Code", "Docker", "IntelliJ"], visual: <GradientBox colors="from-blue-600/20 to-cyan-600/20" label="Code" /> },
          { label: "Video", heading: "Craft stories.", description: "Edit 8K ProRes without dropping a frame.", apps: ["DaVinci Resolve", "Final Cut Pro", "Premiere"], visual: <GradientBox colors="from-violet-600/20 to-purple-600/20" label="Video" /> },
          { label: "3D", heading: "Bring imagination to life.", description: "GPU-accelerated ray tracing.", apps: ["Blender", "Cinema 4D", "Maya"], visual: <GradientBox colors="from-orange-600/20 to-amber-600/20" label="3D" /> },
          { label: "Design", heading: "Find your type.", description: "GPU-accelerated canvas.", apps: ["Figma", "Sketch", "Illustrator"], visual: <GradientBox colors="from-emerald-600/20 to-teal-600/20" label="Design" /> },
          { label: "Gaming", heading: "Play favorites.", description: "Ray tracing, MetalFX, Game Mode.", apps: ["Cyberpunk 2077", "Control", "Frostpunk 2"], visual: <GradientBox colors="from-red-600/20 to-orange-600/20" label="Gaming" /> },
        ]}
        intensity="moderate"
      />

      {/* 10. DISPLAY */}
      <DisplayShowcase />

      {/* 11. CAMERA + SECURITY */}
      <IconFeatureGrid
        heading="Camera"
        tagline="The ultimate show and tell."
        features={[
          { icon: <span>📸</span>, title: "12MP Center Stage", description: "Keeps you in frame during video calls." },
          { icon: <span>🖥️</span>, title: "Desk View", description: "Your face and desk, simultaneously." },
          { icon: <span>🎙️</span>, title: "Studio Mics", description: "Three-mic array, directional beamforming." },
        ]}
        columns={3}
        intensity="gentle"
      />
      <IconFeatureGrid
        heading="Security"
        tagline="No compromises."
        features={[
          { icon: <span>👆</span>, title: "Touch ID", description: "Unlock, sign in, pay securely." },
          { icon: <span>📍</span>, title: "Find My", description: "Locate, lock, or erase remotely." },
          { icon: <span>🔒</span>, title: "FileVault", description: "Encrypt everything automatically." },
        ]}
        columns={3}
        intensity="gentle"
      />

      {/* 12. COMPARE */}
      <SpecComparison
        heading="Compare models"
        products={[
          { name: "MacBook Air", specs: { Chip: "M4", Battery: "18 hours", Display: "13.6\" / 15.3\"", Memory: "Up to 32GB" } },
          { name: "MacBook Pro 14\"", badge: "Popular", specs: { Chip: "M5 / M5 Pro", Battery: "24 hours", Display: "14.2\" XDR", Memory: "Up to 48GB" } },
          { name: "MacBook Pro 16\"", specs: { Chip: "M5 Pro / Max", Battery: "24 hours", Display: "16.2\" XDR", Memory: "Up to 128GB" } },
        ]}
        highlightProduct={1}
        animationIntensity="moderate"
      />

      {/* 13. UPGRADE */}
      <UpgradeComparison
        options={[
          { label: "13\" with M1 or M2", benefits: [
            { icon: <span>⚡</span>, text: "AI tasks up to 6x faster" },
            { icon: <span>🔌</span>, text: "Thunderbolt 5 + more ports" },
            { icon: <span>🎮</span>, text: "Hardware ray tracing" },
            { icon: <span>☀️</span>, text: "1600 nits XDR display" },
          ]},
          { label: "13\" Intel-based", benefits: [
            { icon: <span>🧠</span>, text: "AI tasks up to 86x faster" },
            { icon: <span>🖥️</span>, text: "Liquid Retina XDR display" },
            { icon: <span>⚡</span>, text: "Neural Accelerators in GPU" },
            { icon: <span>🔋</span>, text: "14 more hours battery" },
          ]},
        ]}
        ctaAction={<Btn primary>See what your device is worth</Btn>}
        intensity="moderate"
      />

      {/* 14. SOCIAL PROOF */}
      <TestimonialCarousel
        heading="What professionals say"
        testimonials={[
          { quote: "The M5 Max handles our entire post-production pipeline.", name: "David Park", role: "Senior Editor", company: "Framelight Studios" },
          { quote: "Full day of development without reaching for a charger.", name: "Priya Sharma", role: "Lead Developer", company: "Arc Technologies" },
          { quote: "The display is indistinguishable from our reference monitor.", name: "Lisa Chen", role: "Creative Director", company: "Pixel & Co" },
        ]}
        animationIntensity="gentle"
      />
      <TrustSignals
        heading="Why Mac"
        signals={[
          { type: "metric", value: "24hr", label: "Battery Life" },
          { type: "badge", label: "Carbon Neutral" },
          { type: "metric", value: "100%", label: "Recycled Aluminum" },
          { type: "badge", label: "Trade-In Ready" },
        ]}
        animationIntensity="gentle"
      />

      {/* 15. FAQ */}
      <FAQAccordion
        heading="Questions? Answers."
        items={[
          { question: "Which MacBook Pro is right for me?", answer: "M5 for everyday. M5 Pro for pro workflows. M5 Max for extreme workloads." },
          { question: "How much memory do I need?", answer: "8GB everyday. 16-24GB pro. 48GB+ for large datasets and 3D." },
          { question: "External displays?", answer: "Up to 2 (M5), 3 (M5 Pro), 4 (M5 Max) via Thunderbolt 5 + HDMI." },
        ]}
        animationIntensity="gentle"
      />

      {/* 16. CTA */}
      <GradientCTA
        heading="Get the new MacBook Pro"
        description="Starting at $1,599. Free delivery. Trade in your current Mac for credit."
        primaryCta={<Btn primary>Buy MacBook Pro</Btn>}
        secondaryCta={<Btn>Compare models</Btn>}
        gradientFrom="#4a78ff"
        gradientTo="#7c3aed"
        animationIntensity="moderate"
      />
    </div>
  );
}
