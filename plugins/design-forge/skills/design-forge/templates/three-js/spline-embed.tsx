/**
 * Spline Scene Embed — Wrapper for Spline scenes with loading + error handling
 *
 * Purpose: Quick integration of Spline-designed 3D scenes. Includes error
 * boundary, loading skeleton, and reduced-motion fallback.
 * Dependencies: pnpm add @splinetool/react-spline
 * Performance: Spline runtime is ~200KB. Always lazy-load.
 * LOD: Managed within Spline editor. Export lower-poly versions for mobile.
 */
'use client';

import { Component, Suspense, lazy, useEffect, useState, type ReactNode } from 'react';

const Spline = lazy(() => import('@splinetool/react-spline'));

interface SplineEmbedProps {
  sceneUrl: string;
  height?: string;
  onLoad?: (spline: unknown) => void;
  fallback?: ReactNode;
}

class SplineErrorBoundary extends Component<
  { children: ReactNode; fallback: ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };
  static getDerivedStateFromError() { return { hasError: true }; }
  render() { return this.state.hasError ? this.props.fallback : this.props.children; }
}

function useReducedMotion() {
  const [r, setR] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setR(mq.matches);
    const h = (e: MediaQueryListEvent) => setR(e.matches);
    mq.addEventListener('change', h);
    return () => mq.removeEventListener('change', h);
  }, []);
  return r;
}

const Skeleton = ({ h }: { h: string }) => (
  <div className="flex items-center justify-center bg-neutral-900 rounded-lg animate-pulse" style={{ height: h }}>
    <span className="text-sm text-neutral-500 font-mono">Loading scene...</span>
  </div>
);

const Static = ({ h }: { h: string }) => (
  <div className="flex items-center justify-center bg-neutral-900 rounded-lg"
    style={{ height: h }} role="img" aria-label="3D scene">
    <span className="text-sm text-neutral-400 font-mono">3D Scene</span>
  </div>
);

export function SplineEmbed({ sceneUrl, height = '500px', onLoad, fallback }: SplineEmbedProps) {
  const reduced = useReducedMotion();
  const staticEl = fallback ?? <Static h={height} />;
  if (reduced) return staticEl;
  return (
    <div style={{ height, position: 'relative' }}>
      <SplineErrorBoundary fallback={staticEl}>
        <Suspense fallback={<Skeleton h={height} />}>
          <Spline scene={sceneUrl} onLoad={onLoad} style={{ width: '100%', height: '100%' }} />
        </Suspense>
      </SplineErrorBoundary>
    </div>
  );
}
