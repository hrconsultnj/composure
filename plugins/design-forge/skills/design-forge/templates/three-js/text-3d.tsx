/**
 * 3D Extruded Text — Bold 3D text using drei's Text3D + Center
 *
 * Purpose: Hero headlines, section titles with depth. Uses JSON font files
 * (convert via facetype.js or use drei built-in Inter).
 * Dependencies: pnpm add three @react-three/fiber @react-three/drei && pnpm add -D @types/three
 * Performance: DPR capped at 2, frameloop="demand" (static text). Keep bevel
 *   segments low (3) and depth under 1.0 to limit geometry size.
 * LOD: For long text, consider flat <Text> from drei instead of extruded <Text3D>.
 */
'use client';

import { Canvas } from '@react-three/fiber';
import { Center, Text3D, OrbitControls } from '@react-three/drei';
import { Suspense, lazy, useEffect, useState } from 'react';

interface TextProps { text: string; fontUrl: string; color?: string; depth?: number }

function TextContent({ text, fontUrl, color = '#4a78ff', depth = 0.5 }: TextProps) {
  return (
    <Canvas dpr={[1, 2]} frameloop="demand" camera={{ position: [0, 0, 8], fov: 40 }}>
      <ambientLight intensity={0.5} />
      <directionalLight position={[5, 5, 5]} intensity={0.8} />
      <Center>
        <Text3D font={fontUrl} size={1} height={depth}
          bevelEnabled bevelSize={0.02} bevelThickness={0.01} bevelSegments={3}>
          {text}
          <meshStandardMaterial color={color} roughness={0.3} metalness={0.6} />
        </Text3D>
      </Center>
      <OrbitControls enableZoom={false} enablePan={false} />
    </Canvas>
  );
}

const LazyText = lazy(() => Promise.resolve({ default: TextContent }));

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

export function Text3DScene({ text, fontUrl, color, depth, height = '300px' }: TextProps & { height?: string }) {
  const reduced = useReducedMotion();
  const fallback = (
    <div className="flex items-center justify-center bg-neutral-900 rounded-lg" style={{ height }}>
      <span className="text-3xl font-bold text-neutral-300">{text}</span>
    </div>
  );
  if (reduced) return fallback;
  return (
    <div style={{ height }}>
      <Suspense fallback={fallback}>
        <LazyText text={text} fontUrl={fontUrl} color={color} depth={depth} />
      </Suspense>
    </div>
  );
}
