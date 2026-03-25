'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

export interface SoundLayerOptions {
  /** Ambient track URL (looping background audio) */
  ambientSrc?: string
  /** Ambient volume 0-1 (default: 0.42) */
  ambientVolume?: number
  /** Hover tone URL (short sound on hover) */
  hoverSrc?: string
  /** Hover tone volume 0-1 (default: 0.3) */
  hoverVolume?: number
  /** Debounce interval for hover tones in ms (default: 180) */
  hoverDebounce?: number
}

/**
 * Sound design layer providing ambient audio and hover tones.
 *
 * All audio is lazy-loaded (preload="none") and requires user interaction
 * to start. Call `enable()` on first user gesture to begin playback.
 *
 * Hover tones fire via `playHoverTone()` — wire to pointerenter/focus events.
 */
export function useSoundLayer(options: SoundLayerOptions = {}) {
  const {
    ambientSrc,
    ambientVolume = 0.42,
    hoverSrc,
    hoverVolume = 0.3,
    hoverDebounce = 180,
  } = options

  const ambientRef = useRef<HTMLAudioElement | null>(null)
  const hoverRef = useRef<HTMLAudioElement | null>(null)
  const lastHover = useRef(0)
  const [enabled, setEnabled] = useState(false)
  const [muted, setMuted] = useState(false)

  // Lazy-create audio elements
  const ensureAmbient = useCallback(() => {
    if (ambientRef.current || !ambientSrc) return
    const audio = new Audio(ambientSrc)
    audio.loop = true
    audio.volume = ambientVolume
    audio.preload = 'none'
    ambientRef.current = audio
  }, [ambientSrc, ambientVolume])

  const ensureHover = useCallback(() => {
    if (hoverRef.current || !hoverSrc) return
    const audio = new Audio(hoverSrc)
    audio.volume = hoverVolume
    audio.preload = 'none'
    hoverRef.current = audio
  }, [hoverSrc, hoverVolume])

  /** Call on first user interaction to enable audio */
  const enable = useCallback(() => {
    ensureAmbient()
    ensureHover()
    if (ambientRef.current) {
      ambientRef.current.play().catch(() => {})
    }
    setEnabled(true)
  }, [ensureAmbient, ensureHover])

  /** Toggle mute state */
  const toggleMute = useCallback(() => {
    setMuted((prev) => {
      const next = !prev
      if (ambientRef.current) ambientRef.current.muted = next
      return next
    })
  }, [])

  /** Play hover tone (debounced) */
  const playHoverTone = useCallback(() => {
    if (!enabled || muted) return
    const now = Date.now()
    if (now - lastHover.current < hoverDebounce) return
    lastHover.current = now

    ensureHover()
    const audio = hoverRef.current
    if (audio) {
      audio.currentTime = 0
      audio.play().catch(() => {})
    }
  }, [enabled, muted, hoverDebounce, ensureHover])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      ambientRef.current?.pause()
      ambientRef.current = null
      hoverRef.current = null
    }
  }, [])

  return { enable, enabled, muted, toggleMute, playHoverTone }
}
