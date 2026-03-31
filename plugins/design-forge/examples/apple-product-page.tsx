/**
 * Apple Product Page — Example composing Apple-style sections into a full page.
 *
 * Demonstrates: product-reveal-hero → pinned-timeline-showcase → counter-bar →
 * video-scroll-reveal → spec-comparison → product-options-cta
 *
 * Taxonomy: website · saas/creative · expressive intensity · apple-showcase preset
 *
 * Dependencies: pnpm add motion gsap @gsap/react
 */

"use client";

import { ProductRevealHero } from "../skills/design-forge/templates/sections/heroes/product-reveal-hero";
import { PinnedTimelineShowcase } from "../skills/design-forge/templates/sections/showcases/pinned-timeline-showcase";
import { CounterBar } from "../skills/design-forge/templates/sections/metrics/counter-bar";
import { VideoScrollReveal } from "../skills/design-forge/templates/sections/media/video-scroll-reveal";
import { SpecComparison } from "../skills/design-forge/templates/sections/metrics/spec-comparison";
import { ProductOptionsCTA } from "../skills/design-forge/templates/sections/ctas/product-options-cta";
import { SectionDivider } from "../skills/design-forge/templates/sections/_shared/section-divider";

const INTENSITY = "expressive" as const;

export default function AppleProductPage() {
  return (
    <main className="bg-black text-white">
      {/* Hero: Canvas image sequence product reveal */}
      <ProductRevealHero
        heading="MacBook Pro"
        subheading="Mind-blowing. Head-turning."
        frameCount={120}
        getFrameUrl={(i) => `/frames/macbook-${String(i).padStart(4, "0")}.webp`}
        fallbackImage="/macbook-hero.jpg"
        primaryCta={
          <a
            href="#buy"
            className="rounded-full bg-blue-600 px-8 py-3 text-sm font-medium hover:bg-blue-500"
          >
            Buy
          </a>
        }
        secondaryCta={
          <a
            href="#learn"
            className="rounded-full border border-white/20 px-8 py-3 text-sm font-medium hover:border-white/40"
          >
            Learn more
          </a>
        }
        animationIntensity={INTENSITY}
      />

      {/* Pinned showcase: M4 chip performance */}
      <PinnedTimelineShowcase
        title="M4 Pro Chip"
        subtitle="A new class of performance for a new class of professional."
        metrics={[
          { label: "CPU cores", value: "14" },
          { label: "GPU cores", value: "20" },
          { label: "Neural Engine", value: "16-core" },
          { label: "Memory bandwidth", value: "273 GB/s" },
        ]}
        visual={
          <div className="relative mx-auto aspect-video max-w-3xl overflow-hidden rounded-2xl bg-gradient-to-br from-purple-900/30 to-blue-900/30">
            <img
              src="/chip-render.jpg"
              alt="M4 Pro chip"
              className="h-full w-full object-cover"
            />
          </div>
        }
        scrollDistance={3}
        animationIntensity={INTENSITY}
      />

      <SectionDivider variant="gradient-fade" />

      {/* Metrics: Performance numbers */}
      <CounterBar
        heading="Pro performance, quantified"
        metrics={[
          { target: 2, suffix: "x", label: "Faster than M3 Pro" },
          { target: 22, label: "Hours battery life" },
          { target: 48, suffix: "GB", label: "Unified memory" },
          { target: 273, suffix: " GB/s", label: "Memory bandwidth" },
        ]}
        layout="bar"
        animationIntensity={INTENSITY}
      />

      <SectionDivider variant="gradient-fade" />

      {/* Video reveal: Display showcase */}
      <VideoScrollReveal
        src="/macbook-display.mp4"
        poster="/macbook-display-poster.jpg"
        heading="Liquid Retina XDR Display"
        description="Extreme Dynamic Range. 1,600 nits peak brightness. 1,000,000:1 contrast ratio."
        revealStyle="clip-inset"
        animationIntensity={INTENSITY}
      />

      <SectionDivider variant="gradient-fade" />

      {/* Spec comparison: Pro vs Max */}
      <SpecComparison
        heading="Compare models"
        products={[
          {
            name: "MacBook Pro 14\"",
            badge: "Starting at",
            specs: {
              "Chip": "M4 Pro",
              "CPU": "14-core",
              "GPU": "20-core",
              "Memory": "24GB",
              "Storage": "512GB SSD",
              "Battery": "17 hours",
              "Display": "14.2\" Liquid Retina XDR",
              "Price": "From $1,999",
            },
          },
          {
            name: "MacBook Pro 16\"",
            badge: "Most powerful",
            specs: {
              "Chip": "M4 Max",
              "CPU": "16-core",
              "GPU": "40-core",
              "Memory": "48GB",
              "Storage": "1TB SSD",
              "Battery": "22 hours",
              "Display": "16.2\" Liquid Retina XDR",
              "Price": "From $3,499",
            },
          },
        ]}
        highlightProduct={1}
        animationIntensity={INTENSITY}
      />

      <SectionDivider variant="gradient-fade" />

      {/* CTA: Product selection */}
      <ProductOptionsCTA
        id="buy"
        heading="Which MacBook Pro is right for you?"
        options={[
          {
            name: "14\" M4",
            price: "$1,599",
            features: ["M4 chip", "16GB memory", "512GB storage", "10-core GPU"],
            badge: "Starting at",
          },
          {
            name: "14\" M4 Pro",
            price: "$1,999",
            features: ["M4 Pro chip", "24GB memory", "512GB storage", "20-core GPU"],
            highlighted: true,
          },
          {
            name: "16\" M4 Pro",
            price: "$2,499",
            features: ["M4 Pro chip", "24GB memory", "512GB storage", "20-core GPU"],
            badge: "New",
          },
        ]}
        ctaLabel="Buy"
        animationIntensity={INTENSITY}
      />
    </main>
  );
}
