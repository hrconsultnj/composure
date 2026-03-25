/**
 * Framer Motion Shared Layout Animation — layoutId for element transitions
 *
 * Purpose: Animate a shared element (active indicator, card expansion) between states.
 * Dependencies: pnpm add motion
 * Usage:
 *   <TabBar tabs={['Overview', 'Features', 'Pricing']} />
 *   <ExpandableCard id="1" title="Feature" preview={<p>...</p>} expanded={<div>...</div>} />
 */
'use client';

import { useState, type ReactNode } from 'react';
import { motion, AnimatePresence, LayoutGroup } from 'motion/react';

const SPRING = { type: 'spring' as const, stiffness: 400, damping: 30 };

interface TabBarProps {
  tabs: string[];
  activeIndex?: number;
  onTabChange?: (index: number) => void;
}

/** Tab bar with a sliding active indicator that morphs between tabs. */
export function TabBar({ tabs, activeIndex: controlled, onTabChange }: TabBarProps) {
  const [internal, setInternal] = useState(0);
  const active = controlled ?? internal;
  const select = (i: number) => { setInternal(i); onTabChange?.(i); };

  return (
    <div className="flex gap-1 rounded-lg bg-neutral-900 p-1" role="tablist">
      {tabs.map((tab, i) => (
        <button key={tab} role="tab" aria-selected={active === i} onClick={() => select(i)}
          className="relative px-4 py-2 text-sm font-medium text-neutral-400
            transition-colors hover:text-white motion-reduce:transition-none">
          {active === i && (
            <motion.span layoutId="tab-indicator" transition={SPRING}
              className="absolute inset-0 rounded-md bg-neutral-800" />
          )}
          <span className="relative z-10">{tab}</span>
        </button>
      ))}
    </div>
  );
}

interface ExpandableCardProps {
  id: string;
  title: string;
  preview: ReactNode;
  expanded: ReactNode;
}

/** Card that expands/collapses with smooth layout animation. */
export function ExpandableCard({ id, title, preview, expanded }: ExpandableCardProps) {
  const [isOpen, setIsOpen] = useState(false);
  const fade = { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } };

  return (
    <LayoutGroup>
      <motion.div layoutId={`card-${id}`} onClick={() => setIsOpen(!isOpen)} transition={SPRING}
        className="cursor-pointer rounded-xl border border-white/10 bg-neutral-900 p-4
          motion-reduce:!transform-none">
        <motion.h3 layoutId={`title-${id}`} className="text-lg font-semibold">{title}</motion.h3>
        <AnimatePresence mode="wait">
          {isOpen
            ? <motion.div key="expanded" {...fade}>{expanded}</motion.div>
            : <motion.div key="preview" {...fade}>{preview}</motion.div>}
        </AnimatePresence>
      </motion.div>
    </LayoutGroup>
  );
}
