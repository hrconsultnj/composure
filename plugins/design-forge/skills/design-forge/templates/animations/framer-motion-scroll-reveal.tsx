/**
 * Framer Motion Scroll Reveal — Fade-in-up triggered by viewport entry
 *
 * Purpose: Animate sections into view as the user scrolls down the page.
 * Dependencies: pnpm add framer-motion
 * Usage:
 *   <ScrollReveal>
 *     <h2>This fades in when scrolled into view</h2>
 *   </ScrollReveal>
 *   <ScrollReveal direction="left" delay={0.2}>
 *     <p>Slides in from the left with a delay</p>
 *   </ScrollReveal>
 */
'use client';

import { motion, useReducedMotion, type Variants } from 'motion/react';
import { type ReactNode } from 'react';

type Direction = 'up' | 'down' | 'left' | 'right';

const offsets: Record<Direction, { x: number; y: number }> = {
  up:    { x: 0, y: 40 },
  down:  { x: 0, y: -40 },
  left:  { x: 40, y: 0 },
  right: { x: -40, y: 0 },
};

interface ScrollRevealProps {
  children: ReactNode;
  /** Slide direction. @default "up" */
  direction?: Direction;
  /** Additional delay in seconds. @default 0 */
  delay?: number;
  /** Duration in seconds. @default 0.6 */
  duration?: number;
  className?: string;
}

export function ScrollReveal({
  children,
  direction = 'up',
  delay = 0,
  duration = 0.6,
  className,
}: ScrollRevealProps) {
  const prefersReduced = useReducedMotion();
  const offset = offsets[direction];

  const variants: Variants = {
    hidden: prefersReduced
      ? { opacity: 0 }
      : { opacity: 0, x: offset.x, y: offset.y },
    visible: { opacity: 1, x: 0, y: 0 },
  };

  return (
    <motion.div
      variants={variants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration, delay, ease: [0.16, 1, 0.3, 1] as const }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
