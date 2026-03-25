/** Pointer position relative to the canvas, normalized 0-1 */
export interface PointerState {
  /** Normalized X (0 = left edge, 1 = right edge) */
  x: number
  /** Normalized Y (0 = top edge, 1 = bottom edge) */
  y: number
  /** Whether the pointer is currently over the canvas */
  active: boolean
}

/** Context passed to every draw function on each animation frame */
export interface CanvasContext {
  /** The 2D rendering context */
  ctx: CanvasRenderingContext2D
  /** Canvas logical width in CSS pixels */
  width: number
  /** Canvas logical height in CSS pixels */
  height: number
  /** Device pixel ratio used for rendering (capped at 2) */
  dpr: number
  /** Elapsed time in milliseconds since animation start */
  time: number
  /** Delta time since last frame in milliseconds */
  delta: number
  /** Current pointer state (normalized coordinates) */
  pointer: PointerState
  /** Shared signal noise value — compound sine wave for organic motion */
  signal: number
}

/** A draw function renders one frame given the canvas context */
export type DrawFunction = (context: CanvasContext) => void

/** Factory that creates a draw function with internal state via closure */
export type DrawFunctionFactory<T = Record<string, unknown>> = (
  options?: T
) => DrawFunction

/** Configuration for the useCanvas hook */
export interface UseCanvasOptions {
  /** The draw function to call each frame */
  draw: DrawFunction
  /** Whether to animate (default: true) */
  animate?: boolean
  /** FPS cap — leave undefined for uncapped (default: undefined) */
  fps?: number
  /** Background color to fill each frame (default: transparent/clear) */
  clearColor?: string
  /** Whether to auto-clear the canvas each frame (default: true) */
  autoClear?: boolean
}
