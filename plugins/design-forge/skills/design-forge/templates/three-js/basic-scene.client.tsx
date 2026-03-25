'use client';

/**
 * BasicScene client component — lazy-loaded by basic-scene.tsx
 * This file exists so the lazy import resolves at typecheck time.
 * In your project, this contains the actual R3F Canvas with OrbitControls.
 *
 * Dependencies: @react-three/fiber, @react-three/drei
 */

import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { type ReactNode } from 'react';

interface SceneCanvasProps {
  children?: ReactNode;
  className?: string;
}

export default function SceneCanvas({ children, className }: SceneCanvasProps) {
  return (
    <Canvas
      dpr={[1, 2]}
      camera={{ position: [0, 1, 5], fov: 50 }}
      className={className}
    >
      <ambientLight intensity={0.4} />
      <directionalLight position={[5, 5, 5]} intensity={0.8} />
      {children}
      <OrbitControls enableZoom={false} enablePan={false} />
    </Canvas>
  );
}
