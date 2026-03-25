# Three.js / React Three Fiber Templates

Drop-in templates for adding 3D to Next.js projects. Every template includes lazy loading, reduced-motion fallback, and GPU cleanup.

---

## Decision Tree: Which Template?

```
Need 3D? ──> Is it interactive / custom?
              ├── Yes ──> Do you need custom shaders?
              │           ├── Yes ──> gradient-background.tsx (shader reference)
              │           │           or write custom ShaderMaterial
              │           └── No  ──> What are you rendering?
              │                       ├── Geometric shapes ──> floating-geometry.tsx
              │                       ├── Loaded model ──> gltf-model-viewer.tsx
              │                       ├── Particle system ──> particle-field-3d.tsx
              │                       ├── 3D text ──> text-3d.tsx
              │                       └── General scene ──> basic-scene.tsx
              └── No (designer-built) ──> spline-embed.tsx
```

## Template Index

| Template | Purpose | Bundle Impact | Interaction |
|---|---|---|---|
| `basic-scene.tsx` | Starter canvas with lights + controls | ~150KB | Orbit controls |
| `floating-geometry.tsx` | Animated hero shape | ~160KB | Passive animation |
| `gltf-model-viewer.tsx` | Model showcase | ~170KB + model | Orbit controls |
| `particle-field-3d.tsx` | Ambient background particles | ~140KB | Mouse-reactive |
| `text-3d.tsx` | Extruded 3D headlines | ~170KB + font | Orbit controls |
| `gradient-background.tsx` | Shader gradient backdrop | ~130KB | Passive animation |
| `spline-embed.tsx` | Spline scene wrapper | ~200KB (runtime) | Scene-defined |

## Performance Rules

1. **Always lazy-load** -- Every template uses `React.lazy` + `Suspense`. Never import R3F at the top level of a page.

2. **Cap DPR at 2** -- `dpr={[1, 2]}` prevents 3x renders on high-DPI mobile screens. Gradient backgrounds can go lower: `dpr={[1, 1.5]}`.

3. **Use `frameloop="demand"`** -- For static scenes (model viewer, 3D text), set `frameloop="demand"` so the canvas only re-renders on interaction, not 60fps.

4. **Dispose GPU resources** -- Every component with geometries or materials must clean up in `useEffect` return. R3F auto-disposes on unmount for declarative meshes, but manual `primitive` objects need explicit cleanup.

5. **Visibility-gate heavy scenes** -- Use `IntersectionObserver` to mount/unmount the Canvas when off-screen. The `HeroScene` container component handles this pattern.

6. **Respect reduced motion** -- Every template checks `prefers-reduced-motion` and renders a static fallback. This is non-negotiable.

## Dependencies

**React Three Fiber stack** (most templates):
```bash
pnpm add three @react-three/fiber @react-three/drei
pnpm add -D @types/three
```

**Spline** (spline-embed only):
```bash
pnpm add @splinetool/react-spline
```

**3D Text fonts** (text-3d only):
Convert TTF/OTF to JSON at [gero3.github.io/facetype.js](https://gero3.github.io/facetype.js/), place in `/public/fonts/`.

## Integration with HeroScene

Wrap any template in the `HeroScene` container for full-bleed hero sections with telemetry overlay:

```tsx
import { HeroScene } from '@design-forge/components/scenes/hero-scene';
import { FloatingGeometry } from './floating-geometry';

export function Hero() {
  return (
    <HeroScene height="100svh" telemetry={['R3F', '60fps', 'WebGL2']}>
      <FloatingGeometry height="100%" />
    </HeroScene>
  );
}
```

## LOD Strategy

| Geometry Count | Strategy |
|---|---|
| < 10K triangles | No LOD needed |
| 10K-100K | Use `<Detailed>` from drei with 2-3 levels |
| 100K+ | Mandatory LOD + consider instancing with `<Instances>` |
| Particles > 5000 | Use `<Points>` (single draw call) not individual meshes |

## Mobile Considerations

- Detect `navigator.hardwareConcurrency` to reduce particle counts on low-end devices
- Use `pointer: coarse` media query to enlarge touch targets on orbit controls
- Test on real devices -- Chrome DevTools throttling underestimates GPU impact
