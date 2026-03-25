/**
 * Rain Drops Preset
 *
 * PURPOSE: Digital rain / matrix-style falling characters for a cyberpunk aesthetic.
 * VISUAL: Columns of characters falling at staggered speeds with a fading trail.
 * POINTER: Characters near the cursor glow brighter and slow down briefly.
 */
import type { CanvasContext, DrawFunction } from '@forge/visualizations/canvas/types'

interface RainDropsOptions {
  /** Font size in pixels (default: 14) */
  fontSize?: number
  /** Primary color (default: 'rgba(74, 120, 255, 0.9)') */
  color?: string
  /** Character set to sample from (default: katakana + digits) */
  charset?: string
  /** Fall speed multiplier (default: 1) */
  speed?: number
  /** Trail opacity fade per frame (default: 0.05) */
  fadeFactor?: number
}

interface Column { y: number; speed: number; chars: string[]; nextSwap: number }

const KATAKANA = 'アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモ'
const DIGITS = '0123456789'

export function createRainDrops(options: RainDropsOptions = {}): DrawFunction {
  const {
    fontSize = 14, speed = 1, fadeFactor = 0.05,
    color = 'rgba(74, 120, 255, 0.9)',
    charset = KATAKANA + DIGITS,
  } = options

  let columns: Column[] = []
  let prevW = 0

  const randChar = () => charset[Math.floor(Math.random() * charset.length)]

  function seedColumns(w: number, h: number) {
    const colCount = Math.ceil(w / fontSize)
    const rows = Math.ceil(h / fontSize) + 2
    columns = Array.from({ length: colCount }, () => ({
      y: Math.random() * -rows, speed: 0.5 + Math.random() * 1.5,
      chars: Array.from({ length: rows }, randChar), nextSwap: 0,
    }))
  }

  return ({ ctx, width, height, time, pointer, signal }: CanvasContext) => {
    if (width !== prevW) { seedColumns(width, height); prevW = width }

    // Fade previous frame for trail effect (use with autoClear={false})
    ctx.fillStyle = `rgba(0, 0, 0, ${fadeFactor})`
    ctx.fillRect(0, 0, width, height)

    ctx.font = `${fontSize}px monospace`
    ctx.textAlign = 'center'
    const rows = Math.ceil(height / fontSize) + 2
    const t = time * 0.001

    for (let i = 0; i < columns.length; i++) {
      const col = columns[i]
      const x = i * fontSize + fontSize / 2

      // Advance — slow near cursor
      let spd = col.speed * speed * signal
      if (pointer.active) {
        const dx = (x / width) - pointer.x
        const dy = ((col.y * fontSize) / height) - pointer.y
        if (Math.sqrt(dx * dx + dy * dy) < 0.15) spd *= 0.3
      }
      col.y += spd * 0.12

      // Periodically swap a random character for flicker
      if (t > col.nextSwap) {
        col.chars[Math.floor(Math.random() * rows)] = randChar()
        col.nextSwap = t + 0.1 + Math.random() * 0.3
      }

      // Draw head character
      const headRow = Math.floor(col.y) % rows
      ctx.fillStyle = color
      ctx.fillText(col.chars[headRow % col.chars.length], x, headRow * fontSize)

      // Wrap when off screen
      if (col.y * fontSize > height + fontSize * 4) col.y = Math.random() * -8
    }
  }
}
