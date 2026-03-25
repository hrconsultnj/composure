/**
 * Animated Gradient Background — Shader-based gradient plane filling the canvas
 *
 * Purpose: Ambient animated background for hero sections. Full-screen quad with
 * a custom shader that blends two colors over time using sine waves.
 * Dependencies: pnpm add three @react-three/fiber && pnpm add -D @types/three
 * Performance: DPR capped at 1.5 (gradient needs no pixel precision). Single quad.
 * LOD: N/A — single plane. Falls back to CSS gradient for reduced motion.
 */
'use client';

import { Canvas, useFrame } from '@react-three/fiber';
import { Suspense, lazy, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';

interface GradientProps { colorA?: string; colorB?: string; speed?: number }

const VERT = `varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position, 1.0); }`;
const FRAG = `
  uniform float uTime; uniform vec3 uColorA; uniform vec3 uColorB; varying vec2 vUv;
  void main() {
    float t = sin(uTime + vUv.y * 3.14159) * 0.5 + 0.5;
    gl_FragColor = vec4(mix(uColorA, uColorB, t + vUv.x * 0.3), 1.0);
  }`;

function GradientPlane({ colorA = '#0a0a2e', colorB = '#1a0533', speed = 0.3 }: GradientProps) {
  const ref = useRef<THREE.ShaderMaterial>(null);
  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    uColorA: { value: new THREE.Color(colorA) },
    uColorB: { value: new THREE.Color(colorB) },
  }), [colorA, colorB]);
  useFrame((_, delta) => { if (ref.current) ref.current.uniforms.uTime.value += delta * speed; });
  return (
    <mesh>
      <planeGeometry args={[2, 2]} />
      <shaderMaterial ref={ref} uniforms={uniforms} vertexShader={VERT} fragmentShader={FRAG} depthWrite={false} />
    </mesh>
  );
}

function SceneContent(props: GradientProps) {
  return (
    <Canvas dpr={[1, 1.5]} style={{ position: 'absolute', inset: 0 }}>
      <GradientPlane {...props} />
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

export function GradientBackground({ height = '100%', ...rest }: GradientProps & { height?: string }) {
  const reduced = useReducedMotion();
  const a = rest.colorA ?? '#0a0a2e', b = rest.colorB ?? '#1a0533';
  if (reduced) return <div style={{ height, background: `linear-gradient(135deg, ${a}, ${b})` }} />;
  return (
    <div style={{ height, position: 'relative' }}>
      <Suspense fallback={<div style={{ height, background: a }} />}>
        <LazyScene {...rest} />
      </Suspense>
    </div>
  );
}
