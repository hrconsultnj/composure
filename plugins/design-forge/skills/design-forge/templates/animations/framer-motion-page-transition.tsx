/**
 * Framer Motion Page Transition — AnimatePresence wrapper for Next.js App Router
 *
 * Purpose: Smooth fade+slide transitions between route changes.
 * Dependencies: pnpm add framer-motion
 * Usage:
 *   // app/template.tsx (NOT layout.tsx — template remounts on navigation)
 *   import { PageTransition } from '@/components/page-transition';
 *   export default function Template({ children }: { children: React.ReactNode }) {
 *     return <PageTransition>{children}</PageTransition>;
 *   }
 */
'use client';

import { motion, AnimatePresence, type Variants } from 'motion/react';
import { usePathname } from 'next/navigation';
import { type ReactNode } from 'react';

/** Fast-in, slow-out — snappy and premium-feeling. */
const EASE_OUT_EXPO = [0.16, 1, 0.3, 1] as const;

const variants: Variants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 },
};

interface PageTransitionProps {
  children: ReactNode;
  /** Transition duration in seconds. @default 0.3 */
  duration?: number;
}

export function PageTransition({ children, duration = 0.3 }: PageTransitionProps) {
  const pathname = usePathname();

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={pathname}
        variants={variants}
        initial="initial"
        animate="animate"
        exit="exit"
        transition={{ duration, ease: EASE_OUT_EXPO }}
        className="motion-reduce:!transform-none motion-reduce:!transition-none"
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
