/**
 * Issue #57 - AC3: Speech Bubble Animation Hook
 *
 * Handles fade-in/fade-out animations when text changes
 *
 * Animation Flow:
 * 1. Text changes → Fade out (300ms)
 * 2. At opacity 0 → Swap text
 * 3. Fade in (300ms)
 *
 * @param text - Current text to display
 * @param baseVisible - Base visibility (from parent)
 * @returns { opacity, isVisible } - Animation state
 */

import { useState, useEffect, useRef } from 'react'

interface AnimationState {
  opacity: number
  isVisible: boolean
}

export function useSpeechBubbleAnimation(
  text: string,
  baseVisible: boolean
): AnimationState {
  const [opacity, setOpacity] = useState(1.0)
  const [isVisible, setIsVisible] = useState(baseVisible)
  const previousTextRef = useRef(text)
  const animationFrameRef = useRef<number | null>(null)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Handle visibility changes
  useEffect(() => {
    if (!baseVisible) {
      // Fade out when hidden
      const startTime = Date.now()
      const startOpacity = opacity

      const fadeOut = () => {
        const elapsed = Date.now() - startTime
        const progress = Math.min(elapsed / 300, 1) // 300ms fade

        const newOpacity = startOpacity * (1 - progress)
        setOpacity(newOpacity)

        if (progress < 1) {
          animationFrameRef.current = requestAnimationFrame(fadeOut)
        } else {
          setIsVisible(false)
        }
      }

      fadeOut()
    } else {
      setIsVisible(true)
      // Fade in when shown
      const startTime = Date.now()
      const startOpacity = opacity

      const fadeIn = () => {
        const elapsed = Date.now() - startTime
        const progress = Math.min(elapsed / 300, 1) // 300ms fade

        const newOpacity = startOpacity + (1 - startOpacity) * progress
        setOpacity(newOpacity)

        if (progress < 1) {
          animationFrameRef.current = requestAnimationFrame(fadeIn)
        }
      }

      fadeIn()
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [baseVisible])

  // Handle text changes (fade out → fade in)
  useEffect(() => {
    if (text !== previousTextRef.current && baseVisible) {
      // Cancel any ongoing animations
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }

      // Fade out
      const fadeOutStart = Date.now()
      const fadeOutStartOpacity = opacity

      const fadeOut = () => {
        const elapsed = Date.now() - fadeOutStart
        const progress = Math.min(elapsed / 300, 1) // 300ms

        const newOpacity = fadeOutStartOpacity * (1 - progress)
        setOpacity(newOpacity)

        if (progress < 1) {
          animationFrameRef.current = requestAnimationFrame(fadeOut)
        } else {
          // Fade out complete, now fade in with new text
          previousTextRef.current = text

          timeoutRef.current = setTimeout(() => {
            const fadeInStart = Date.now()

            const fadeIn = () => {
              const elapsed = Date.now() - fadeInStart
              const progress = Math.min(elapsed / 300, 1) // 300ms

              const newOpacity = progress
              setOpacity(newOpacity)

              if (progress < 1) {
                animationFrameRef.current = requestAnimationFrame(fadeIn)
              }
            }

            fadeIn()
          }, 0)
        }
      }

      fadeOut()
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [text, baseVisible])

  return {
    opacity,
    isVisible
  }
}
