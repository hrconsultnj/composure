/**
 * Gemini Landing Page — Example composing Gemini-style sections into a full page.
 *
 * Demonstrates: gradient-headline-hero → feature-card-grid → capabilities-bento →
 * full-bleed-media → counter-bar → testimonial-carousel → logo-marquee →
 * faq-accordion → gradient-cta
 *
 * Taxonomy: website · saas · modern · moderate intensity
 *
 * Dependencies: pnpm add motion
 */

"use client";

import { GradientHeadlineHero } from "../skills/design-forge/templates/sections/heroes/gradient-headline-hero";
import { FeatureCardGrid } from "../skills/design-forge/templates/sections/showcases/feature-card-grid";
import { CapabilitiesBento } from "../skills/design-forge/templates/sections/showcases/capabilities-bento";
import { FullBleedMedia } from "../skills/design-forge/templates/sections/media/full-bleed-media";
import { CounterBar } from "../skills/design-forge/templates/sections/metrics/counter-bar";
import { TestimonialCarousel } from "../skills/design-forge/templates/sections/social-proof/testimonial-carousel";
import { LogoMarquee } from "../skills/design-forge/templates/sections/social-proof/logo-marquee";
import { FAQAccordion } from "../skills/design-forge/templates/sections/content/faq-accordion";
import { GradientCTA } from "../skills/design-forge/templates/sections/ctas/gradient-cta";
import { SectionDivider } from "../skills/design-forge/templates/sections/_shared/section-divider";

const INTENSITY = "moderate" as const;

export default function GeminiLandingPage() {
  return (
    <main className="bg-[#070809] text-white">
      {/* Hero: Gradient headline with announcement */}
      <GradientHeadlineHero
        announcement={
          <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            Now available: Gemini 3.0 Ultra
          </span>
        }
        heading="Supercharge your creativity with AI"
        gradientHeading
        description="The most capable AI model, designed to help you think, create, and build — right from your browser."
        primaryCta={
          <a
            href="/start"
            className="rounded-full bg-white px-8 py-3 text-sm font-medium text-black hover:bg-white/90"
          >
            Try Gemini Free
          </a>
        }
        secondaryCta={
          <a
            href="/enterprise"
            className="rounded-full border border-white/20 px-8 py-3 text-sm font-medium hover:border-white/40"
          >
            For Enterprise
          </a>
        }
        gradientFrom="#6366f1"
        gradientTo="#8b5cf6"
        animationIntensity={INTENSITY}
      />

      <SectionDivider variant="gradient-fade" />

      {/* Feature cards: Key capabilities */}
      <FeatureCardGrid
        eyebrow="Capabilities"
        heading="One model, endless possibilities"
        description="From writing to coding to analysis — Gemini handles it all with state-of-the-art performance."
        items={[
          {
            title: "Creative Writing",
            description: "Generate stories, scripts, poems, and marketing copy with nuanced understanding of tone and style.",
          },
          {
            title: "Code Generation",
            description: "Write, debug, and explain code across 20+ programming languages with contextual awareness.",
          },
          {
            title: "Data Analysis",
            description: "Upload spreadsheets and documents for instant insights, summaries, and visualizations.",
          },
          {
            title: "Image Understanding",
            description: "Analyze images, diagrams, and screenshots with detailed visual comprehension.",
          },
          {
            title: "Research & Learning",
            description: "Explore topics deeply with cited sources, balanced perspectives, and structured learning paths.",
          },
          {
            title: "Multilingual",
            description: "Communicate fluently in 40+ languages with cultural context and natural expression.",
          },
        ]}
        columns={3}
        animationIntensity={INTENSITY}
      />

      {/* Capabilities bento: Visual showcase */}
      <CapabilitiesBento
        eyebrow="How it works"
        heading="Built for the way you work"
        items={[
          {
            title: "Multimodal Input",
            description: "Text, images, audio, video — all in one conversation.",
            colSpan: 2,
            rowSpan: 2,
            content: (
              <div className="h-full rounded-lg bg-gradient-to-br from-indigo-500/10 to-purple-500/10 p-4">
                <div className="text-xs text-[#a1a1a1]">Upload any file type...</div>
              </div>
            ),
          },
          {
            title: "1M Token Context",
            description: "Process entire codebases and documents at once.",
          },
          {
            title: "Real-time Web",
            description: "Access current information with grounded responses.",
          },
          {
            title: "Extensions",
            description: "Connect to Google Workspace, Maps, Flights, and more.",
            colSpan: 2,
          },
        ]}
        animationIntensity={INTENSITY}
      />

      <SectionDivider variant="gradient-fade" />

      {/* Full-bleed media: Product screenshot */}
      <FullBleedMedia
        src="/gemini-interface.jpg"
        alt="Gemini AI interface showing a conversation"
        heading="A conversation that understands you"
        description="Natural, helpful, and always ready."
        overlayPosition="bottom-center"
        aspectRatio="21/9"
        animationIntensity={INTENSITY}
      />

      <SectionDivider variant="gradient-fade" />

      {/* Metrics */}
      <CounterBar
        heading="Trusted at scale"
        metrics={[
          { target: 300, suffix: "M+", label: "Monthly active users" },
          { target: 180, suffix: "+", label: "Countries" },
          { target: 40, suffix: "+", label: "Languages" },
          { target: 99.9, suffix: "%", decimals: 1, label: "Uptime" },
        ]}
        animationIntensity={INTENSITY}
      />

      {/* Testimonials */}
      <TestimonialCarousel
        heading="What people are saying"
        testimonials={[
          {
            quote: "Gemini has completely transformed how our team approaches content creation. It's like having a brilliant colleague available 24/7.",
            name: "Sarah Chen",
            role: "VP of Marketing",
            company: "TechCorp",
          },
          {
            quote: "The code generation capabilities are outstanding. We've cut our development time by 40% since adopting Gemini.",
            name: "Marcus Johnson",
            role: "Engineering Lead",
            company: "StartupXYZ",
          },
          {
            quote: "As a researcher, the ability to analyze papers and datasets in a single conversation is invaluable.",
            name: "Dr. Emily Park",
            role: "Research Scientist",
            company: "University of Technology",
          },
        ]}
        animationIntensity={INTENSITY}
      />

      {/* Logo marquee: Partners */}
      <LogoMarquee
        heading="Integrated with the tools you love"
        logos={[
          { src: "/logos/google-workspace.svg", alt: "Google Workspace" },
          { src: "/logos/github.svg", alt: "GitHub" },
          { src: "/logos/slack.svg", alt: "Slack" },
          { src: "/logos/notion.svg", alt: "Notion" },
          { src: "/logos/figma.svg", alt: "Figma" },
          { src: "/logos/linear.svg", alt: "Linear" },
        ]}
        speed={35}
        animationIntensity={INTENSITY}
      />

      <SectionDivider variant="gradient-fade" />

      {/* FAQ */}
      <FAQAccordion
        heading="Frequently asked questions"
        items={[
          {
            question: "What is Gemini?",
            answer: "Gemini is Google's most capable AI model, designed to be multimodal from the ground up. It can understand and generate text, code, images, audio, and video.",
          },
          {
            question: "How much does it cost?",
            answer: "Gemini is free to use for personal tasks. Gemini Advanced with the Ultra model is available through Google One AI Premium at $19.99/month, which also includes 2TB of storage.",
          },
          {
            question: "Is my data safe?",
            answer: "Your conversations are encrypted in transit and at rest. We don't use your personal Gemini conversations to train our models. Enterprise customers get additional data governance controls.",
          },
          {
            question: "Can I use Gemini for work?",
            answer: "Yes! Gemini for Google Workspace is available for business users. It integrates with Gmail, Docs, Sheets, Slides, and Meet to boost productivity across your organization.",
          },
          {
            question: "What languages does Gemini support?",
            answer: "Gemini supports 40+ languages for both understanding and generation, including English, Spanish, French, German, Japanese, Korean, Chinese, Arabic, Hindi, and many more.",
          },
        ]}
        animationIntensity={INTENSITY}
      />

      <SectionDivider variant="gradient-fade" />

      {/* Final CTA */}
      <GradientCTA
        heading="Ready to explore what's possible?"
        description="Start using Gemini today — free for everyone."
        primaryCta={
          <a
            href="/start"
            className="rounded-full bg-white px-8 py-3 text-sm font-medium text-black hover:bg-white/90"
          >
            Get Started Free
          </a>
        }
        secondaryCta={
          <a
            href="/developers"
            className="rounded-full border border-white/20 px-8 py-3 text-sm font-medium hover:border-white/40"
          >
            Developer API
          </a>
        }
        gradientFrom="#6366f1"
        gradientTo="#a855f7"
        animationIntensity={INTENSITY}
      />
    </main>
  );
}
