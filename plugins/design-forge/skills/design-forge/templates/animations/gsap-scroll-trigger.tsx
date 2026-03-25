/**
 * GSAP ScrollTrigger Parallax Section
 *
 * Purpose: Scroll-linked parallax where a background element moves slower than content.
 * Dependencies: pnpm add gsap
 * Usage:
 *   <ParallaxSection>
 *     <ParallaxSection.Background>
 *       <img src="/hero.jpg" alt="" className="w-full h-[120%] object-cover" />
 *     </ParallaxSection.Background>
 *     <ParallaxSection.Content><h1>Content</h1></ParallaxSection.Content>
 *   </ParallaxSection>
 */
'use client';

import { useEffect, useRef, type ReactNode } from 'react';

type Props = { children: ReactNode; className?: string };

export function ParallaxSection({ children, className }: Props) {
  return (
    <section className={`relative overflow-hidden ${className ?? ''}`}>
      {children}
    </section>
  );
}

function Background({ children, speed = -30 }: { children: ReactNode; speed?: number }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const el = ref.current;
    const parent = el?.parentElement;
    if (prefersReduced || !el || !parent) return;

    let trigger: { kill: () => void } | undefined;

    (async () => {
      const gsap = (await import('gsap')).default;
      const { ScrollTrigger } = await import('gsap/ScrollTrigger');
      gsap.registerPlugin(ScrollTrigger);

      gsap.to(el, {
        yPercent: speed,
        ease: 'none',
        scrollTrigger: {
          trigger: parent,
          scrub: true,
          start: 'top bottom',
          end: 'bottom top',
        },
      });

      trigger = ScrollTrigger.getAll().at(-1);
    })();

    return () => { trigger?.kill(); };
  }, [speed]);

  return (
    <div ref={ref} className="absolute inset-0 will-change-transform">
      {children}
    </div>
  );
}

function Content({ children, className }: Props) {
  return <div className={`relative z-10 ${className ?? ''}`}>{children}</div>;
}

ParallaxSection.Background = Background;
ParallaxSection.Content = Content;
