/**
 * CSS/Tailwind Hover Effects — Zero-dependency transitions
 *
 * Purpose: Copy-paste hover effects using only Tailwind. No JS animation library needed.
 * Dependencies: None (Tailwind CSS only)
 * Usage: Import components or copy the className patterns directly.
 * All effects use motion-safe:/motion-reduce: and only animate transform, opacity, box-shadow.
 */
import { type ReactNode } from 'react';

type Props = { children: ReactNode; className?: string };

/** Subtle lift with shadow on hover. */
export function LiftCard({ children, className }: Props) {
  return (
    <div className={`motion-safe:transition-[transform,box-shadow] motion-safe:duration-300
      motion-safe:ease-[cubic-bezier(0.03,0.98,0.53,0.99)]
      hover:-translate-y-1 hover:shadow-lg motion-reduce:transition-none ${className ?? ''}`}>
      {children}
    </div>
  );
}

/** Scale up on hover — good for cards and images. */
export function ScaleCard({ children, className }: Props) {
  return (
    <div className={`motion-safe:transition-transform motion-safe:duration-200
      hover:scale-[1.02] active:scale-[0.98] motion-reduce:transition-none ${className ?? ''}`}>
      {children}
    </div>
  );
}

/** Border glow on hover using box-shadow. */
export function GlowCard({ children, className }: Props) {
  return (
    <div className={`border border-white/10 rounded-lg
      motion-safe:transition-[box-shadow,border-color] motion-safe:duration-300
      hover:border-white/25 hover:shadow-[0_0_20px_rgba(255,255,255,0.08)]
      motion-reduce:transition-none ${className ?? ''}`}>
      {children}
    </div>
  );
}

/** Underline slides in from left on hover — good for nav links. */
export function SlideUnderline({ children, className }: Props) {
  return (
    <span className={`relative inline-block group ${className ?? ''}`}>
      {children}
      <span className="absolute bottom-0 left-0 h-px w-full origin-left scale-x-0 bg-current
        motion-safe:transition-transform motion-safe:duration-300 group-hover:scale-x-100
        motion-reduce:transition-none" />
    </span>
  );
}

/** Background fill slides in on hover — good for buttons. */
export function FillButton({ children, className }: Props) {
  return (
    <button className={`relative overflow-hidden px-6 py-2.5 border border-white/20 rounded
      motion-safe:transition-colors motion-safe:duration-300 hover:text-black group
      motion-reduce:transition-none ${className ?? ''}`}>
      <span className="absolute inset-0 origin-left scale-x-0 bg-white
        motion-safe:transition-transform motion-safe:duration-300 group-hover:scale-x-100
        motion-reduce:transition-none" />
      <span className="relative z-10">{children}</span>
    </button>
  );
}
