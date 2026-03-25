/**
 * Floating Geometry — Animated icosahedron with subtle rotation and float
 *
 * Purpose: Eye-catching hero element. Icosahedron with distort material,
 * gentle Y-axis rotation + sine-wave float via useFrame.
 * Dependencies: pnpm add three @react-three/fiber @react-three/drei && pnpm add -D @types/three
 * Performance: DPR capped at 2, single draw call. Visibility-gate with IntersectionObserver.
 * LOD: Single geometry — use <Detailed> if swapping high/low-poly variants.
 */
'use client';

import { Canvas, useFrame } from '@react-three/fiber';
import { Float, MeshDistortMaterial } from '@react-three/drei';
import { Suspense, lazy, useEffect, useRef, useState } from 'react';
import type { Mesh } from 'three';

function Icosahedron() {
  const ref = useRef<Mesh>(null);
  useFrame((_, delta) => {
    if (!ref.current) return;
    ref.current.rotation.y += delta * 0.3;
    ref.current.rotation.x += delta * 0.1;
  });
  return (
    <Float speed={1.5} rotationIntensity={0.2} floatIntensity={0.8}>
      <mesh ref={ref}>
        <icosahedronGeometry args={[1.4, 1]} />
        <MeshDistortMaterial color="#6c5ce7" roughness={0.2} metalness={0.8} distort={0.15} speed={2} />
      </mesh>
    </Float>
  );
}

function SceneContent() {
  return (
    <Canvas dpr={[1, 2]} camera={{ position: [0, 0, 4], fov: 50 }}>
      <ambientLight intensity={0.3} />
      <directionalLight position={[3, 5, 4]} intensity={1} />
      <Icosahedron />
    </Canvas>
  );
}

const LazyScene = lazy(() => Promise.resolve({ default: SceneContent }));

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

export function FloatingGeometry({ height = '400px' }: { height?: string }) {
  const reduced = useReducedMotion();
  const fallback = (
    <div className="flex items-center justify-center bg-neutral-900 rounded-lg" style={{ height }}>
      <div className="w-20 h-20 rounded-full bg-purple-600/30" />
    </div>
  );
  if (reduced) return fallback;
  return (
    <div style={{ height }}>
      <Suspense fallback={fallback}><LazyScene /></Suspense>
    </div>
  );
}
