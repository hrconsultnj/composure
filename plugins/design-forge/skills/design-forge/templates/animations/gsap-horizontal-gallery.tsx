/**
 * GSAP Horizontal Gallery — Vertical scroll drives horizontal panel movement
 *
 * Purpose: Pin a section and scroll horizontally through panels using containerAnimation.
 * Dependencies: pnpm add gsap
 * Usage:
 *   <HorizontalGallery>
 *     <HorizontalGallery.Panel>Panel 1 content</HorizontalGallery.Panel>
 *     <HorizontalGallery.Panel>Panel 2 content</HorizontalGallery.Panel>
 *     <HorizontalGallery.Panel>Panel 3 content</HorizontalGallery.Panel>
 *   </HorizontalGallery>
 */
'use client';

import { useEffect, useRef, type ReactNode } from 'react';

interface GalleryProps {
  children: ReactNode;
  className?: string;
}

export function HorizontalGallery({ children, className }: GalleryProps) {
  const sectionRef = useRef<HTMLElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const section = sectionRef.current;
    const wrapper = wrapperRef.current;
    if (prefersReduced || !section || !wrapper) return;

    let ctx: { revert: () => void } | undefined;

    (async () => {
      const gsap = (await import('gsap')).default;
      const { ScrollTrigger } = await import('gsap/ScrollTrigger');
      gsap.registerPlugin(ScrollTrigger);

      const panels = gsap.utils.toArray<HTMLElement>('.h-gallery-panel', wrapper);
      if (panels.length < 2) return;

      ctx = gsap.context(() => {
        gsap.to(panels, {
          xPercent: -100 * (panels.length - 1),
          ease: 'none', // CRITICAL — must be linear for containerAnimation
          scrollTrigger: {
            trigger: section,
            pin: true,
            scrub: 1,
            snap: 1 / (panels.length - 1),
            end: () => `+=${wrapper.scrollWidth}`,
          },
        });
      }, section);
    })();

    return () => ctx?.revert();
  }, []);

  return (
    <section ref={sectionRef} className={`overflow-hidden ${className ?? ''}`}>
      <div ref={wrapperRef} className="flex w-max">
        {children}
      </div>
    </section>
  );
}

function Panel({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`h-gallery-panel w-screen h-screen flex items-center justify-center shrink-0 ${className ?? ''}`}
    >
      {children}
    </div>
  );
}

HorizontalGallery.Panel = Panel;
