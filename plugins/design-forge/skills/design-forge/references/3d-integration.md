# 3D Integration Guide

Patterns for adding 3D elements to React/Next.js projects using Three.js, React Three Fiber, Spline, and Blender MCP.

**Related**: The `HeroScene` component in `${CLAUDE_PLUGIN_ROOT}/components/scenes/hero-scene.tsx` provides a full-screen container with telemetry HUD for R3F scenes.

---

## Three.js / React Three Fiber

### Installation

```bash
pnpm add three @react-three/fiber @react-three/drei
pnpm add -D @types/three
```

### Basic Scene

```tsx
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment } from '@react-three/drei';

export function Scene3D() {
  return (
    <Canvas camera={{ position: [0, 0, 5], fov: 75 }}>
      <ambientLight intensity={0.5} />
      <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} />
      <mesh>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="#4a78ff" />
      </mesh>
      <OrbitControls />
      <Environment preset="city" />
    </Canvas>
  );
}
```

### Loading GLTF Models

```tsx
import { useGLTF } from '@react-three/drei';

function Model({ url }: { url: string }) {
  const { scene } = useGLTF(url);
  return <primitive object={scene} />;
}

// Preload for instant display
useGLTF.preload('/models/product.glb');
```

### Lazy Loading (Critical for Performance)

3D scenes are heavy. Always lazy-load with a fallback:

```tsx
import { Suspense, lazy } from 'react';

const Scene3D = lazy(() => import('./Scene3D'));

<Suspense fallback={<div className="animate-pulse bg-muted h-[400px]" />}>
  <Scene3D />
</Suspense>
```

### LOD (Level of Detail)

For complex scenes, reduce geometry at distance:

```tsx
import { Detailed } from '@react-three/drei';

<Detailed distances={[0, 50, 100]}>
  <HighPolyModel />   {/* Close */}
  <MedPolyModel />    {/* Medium */}
  <LowPolyModel />    {/* Far */}
</Detailed>
```

### Reduced Motion Fallback

Replace animated 3D with a static image for users who prefer reduced motion:

```tsx
import { useReducedMotion } from '${CLAUDE_PLUGIN_ROOT}/components/visualizations/canvas';

function HeroVisual() {
  const reducedMotion = useReducedMotion();

  if (reducedMotion) {
    return <img src="/hero-static.webp" alt="Product showcase" />;
  }

  return (
    <Suspense fallback={<LoadingSkeleton />}>
      <Scene3D />
    </Suspense>
  );
}
```

---

## Spline

### Installation

```bash
pnpm add @splinetool/react-spline
```

### Basic Integration

```tsx
import Spline from '@splinetool/react-spline';

export function SplineScene() {
  return (
    <Spline
      scene="https://prod.spline.design/[scene-id]/scene.splinecode"
      className="w-full h-full"
      onLoad={(spline) => {
        // Access spline runtime for interactions
        const obj = spline.findObjectByName('Button');
        // obj.emitEvent('mouseDown');
      }}
    />
  );
}
```

### When to Use Spline vs Three.js

| Criterion | Spline | Three.js / R3F |
|-----------|--------|----------------|
| Speed to prototype | Fast (visual editor) | Slower (code-only) |
| Custom shaders | Limited | Full control |
| Bundle size | ~200KB runtime | ~150KB (tree-shakeable) |
| Interactions | Built-in events | Full programmatic |
| Best for | Quick prototypes, hero visuals | Complex scenes, product configs |

---

## Blender MCP Integration

When a Blender MCP server is available, use it for custom 3D model generation.

### Workflow

1. **Check availability**: "Is there a Blender MCP server available?"
2. **Generate model**: Request creation via MCP tools
3. **Export**: GLB/GLTF format for web
4. **Import**: Load into Three.js scene

```typescript
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';

const loader = new GLTFLoader();
loader.load('/models/custom-model.glb', (gltf) => {
  scene.add(gltf.scene);
});
```

### Fallback (No MCP)

If Blender MCP is unavailable:
- Use Three.js primitives (box, sphere, torus) for abstract shapes
- Use Spline for quick visual prototypes
- Use free GLB models from sources like Sketchfab

---

## Performance Budget

| Metric | Target | How |
|--------|--------|-----|
| Initial load | No 3D on first paint | Lazy-load with `Suspense` |
| Bundle size | < 200KB for 3D deps | Tree-shake Three.js imports |
| Frame rate | 60fps on mid-range devices | LOD, visibility gating |
| Memory | < 100MB GPU | Dispose textures/geometries on unmount |
| Accessibility | Static fallback | `prefers-reduced-motion` check |

### Dispose Pattern

```tsx
useEffect(() => {
  return () => {
    // Clean up GPU resources
    scene.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.geometry.dispose();
        if (Array.isArray(obj.material)) {
          obj.material.forEach((m) => m.dispose());
        } else {
          obj.material.dispose();
        }
      }
    });
  };
}, []);
```
