# Technology Matrix

Reference for evaluating animation libraries, 3D integration technologies, and making technology decisions.

## Animation Libraries

### Framer Motion
**Best For**: React page transitions, component animations, gesture interactions
**Complexity**: Medium | **Performance**: Good (GPU-accelerated) | **Bundle**: ~40KB
**When to Choose**: React-based projects, declarative animations preferred

### GSAP (GreenSock)
**Best For**: Complex scroll animations, timelines, morphing
**Complexity**: Medium-High | **Performance**: Excellent | **Bundle**: ~50KB
**When to Choose**: Need precise control, complex timelines, framework-agnostic

### CSS Animations + Tailwind
**Best For**: Simple transitions, hover effects, basic interactions
**Complexity**: Low | **Performance**: Excellent (native) | **Bundle**: 0KB
**When to Choose**: Simple needs, bundle size matters

### Motion One
**Best For**: Lightweight animations with modern API
**Complexity**: Low-Medium | **Performance**: Excellent | **Bundle**: ~5KB
**When to Choose**: Bundle size critical, modern API wanted

## 3D Integration Technologies

### Three.js + React Three Fiber
**Best For**: Custom 3D scenes, WebGL effects, interactive 3D
**Complexity**: High | **Performance**: Heavy (but controllable with LOD) | **Bundle**: ~150KB+
**When to Choose**: Custom 3D needed, full control required

### Spline
**Best For**: Quick 3D prototypes, no-code 3D design
**Complexity**: Low | **Performance**: Medium | **Bundle**: ~100KB
**When to Choose**: Designers creating 3D without code

### Blender (via MCP)
**Best For**: Custom 3D model creation, production assets
**Complexity**: High | **Performance**: Excellent (static exports) | **Bundle**: Model size only
**When to Choose**: Need custom 3D assets, not real-time rendering

### CSS 3D Transforms
**Best For**: Card flips, simple 3D effects
**Complexity**: Low | **Performance**: Excellent (GPU-accelerated) | **Bundle**: 0KB
**When to Choose**: Simple 3D effects, no library needed

## Technology Decision Matrix

| Need | Technology | Complexity | Performance | When to Use |
|------|-----------|------------|-------------|-------------|
| Simple animations | CSS + Tailwind | Low | Excellent | Hover effects, fades |
| Page transitions | Framer Motion | Medium | Good | React apps, declarative |
| Scroll animations | GSAP | High | Excellent | Complex narratives |
| Quick 3D | Spline | Low | Medium | Marketing, prototypes |
| Custom 3D | Three.js | High | Heavy | Product viewers, games |
| Production 3D | Blender MCP | High | Excellent | Custom models export |
| UI Components | shadcn/ui | Low | Good | Most web apps |
| Animations + UI | Framer | Medium | Good | Motion-first sites |
