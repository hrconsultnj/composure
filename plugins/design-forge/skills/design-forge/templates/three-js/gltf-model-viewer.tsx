/**
 * GLTF Model Viewer — Load and display GLB/GLTF models with orbit controls
 *
 * Purpose: Product showcases, 3D model previews with orbit controls and
 * environment lighting. Includes GPU resource disposal on unmount.
 * Dependencies: pnpm add three @react-three/fiber @react-three/drei && pnpm add -D @types/three
 * Performance: DPR capped at 2, frameloop="demand" (re-renders only on interaction).
 * LOD: Use <Detailed> wrapper if you have multiple mesh resolutions.
 */
'use client';

import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment, useGLTF, Center } from '@react-three/drei';
import { Suspense, lazy, useEffect, useState } from 'react';
import type { Mesh, Material } from 'three';

function isMesh(obj: object): obj is Mesh { return 'geometry' in obj; }
function hasMaterial(obj: object): obj is { material: Material | Material[] } { return 'material' in obj; }

interface ModelProps { url: string; scale?: number }

function Model({ url, scale = 1 }: ModelProps) {
  const { scene } = useGLTF(url);
  useEffect(() => {
    return () => {
      scene.traverse((obj) => {
        if (isMesh(obj)) obj.geometry?.dispose();
        if (hasMaterial(obj)) {
          const mat = obj.material;
          if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
          else mat?.dispose();
        }
      });
    };
  }, [scene]);
  return <Center><primitive object={scene} scale={scale} /></Center>;
}

function ViewerContent({ url, scale }: ModelProps) {
  return (
    <Canvas dpr={[1, 2]} frameloop="demand" camera={{ position: [0, 1, 4], fov: 45 }}>
      <ambientLight intensity={0.4} />
      <directionalLight position={[5, 5, 5]} intensity={0.6} />
      <Suspense fallback={null}>
        <Model url={url} scale={scale} />
        <Environment preset="studio" />
      </Suspense>
      <OrbitControls enablePan={false} minDistance={2} maxDistance={8} />
    </Canvas>
  );
}

const LazyViewer = lazy(() => Promise.resolve({ default: ViewerContent }));

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

export function GltfModelViewer({ url, scale, height = '500px' }: ModelProps & { height?: string }) {
  const reduced = useReducedMotion();
  const skeleton = (
    <div className="flex items-center justify-center bg-neutral-900 rounded-lg animate-pulse" style={{ height }}>
      <span className="text-sm text-neutral-500 font-mono">Loading model...</span>
    </div>
  );
  if (reduced) return (
    <div className="flex items-center justify-center bg-neutral-900 rounded-lg" style={{ height }}>
      <span className="text-sm text-neutral-400 font-mono">3D Model Preview</span>
    </div>
  );
  return (
    <div style={{ height }}>
      <Suspense fallback={skeleton}><LazyViewer url={url} scale={scale} /></Suspense>
    </div>
  );
}
