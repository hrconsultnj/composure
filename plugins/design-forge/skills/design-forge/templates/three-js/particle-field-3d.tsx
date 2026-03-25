/**
 * 3D Particle Field — Points geometry with mouse-reactive drift
 *
 * Purpose: Ambient background effect. Renders N points in a volume,
 * gently drifting with time. Mouse position influences drift direction.
 * Dependencies: pnpm add three @react-three/fiber && pnpm add -D @types/three
 * Performance: DPR capped at 2, single draw call via Points. Keep count under 5000.
 * LOD: Reduce count on mobile — detect via navigator.hardwareConcurrency.
 */
'use client';

import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Suspense, lazy, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';

interface FieldProps { count?: number; size?: number; color?: string }

function Particles({ count = 2000, size = 0.015, color = '#ffffff' }: FieldProps) {
  const ref = useRef<THREE.Points>(null);
  const { pointer } = useThree();
  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count * 3; i++) arr[i] = (Math.random() - 0.5) * 10;
    return arr;
  }, [count]);
  useFrame((_, delta) => {
    if (!ref.current) return;
    ref.current.rotation.y += delta * 0.02;
    ref.current.rotation.x += pointer.y * delta * 0.05;
    ref.current.rotation.z += pointer.x * delta * 0.05;
  });
  useEffect(() => () => { ref.current?.geometry.dispose(); }, []);
  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial size={size} color={color} sizeAttenuation transparent opacity={0.7} />
    </points>
  );
}

function SceneContent(props: FieldProps) {
  return (
    <Canvas dpr={[1, 2]} camera={{ position: [0, 0, 5], fov: 60 }}>
      <Particles {...props} />
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

export function ParticleField3D({ height = '400px', ...rest }: FieldProps & { height?: string }) {
  const reduced = useReducedMotion();
  const fb = <div className="bg-neutral-950 rounded-lg" style={{ height }} role="img" aria-label="Particle field" />;
  if (reduced) return fb;
  return (
    <div style={{ height }}>
      <Suspense fallback={fb}><LazyScene {...rest} /></Suspense>
    </div>
  );
}
