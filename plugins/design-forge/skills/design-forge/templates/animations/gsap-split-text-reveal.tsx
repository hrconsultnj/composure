/**
 * GSAP SplitText Reveal — Character-by-character text reveal on scroll
 *
 * Purpose: Split heading text into characters and animate them in with stagger.
 * Dependencies: pnpm add gsap (SplitText requires GSAP Club license: gsap.com/pricing)
 * Usage:
 *   <SplitTextReveal>
 *     <h2 className="text-4xl font-bold">Your heading here</h2>
 *   </SplitTextReveal>
 */
'use client';

import { useEffect, useRef, type ReactNode } from 'react';

interface SplitTextRevealProps {
  children: ReactNode;
  /** Split type: chars, words, or lines. @default "chars" */
  type?: 'chars' | 'words' | 'lines';
  /** Stagger delay between each unit. @default 0.03 */
  stagger?: number;
  className?: string;
}

export function SplitTextReveal({
  children,
  type = 'chars',
  stagger = 0.03,
  className,
}: SplitTextRevealProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const el = containerRef.current;
    if (prefersReduced || !el) return;

    let cleanup: (() => void) | undefined;

    (async () => {
      const gsap = (await import('gsap')).default;
      const { ScrollTrigger } = await import('gsap/ScrollTrigger');
      const { SplitText } = await import('gsap/SplitText');
      gsap.registerPlugin(ScrollTrigger, SplitText);

      const target = el.querySelector('h1, h2, h3, h4, h5, h6, p') ?? el;

      const split = SplitText.create(target, {
        type,
        autoSplit: true,
        onSplit(self) {
          const units = self[type] ?? self.chars;
          return gsap.from(units, {
            opacity: 0,
            y: 20,
            stagger,
            duration: 0.4,
            ease: 'power2.out',
            scrollTrigger: {
              trigger: el,
              start: 'top 80%',
              toggleActions: 'play none none none',
            },
          });
        },
      });

      cleanup = () => {
        split.revert();
        ScrollTrigger.getAll().forEach((t) => t.kill());
      };
    })();

    return () => cleanup?.();
  }, [type, stagger]);

  return (
    <div ref={containerRef} className={className} style={{ fontKerning: 'none' }}>
      {children}
    </div>
  );
}
