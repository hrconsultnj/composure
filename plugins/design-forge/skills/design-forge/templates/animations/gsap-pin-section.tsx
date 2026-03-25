/**
 * GSAP Pinned Scroll Section — Pin a section and animate a timeline while scrolling
 *
 * Purpose: Pin content in place and sequence animations as the user scrolls through.
 * Dependencies: pnpm add gsap
 * Usage:
 *   <PinSection>
 *     <h2 className="pin-title">Feature</h2>
 *     <p className="pin-subtitle">Description</p>
 *     <div className="pin-cta">
 *       <button>Learn more</button>
 *     </div>
 *   </PinSection>
 */
'use client';

import { useEffect, useRef, type ReactNode } from 'react';

interface PinSectionProps {
  children: ReactNode;
  /** Scroll distance multiplier for how long the pin holds. @default 1.5 */
  scrollLength?: number;
  className?: string;
}

export function PinSection({ children, scrollLength = 1.5, className }: PinSectionProps) {
  const sectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const el = sectionRef.current;
    if (prefersReduced || !el) return;

    let tl: { kill: () => void } | undefined;

    (async () => {
      const gsap = (await import('gsap')).default;
      const { ScrollTrigger } = await import('gsap/ScrollTrigger');
      gsap.registerPlugin(ScrollTrigger);

      const timeline = gsap.timeline({
        scrollTrigger: {
          trigger: el,
          pin: true,
          scrub: 1,
          start: 'top top',
          end: `+=${el.offsetHeight * scrollLength}`,
        },
      });

      timeline
        .from(el.querySelector('.pin-title'), { opacity: 0, y: 50, duration: 1 })
        .from(el.querySelector('.pin-subtitle'), { opacity: 0, y: 30, duration: 1 }, '-=0.4')
        .from(el.querySelector('.pin-cta'), { opacity: 0, scale: 0.9, duration: 1 }, '-=0.3');

      tl = timeline;
    })();

    return () => { tl?.kill(); };
  }, [scrollLength]);

  return (
    <div
      ref={sectionRef}
      className={`min-h-screen flex flex-col items-center justify-center ${className ?? ''}`}
    >
      {children}
    </div>
  );
}
