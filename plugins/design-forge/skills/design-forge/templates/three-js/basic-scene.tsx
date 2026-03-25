/**
 * Basic R3F Scene — Minimal React Three Fiber canvas with orbit controls
 *
 * Purpose: Starting point for any 3D scene. Responsive canvas, basic lighting,
 * orbit controls, and reduced-motion fallback baked in.
 * Dependencies: pnpm add three @react-three/fiber @react-three/drei && pnpm add -D @types/three
 * Performance: DPR capped at 2, frameloop="demand" for static scenes.
 * LOD: Not needed — single low-poly primitive. Add <Detailed> for complex meshes.
 */
'use client';

import { Suspense, lazy, useEffect, useState, type ReactNode } from 'react';

const SceneCanvas = lazy(() => import('./basic-scene.client'));

interface BasicSceneProps {
  /** Fallback shown during load and for reduced motion */
  fallback?: ReactNode;
  /** Container height. @default '400px' */
  height?: string;
  /** Container CSS class */
  className?: string;
}

function useReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduced(mq.matches);
    const h = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener('change', h);
    return () => mq.removeEventListener('change', h);
  }, []);
  return reduced;
}

const StaticFallback = ({ height }: { height: string }) => (
  <div
    className="flex items-center justify-center bg-neutral-900 text-neutral-500 rounded-lg"
    style={{ height }}
    role="img"
    aria-label="3D scene placeholder"
  >
    <span className="text-sm font-mono">3D Scene</span>
  </div>
);

export function BasicScene({ fallback, height = '400px', className }: BasicSceneProps) {
  const reducedMotion = useReducedMotion();

  if (reducedMotion) {
    return fallback ?? <StaticFallback height={height} />;
  }

  return (
    <div className={className} style={{ height, position: 'relative' }}>
      <Suspense fallback={fallback ?? <StaticFallback height={height} />}>
        <SceneCanvas />
      </Suspense>
    </div>
  );
}

// --- basic-scene.client.tsx (co-located or split into separate file) ---
// import { Canvas } from '@react-three/fiber';
// import { OrbitControls } from '@react-three/drei';
//
// export default function SceneCanvas() {
//   return (
//     <Canvas dpr={[1, 2]} camera={{ position: [0, 0, 5], fov: 50 }}>
//       <ambientLight intensity={0.4} />
//       <directionalLight position={[5, 5, 5]} intensity={0.8} />
//       <mesh>
//         <boxGeometry args={[1.5, 1.5, 1.5]} />
//         <meshStandardMaterial color="#4a78ff" />
//       </mesh>
//       <OrbitControls enableZoom={false} />
//     </Canvas>
//   );
// }
