/**
 * Issue #57 - AC8: Z-Index Management Tests
 * Verifies bubbles render above sprites
 */

import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { SpeechBubbleComponent } from '../../src/components/settlers/SpeechBubble'
import type { SpeechBubble } from '../../src/components/settlers/types'

describe('SpeechBubbleComponent - Z-Index Management (AC8)', () => {
  it('should have z-index higher than sprites (1000)', () => {
    const bubble: SpeechBubble = {
      agentId: 'agent-1',
      text: 'Test',
      position: { isoX: 0, isoY: 0 },
      visible: true,
      opacity: 1.0
    }

    const { container } = render(<SpeechBubbleComponent bubble={bubble} />)

    const bubbleElement = container.querySelector('[data-testid="speech-bubble"]') as HTMLElement
    expect(parseInt(bubbleElement.style.zIndex, 10)).toBe(1000)
  })

  it('should ensure bubbles layer above agent sprites', () => {
    const bubble: SpeechBubble = {
      agentId: 'agent-1',
      text: 'Layering test',
      position: { isoX: 100, isoY: 100 },
      visible: true,
      opacity: 1.0
    }

    const { container } = render(<SpeechBubbleComponent bubble={bubble} />)

    const bubbleElement = container.querySelector('[data-testid="speech-bubble"]') as HTMLElement

    // Z-index should be high enough to layer above sprites (typically z-index: 100-500)
    const zIndex = parseInt(bubbleElement.style.zIndex, 10)
    expect(zIndex).toBeGreaterThan(500)
  })

  it('should maintain z-index during hover', () => {
    const bubble: SpeechBubble = {
      agentId: 'agent-1',
      text: 'Hover test',
      position: { isoX: 0, isoY: 0 },
      visible: true,
      opacity: 1.0
    }

    const { container } = render(<SpeechBubbleComponent bubble={bubble} />)

    const bubbleElement = container.querySelector('[data-testid="speech-bubble"]') as HTMLElement
    const initialZIndex = bubbleElement.style.zIndex

    // Hover
    bubbleElement.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }))

    // Z-index should not change on hover
    expect(bubbleElement.style.zIndex).toBe(initialZIndex)
  })

  it('should not overlap with other bubbles (same z-index)', () => {
    const bubble1: SpeechBubble = {
      agentId: 'agent-1',
      text: 'Bubble 1',
      position: { isoX: 100, isoY: 100 },
      visible: true,
      opacity: 1.0
    }

    const bubble2: SpeechBubble = {
      agentId: 'agent-2',
      text: 'Bubble 2',
      position: { isoX: 150, isoY: 150 },
      visible: true,
      opacity: 1.0
    }

    const { container: container1 } = render(<SpeechBubbleComponent bubble={bubble1} />)
    const { container: container2 } = render(<SpeechBubbleComponent bubble={bubble2} />)

    const element1 = container1.querySelector('[data-testid="speech-bubble"]') as HTMLElement
    const element2 = container2.querySelector('[data-testid="speech-bubble"]') as HTMLElement

    // Both should have same z-index (no hierarchy between bubbles)
    expect(element1.style.zIndex).toBe(element2.style.zIndex)
  })
})
