/**
 * Issue #57 - AC3: Speech Bubble Animation Integration Tests
 * Tests fade animations within the component
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, act } from '@testing-library/react'
import { SpeechBubbleComponent } from '../../src/components/settlers/SpeechBubble'
import type { SpeechBubble } from '../../src/components/settlers/types'

describe('SpeechBubbleComponent - Fade Animation (AC3)', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should start with full opacity', () => {
    const bubble: SpeechBubble = {
      agentId: 'agent-1',
      text: 'Initial text',
      position: { isoX: 0, isoY: 0 },
      visible: true,
      opacity: 1.0
    }

    const { container } = render(<SpeechBubbleComponent bubble={bubble} />)

    const bubbleElement = container.querySelector('[data-testid="speech-bubble"]') as HTMLElement
    expect(parseFloat(bubbleElement.style.opacity)).toBeCloseTo(1.0, 1)
  })

  it('should fade out and fade in when text changes', () => {
    const bubble: SpeechBubble = {
      agentId: 'agent-1',
      text: 'Text 1',
      position: { isoX: 0, isoY: 0 },
      visible: true,
      opacity: 1.0
    }

    const { container, rerender } = render(<SpeechBubbleComponent bubble={bubble} />)

    // Change text
    const newBubble = { ...bubble, text: 'Text 2' }
    rerender(<SpeechBubbleComponent bubble={newBubble} />)

    // Mid-fade-out (150ms)
    act(() => {
      vi.advanceTimersByTime(150)
    })

    const bubbleElement = container.querySelector('[data-testid="speech-bubble"]') as HTMLElement
    const midOpacity = parseFloat(bubbleElement.style.opacity)

    // Should be less than 1 (fading out)
    expect(midOpacity).toBeLessThan(1.0)
    expect(midOpacity).toBeGreaterThan(0)
  })

  it('should complete fade cycle in 600ms', () => {
    const bubble: SpeechBubble = {
      agentId: 'agent-1',
      text: 'Text 1',
      position: { isoX: 0, isoY: 0 },
      visible: true,
      opacity: 1.0
    }

    const { container, rerender } = render(<SpeechBubbleComponent bubble={bubble} />)

    // Change text
    const newBubble = { ...bubble, text: 'Text 2' }
    rerender(<SpeechBubbleComponent bubble={newBubble} />)

    // Complete fade cycle
    act(() => {
      vi.advanceTimersByTime(600)
    })

    const bubbleElement = container.querySelector('[data-testid="speech-bubble"]') as HTMLElement
    const finalOpacity = parseFloat(bubbleElement.style.opacity)

    // Should be back to full opacity
    expect(finalOpacity).toBeGreaterThanOrEqual(0.9)
  })

  it('should not animate when text stays the same', () => {
    const bubble: SpeechBubble = {
      agentId: 'agent-1',
      text: 'Same text',
      position: { isoX: 0, isoY: 0 },
      visible: true,
      opacity: 1.0
    }

    const { container, rerender } = render(<SpeechBubbleComponent bubble={bubble} />)

    const initialElement = container.querySelector('[data-testid="speech-bubble"]') as HTMLElement
    const initialOpacity = parseFloat(initialElement.style.opacity)

    // Re-render with same text
    rerender(<SpeechBubbleComponent bubble={bubble} />)

    act(() => {
      vi.advanceTimersByTime(100)
    })

    const sameElement = container.querySelector('[data-testid="speech-bubble"]') as HTMLElement
    const sameOpacity = parseFloat(sameElement.style.opacity)

    // Opacity should not change significantly
    expect(Math.abs(sameOpacity - initialOpacity)).toBeLessThan(0.1)
  })

  it('should handle rapid text changes', () => {
    const bubble: SpeechBubble = {
      agentId: 'agent-1',
      text: 'Text 1',
      position: { isoX: 0, isoY: 0 },
      visible: true,
      opacity: 1.0
    }

    const { rerender } = render(<SpeechBubbleComponent bubble={bubble} />)

    // Rapid changes
    act(() => {
      rerender(<SpeechBubbleComponent bubble={{ ...bubble, text: 'Text 2' }} />)
      vi.advanceTimersByTime(50)

      rerender(<SpeechBubbleComponent bubble={{ ...bubble, text: 'Text 3' }} />)
      vi.advanceTimersByTime(50)

      rerender(<SpeechBubbleComponent bubble={{ ...bubble, text: 'Text 4' }} />)
      vi.advanceTimersByTime(50)
    })

    // Should not crash
    expect(true).toBe(true)
  })

  it('should hide when visible=false', () => {
    const bubble: SpeechBubble = {
      agentId: 'agent-1',
      text: 'Test',
      position: { isoX: 0, isoY: 0 },
      visible: true,
      opacity: 1.0
    }

    const { container, rerender } = render(<SpeechBubbleComponent bubble={bubble} />)

    expect(container.querySelector('[data-testid="speech-bubble"]')).toBeTruthy()

    // Hide bubble
    const hiddenBubble = { ...bubble, visible: false }
    rerender(<SpeechBubbleComponent bubble={hiddenBubble} />)

    act(() => {
      vi.advanceTimersByTime(500)
    })

    // Should not render (returns null)
    expect(container.querySelector('[data-testid="speech-bubble"]')).toBeNull()
  })
})
