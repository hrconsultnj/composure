/**
 * GSAP Flip Layout — Animate grid item reorder with FLIP technique
 *
 * Purpose: Capture layout state, apply DOM changes, animate from previous to new state.
 * Dependencies: pnpm add gsap
 * Usage:
 *   <FlipGrid items={['Alpha', 'Beta', 'Gamma', 'Delta']} />
 */
'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

interface FlipGridProps {
  items: string[];
  className?: string;
}

export function FlipGrid({ items, className }: FlipGridProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const flipStateRef = useRef<unknown>(null);
  const gsapRef = useRef<typeof import('gsap').default | null>(null);
  const FlipRef = useRef<unknown>(null);
  const [sorted, setSorted] = useState(false);

  // Load GSAP + Flip once
  useEffect(() => {
    (async () => {
      const gsap = (await import('gsap')).default;
      const { Flip } = await import('gsap/Flip');
      gsap.registerPlugin(Flip);
      gsapRef.current = gsap;
      FlipRef.current = Flip;
    })();
  }, []);

  const handleToggle = useCallback(() => {
    const Flip = FlipRef.current as typeof import('gsap/Flip').Flip | null;
    if (!Flip || !containerRef.current) return;

    // Capture current state before React re-renders
    flipStateRef.current = Flip.getState('.flip-item');
    setSorted((prev) => !prev);
  }, []);

  // Animate after re-render
  useEffect(() => {
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const Flip = FlipRef.current as typeof import('gsap/Flip').Flip | null;
    const state = flipStateRef.current;
    if (prefersReduced || !Flip || !state) return;

    Flip.from(state as ReturnType<typeof Flip.getState>, {
      duration: 0.5,
      ease: 'power2.inOut',
      stagger: 0.04,
      absolute: true,
    });

    flipStateRef.current = null;
  }, [sorted]);

  const displayed = sorted ? [...items].sort() : items;

  return (
    <div className={className}>
      <button
        onClick={handleToggle}
        className="mb-4 px-4 py-2 rounded bg-white/10 hover:bg-white/20 transition-colors"
      >
        {sorted ? 'Unsort' : 'Sort A-Z'}
      </button>
      <div ref={containerRef} className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {displayed.map((item) => (
          <div
            key={item}
            data-flip-id={item}
            className="flip-item p-4 rounded-lg bg-white/5 border border-white/10 text-center"
          >
            {item}
          </div>
        ))}
      </div>
    </div>
  );
}
