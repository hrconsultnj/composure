/**
 * Framer Motion Stagger List — Cascading reveal for lists and grids
 *
 * Purpose: Animate children into view one by one with configurable stagger delay.
 * Dependencies: pnpm add framer-motion
 * Usage:
 *   <StaggerList>
 *     {items.map(item => <StaggerItem key={item.id}>{item.name}</StaggerItem>)}
 *   </StaggerList>
 */
'use client';

import { motion, type Variants } from 'motion/react';
import { type ReactNode } from 'react';

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] as const },
  },
};

interface StaggerListProps {
  children: ReactNode;
  /** Delay between each child in seconds. @default 0.08 */
  stagger?: number;
  className?: string;
}

export function StaggerList({ children, stagger = 0.08, className }: StaggerListProps) {
  const variants: Variants = stagger !== 0.08
    ? { ...containerVariants, visible: { opacity: 1, transition: { staggerChildren: stagger } } }
    : containerVariants;

  return (
    <motion.div
      variants={variants}
      initial="hidden"
      animate="visible"
      className={`motion-reduce:!transform-none ${className ?? ''}`}
    >
      {children}
    </motion.div>
  );
}

interface StaggerItemProps {
  children: ReactNode;
  className?: string;
}

export function StaggerItem({ children, className }: StaggerItemProps) {
  return (
    <motion.div
      variants={itemVariants}
      className={`motion-reduce:!transform-none motion-reduce:!opacity-100 ${className ?? ''}`}
    >
      {children}
    </motion.div>
  );
}
