/**
 * Compound sine wave creating unified "breathing" motion.
 *
 * Apply this across ALL visualizations to create a cohesive organic feel.
 * Returns a multiplier centered around 1.0, oscillating ±0.09.
 *
 * Three layered sine waves at incommensurate frequencies produce a
 * non-repeating organic rhythm that avoids mechanical patterns.
 *
 * Source: wyehuongyan.com — all 13+ canvas visualizations share this function.
 */
export function getSignalNoise(time: number): number {
  return (
    1 +
    Math.sin(time * 0.00021) * 0.045 +
    Math.sin(time * 0.00057 + 1.6) * 0.028 +
    Math.cos(time * 0.00011 + 0.8) * 0.018
  )
}

/**
 * Extended signal noise with configurable amplitude, frequency, and phase.
 * Use for per-visualization variation while maintaining the shared rhythm.
 */
export function getSignalNoiseCustom(
  time: number,
  amplitude = 1,
  frequencyScale = 1,
  phaseOffset = 0
): number {
  return (
    1 +
    Math.sin(time * 0.00021 * frequencyScale + phaseOffset) *
      0.045 *
      amplitude +
    Math.sin(time * 0.00057 * frequencyScale + 1.6 + phaseOffset) *
      0.028 *
      amplitude +
    Math.cos(time * 0.00011 * frequencyScale + 0.8 + phaseOffset) *
      0.018 *
      amplitude
  )
}

/** Linear interpolation between two values */
export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

/** Map a value from one range to another */
export function mapRange(
  value: number,
  inMin: number,
  inMax: number,
  outMin: number,
  outMax: number
): number {
  return outMin + ((value - inMin) / (inMax - inMin)) * (outMax - outMin)
}

/** Clamp a value between min and max */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

/** Euclidean distance between two points */
export function dist(x1: number, y1: number, x2: number, y2: number): number {
  const dx = x2 - x1
  const dy = y2 - y1
  return Math.sqrt(dx * dx + dy * dy)
}
