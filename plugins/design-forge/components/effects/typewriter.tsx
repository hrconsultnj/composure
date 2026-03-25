'use client'

import { useEffect, useRef, useState } from 'react'

export interface TypewriterProps {
  /** Array of status messages to cycle through */
  messages: string[]
  /** Typing speed in ms per character (default: 28) */
  typeSpeed?: number
  /** Deleting speed in ms per character (default: 18) */
  deleteSpeed?: number
  /** Pause at full display in ms (default: 1400) */
  pauseDuration?: number
  /** Pause between messages in ms (default: 220) */
  gapDuration?: number
  /** Cursor character (default: '▌') */
  cursor?: string
  /** CSS class for the container */
  className?: string
  /** CSS class for the cursor */
  cursorClassName?: string
}

/**
 * Typewriter effect cycling through status messages.
 *
 * Types character-by-character, pauses, then deletes before moving
 * to the next message. Includes a blinking cursor via CSS animation.
 *
 * Respects prefers-reduced-motion by showing messages instantly.
 */
export function Typewriter({
  messages,
  typeSpeed = 28,
  deleteSpeed = 18,
  pauseDuration = 1400,
  gapDuration = 220,
  cursor = '▌',
  className,
  cursorClassName,
}: TypewriterProps) {
  const [text, setText] = useState('')
  const [showCursor, setShowCursor] = useState(true)
  const indexRef = useRef(0)
  const reducedMotion = useRef(false)

  useEffect(() => {
    reducedMotion.current = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches

    if (reducedMotion.current || messages.length === 0) {
      setText(messages[0] || '')
      return
    }

    let timeout: ReturnType<typeof setTimeout>
    let charIndex = 0
    let deleting = false
    let msgIndex = 0

    const tick = () => {
      const current = messages[msgIndex]

      if (!deleting) {
        charIndex++
        setText(current.slice(0, charIndex))

        if (charIndex === current.length) {
          timeout = setTimeout(() => {
            deleting = true
            tick()
          }, pauseDuration)
          return
        }
        timeout = setTimeout(tick, typeSpeed)
      } else {
        charIndex--
        setText(current.slice(0, charIndex))

        if (charIndex === 0) {
          deleting = false
          msgIndex = (msgIndex + 1) % messages.length
          timeout = setTimeout(tick, gapDuration)
          return
        }
        timeout = setTimeout(tick, deleteSpeed)
      }
    }

    tick()

    // Cursor blink
    const blink = setInterval(() => setShowCursor((v) => !v), 500)

    return () => {
      clearTimeout(timeout)
      clearInterval(blink)
    }
  }, [messages, typeSpeed, deleteSpeed, pauseDuration, gapDuration])

  return (
    <span className={className}>
      {text}
      <span
        className={cursorClassName}
        style={{ opacity: showCursor ? 1 : 0, color: '#7de58d' }}
        aria-hidden="true"
      >
        {cursor}
      </span>
    </span>
  )
}
