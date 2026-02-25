/**
 * Issue #57 - AC3: Text-Update Animation Tests
 * TDD-Approach: Tests ZUERST
 *
 * Requirements:
 * - Fade out when text changes (300ms)
 * - Fade in with new text (300ms)
 * - Smooth opacity transitions
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useSpeechBubbleAnimation } from '../../src/components/settlers/useSpeechBubbleAnimation'

describe('useSpeechBubbleAnimation - Fade Transitions (AC3)', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should start with opacity 1 and visible true', () => {
    const { result } = renderHook(() => useSpeechBubbleAnimation('Initial text', true))

    expect(result.current.opacity).toBe(1.0)
    expect(result.current.isVisible).toBe(true)
  })

  it('should fade out when text changes', () => {
    const { result, rerender } = renderHook(
      ({ text }) => useSpeechBubbleAnimation(text, true),
      { initialProps: { text: 'Text 1' } }
    )

    // Initial state
    expect(result.current.opacity).toBe(1.0)

    // Change text
    rerender({ text: 'Text 2' })

    // Should immediately start fading out
    act(() => {
      vi.advanceTimersByTime(150) // Mid-fade
    })

    // Opacity should be less than 1 (fading out)
    expect(result.current.opacity).toBeLessThan(1.0)
  })

  it('should fade in after fade out completes', () => {
    const { result, rerender } = renderHook(
      ({ text }) => useSpeechBubbleAnimation(text, true),
      { initialProps: { text: 'Text 1' } }
    )

    // Change text
    rerender({ text: 'Text 2' })

    // Fast-forward through fade-out (300ms)
    act(() => {
      vi.advanceTimersByTime(300)
    })

    // Should be at min opacity (0 or near-0)
    expect(result.current.opacity).toBeLessThanOrEqual(0.1)

    // Fast-forward through fade-in (300ms)
    act(() => {
      vi.advanceTimersByTime(300)
    })

    // Should be back to full opacity
    expect(result.current.opacity).toBeGreaterThanOrEqual(0.9)
  })

  it('should complete full fade cycle in 600ms (300ms out + 300ms in)', () => {
    const { result, rerender } = renderHook(
      ({ text }) => useSpeechBubbleAnimation(text, true),
      { initialProps: { text: 'Text 1' } }
    )

    rerender({ text: 'Text 2' })

    // Fast-forward full cycle
    act(() => {
      vi.advanceTimersByTime(600)
    })

    // Should be back to normal
    expect(result.current.opacity).toBeCloseTo(1.0, 1)
  })

  it('should not animate when text is same', () => {
    const { result, rerender } = renderHook(
      ({ text }) => useSpeechBubbleAnimation(text, true),
      { initialProps: { text: 'Same text' } }
    )

    const initialOpacity = result.current.opacity

    // Re-render with same text
    rerender({ text: 'Same text' })

    act(() => {
      vi.advanceTimersByTime(100)
    })

    // Opacity should not change
    expect(result.current.opacity).toBe(initialOpacity)
  })

  it('should set isVisible=false when baseVisible=false', () => {
    const { result } = renderHook(() => useSpeechBubbleAnimation('Text', false))

    expect(result.current.isVisible).toBe(false)
  })

  it('should fade out when baseVisible changes from true to false', () => {
    const { result, rerender } = renderHook(
      ({ visible }) => useSpeechBubbleAnimation('Text', visible),
      { initialProps: { visible: true } }
    )

    expect(result.current.opacity).toBe(1.0)

    // Hide bubble
    rerender({ visible: false })

    act(() => {
      vi.advanceTimersByTime(150)
    })

    // Should be fading out
    expect(result.current.opacity).toBeLessThan(1.0)
  })

  it('should handle rapid text changes gracefully', () => {
    const { result, rerender } = renderHook(
      ({ text }) => useSpeechBubbleAnimation(text, true),
      { initialProps: { text: 'Text 1' } }
    )

    // Rapid changes
    rerender({ text: 'Text 2' })
    act(() => { vi.advanceTimersByTime(50) })

    rerender({ text: 'Text 3' })
    act(() => { vi.advanceTimersByTime(50) })

    rerender({ text: 'Text 4' })
    act(() => { vi.advanceTimersByTime(50) })

    // Should still be animating (not crash)
    expect(result.current.opacity).toBeGreaterThanOrEqual(0)
    expect(result.current.opacity).toBeLessThanOrEqual(1)
  })

  it('should cleanup timers on unmount', () => {
    const { unmount } = renderHook(() => useSpeechBubbleAnimation('Text', true))

    // Should not throw
    expect(() => unmount()).not.toThrow()
  })
})

describe('useSpeechBubbleAnimation - Edge Cases', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should handle empty text', () => {
    const { result } = renderHook(() => useSpeechBubbleAnimation('', true))

    expect(result.current.isVisible).toBe(true)
    expect(result.current.opacity).toBe(1.0)
  })

  it('should handle very long text', () => {
    const longText = 'x'.repeat(10000)
    const { result } = renderHook(() => useSpeechBubbleAnimation(longText, true))

    expect(result.current.isVisible).toBe(true)
    expect(result.current.opacity).toBe(1.0)
  })

  it('should handle text with special characters', () => {
    const { result } = renderHook(() =>
      useSpeechBubbleAnimation('Text with 😀 emoji and\nnewlines', true)
    )

    expect(result.current.isVisible).toBe(true)
    expect(result.current.opacity).toBe(1.0)
  })
})
