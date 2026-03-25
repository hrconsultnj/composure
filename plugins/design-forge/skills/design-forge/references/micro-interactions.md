# Micro-Interactions Guide

Small, delightful details that make interfaces feel alive. Each interaction should serve a purpose — feedback, guidance, or delight.

**Related components**: `CustomCursor` and `useSoundLayer` in `${CLAUDE_PLUGIN_ROOT}/components/ui/` provide production-ready implementations for cursor and sound interactions.

---

## Haptic Feedback (Touch Devices)

Subtle vibration on touch confirms actions physically.

```tsx
function haptic(duration = 10) {
  if ('vibrate' in navigator) {
    navigator.vibrate(duration);
  }
}

// Use on button press
<button onClick={() => { haptic(); doAction(); }}>
  Confirm
</button>
```

**Duration guide**: 10ms for taps, 20ms for toggles, `[10, 50, 10]` pattern for errors (buzz-pause-buzz).

---

## Sound Effects

### use-sound (Simple)

```bash
pnpm add use-sound
```

```tsx
import useSound from 'use-sound';

function ActionButton() {
  const [playClick] = useSound('/sounds/click.mp3', { volume: 0.5 });

  return (
    <button onClick={() => { playClick(); doAction(); }}>
      Click me
    </button>
  );
}
```

### Design Forge SoundLayer (Advanced)

The `useSoundLayer` hook provides lazy-loaded ambient audio + debounced hover tones with user-gesture activation:

```tsx
import { useSoundLayer } from '${CLAUDE_PLUGIN_ROOT}/components/ui';

function App() {
  const { enable, enabled, muted, toggleMute, playHoverTone } = useSoundLayer();

  return (
    <>
      {!enabled && <button onClick={enable}>Enable Sound</button>}
      <nav onMouseEnter={() => playHoverTone()}>
        {/* Navigation items */}
      </nav>
    </>
  );
}
```

**Key principle**: Sound is always opt-in. Never auto-play audio.

---

## Hover State Escalation

Layer interactions from simple to rich based on complexity needs:

| Level | Tool | Example |
|-------|------|---------|
| 1 — CSS | Tailwind `hover:` | Color shift, underline, scale |
| 2 — Framer Motion | `whileHover` | Spring scale, opacity, rotation |
| 3 — Canvas | `HoverCardCanvas` | Per-card generative background |
| 4 — Cursor | `CustomCursor` | Contextual label on hover target |

### Level 1: CSS (Default)

```tsx
<div className="transition-all duration-200 hover:scale-[1.02] hover:shadow-lg">
  {card}
</div>
```

### Level 2: Framer Motion

```tsx
<motion.div
  whileHover={{ scale: 1.04, boxShadow: '0 8px 30px rgba(0,0,0,0.2)' }}
  transition={{ type: 'spring', stiffness: 400, damping: 20 }}
>
  {card}
</motion.div>
```

### Level 3: Canvas Background

```tsx
import { HoverCardCanvas } from '${CLAUDE_PLUGIN_ROOT}/components/ui';

<HoverCardCanvas
  draw={createPointCloud({ count: 50, radius: 0.3 })}
  animateOnHover
  idleOpacity={0}
  hoverOpacity={0.6}
>
  {card content}
</HoverCardCanvas>
```

### Level 4: Cursor Context

```tsx
// Any element with data-cursor shows a label on the custom cursor
<div data-cursor="View Project">
  {card}
</div>
```

---

## Scroll-Triggered Reveals

### Counter Animation

Numbers that count up as they enter viewport:

```tsx
import { useInView, useMotionValue, useTransform, animate } from 'framer-motion';

function AnimatedCounter({ target }: { target: number }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });
  const count = useMotionValue(0);
  const rounded = useTransform(count, (v) => Math.round(v));

  useEffect(() => {
    if (isInView) animate(count, target, { duration: 2 });
  }, [isInView]);

  return <motion.span ref={ref}>{rounded}</motion.span>;
}
```

### Text Reveal (Word by Word)

```tsx
const words = text.split(' ');

<motion.p>
  {words.map((word, i) => (
    <motion.span
      key={i}
      initial={{ opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: i * 0.05 }}
      className="inline-block mr-1"
    >
      {word}
    </motion.span>
  ))}
</motion.p>
```

---

## Principles

1. **Purpose over decoration** — Every micro-interaction should provide feedback or guide attention
2. **Subtlety** — 10ms vibration, 0.5 volume, 200ms transitions. If you notice it, it's too much
3. **Opt-in audio** — Never auto-play sound. Always require explicit user gesture
4. **Respect preferences** — Check `prefers-reduced-motion` before any animation
5. **Progressive enhancement** — Start with CSS, escalate only when the interaction demands it
