/**
 * Issue #57 - AC2: Speech Bubble Rendering Tests (Comic-Style)
 * TDD-Approach: Tests ZUERST
 */

import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { SpeechBubbleComponent } from '../../src/components/settlers/SpeechBubble'
import type { SpeechBubble } from '../../src/components/settlers/types'

describe('SpeechBubbleComponent - Rendering (AC2)', () => {
  it('should render visible bubble with text', () => {
    const bubble: SpeechBubble = {
      agentId: 'agent-1',
      text: 'Hello World',
      position: { isoX: 100, isoY: 200 },
      visible: true,
      opacity: 1.0
    }

    render(<SpeechBubbleComponent bubble={bubble} />)

    const textElement = screen.getByText('Hello World')
    expect(textElement).toBeDefined()
  })

  it('should not render when visible=false', () => {
    const bubble: SpeechBubble = {
      agentId: 'agent-1',
      text: 'Hidden Text',
      position: { isoX: 100, isoY: 200 },
      visible: false,
      opacity: 0.0
    }

    const { container } = render(<SpeechBubbleComponent bubble={bubble} />)

    // Component should not render anything
    expect(container.firstChild).toBeNull()
  })

  it('should apply correct positioning via inline styles', () => {
    const bubble: SpeechBubble = {
      agentId: 'agent-1',
      text: 'Positioned Text',
      position: { isoX: 123, isoY: 456 },
      visible: true,
      opacity: 1.0
    }

    const { container } = render(<SpeechBubbleComponent bubble={bubble} />)

    const bubbleElement = container.querySelector('[data-testid="speech-bubble"]')
    expect(bubbleElement).toBeDefined()

    const style = (bubbleElement as HTMLElement).style
    expect(style.left).toBe('123px')
    expect(style.top).toBe('456px')
  })

  it('should apply correct opacity', () => {
    const bubble: SpeechBubble = {
      agentId: 'agent-1',
      text: 'Semi-transparent',
      position: { isoX: 0, isoY: 0 },
      visible: true,
      opacity: 0.5
    }

    const { container } = render(<SpeechBubbleComponent bubble={bubble} />)

    const bubbleElement = container.querySelector('[data-testid="speech-bubble"]')
    const style = (bubbleElement as HTMLElement).style
    expect(style.opacity).toBe('0.5')
  })

  it('should have white background (comic-style)', () => {
    const bubble: SpeechBubble = {
      agentId: 'agent-1',
      text: 'Test',
      position: { isoX: 0, isoY: 0 },
      visible: true,
      opacity: 1.0
    }

    const { container } = render(<SpeechBubbleComponent bubble={bubble} />)

    const bubbleElement = container.querySelector('[data-testid="speech-bubble"]')
    const computedStyle = window.getComputedStyle(bubbleElement as Element)

    // Should have white or light background
    expect(computedStyle.backgroundColor).toMatch(/rgb\(255,\s*255,\s*255\)|white/)
  })

  it('should have rounded corners', () => {
    const bubble: SpeechBubble = {
      agentId: 'agent-1',
      text: 'Test',
      position: { isoX: 0, isoY: 0 },
      visible: true,
      opacity: 1.0
    }

    const { container } = render(<SpeechBubbleComponent bubble={bubble} />)

    const bubbleElement = container.querySelector('[data-testid="speech-bubble"]')
    const computedStyle = window.getComputedStyle(bubbleElement as Element)

    // Should have border-radius
    expect(computedStyle.borderRadius).not.toBe('0px')
  })

  it('should have shadow (box-shadow)', () => {
    const bubble: SpeechBubble = {
      agentId: 'agent-1',
      text: 'Test',
      position: { isoX: 0, isoY: 0 },
      visible: true,
      opacity: 1.0
    }

    const { container } = render(<SpeechBubbleComponent bubble={bubble} />)

    const bubbleElement = container.querySelector('[data-testid="speech-bubble"]')
    const computedStyle = window.getComputedStyle(bubbleElement as Element)

    // Should have box-shadow
    expect(computedStyle.boxShadow).not.toBe('none')
  })

  it('should render triangle pointer (::before or child element)', () => {
    const bubble: SpeechBubble = {
      agentId: 'agent-1',
      text: 'Test',
      position: { isoX: 0, isoY: 0 },
      visible: true,
      opacity: 1.0
    }

    const { container } = render(<SpeechBubbleComponent bubble={bubble} />)

    // Triangle should be rendered via CSS ::before or as child element
    const bubbleElement = container.querySelector('[data-testid="speech-bubble"]')
    expect(bubbleElement).toBeDefined()

    // Check if ::before pseudo-element is styled (indirectly via class presence)
    expect(bubbleElement?.classList.contains('speech-bubble')).toBe(true)
  })

  it('should handle empty text', () => {
    const bubble: SpeechBubble = {
      agentId: 'agent-1',
      text: '',
      position: { isoX: 0, isoY: 0 },
      visible: true,
      opacity: 1.0
    }

    const { container } = render(<SpeechBubbleComponent bubble={bubble} />)

    const bubbleElement = container.querySelector('[data-testid="speech-bubble"]')
    expect(bubbleElement).toBeDefined()
    expect(bubbleElement?.textContent).toBe('')
  })

  it('should render multi-line text', () => {
    const bubble: SpeechBubble = {
      agentId: 'agent-1',
      text: 'Line 1\nLine 2\nLine 3',
      position: { isoX: 0, isoY: 0 },
      visible: true,
      opacity: 1.0
    }

    const { container } = render(<SpeechBubbleComponent bubble={bubble} />)

    const bubbleElement = container.querySelector('[data-testid="speech-bubble"]')
    expect(bubbleElement?.textContent).toContain('Line 1')
    expect(bubbleElement?.textContent).toContain('Line 2')
    expect(bubbleElement?.textContent).toContain('Line 3')
  })
})

describe('SpeechBubbleComponent - Styling', () => {
  it('should have absolute positioning', () => {
    const bubble: SpeechBubble = {
      agentId: 'agent-1',
      text: 'Test',
      position: { isoX: 0, isoY: 0 },
      visible: true,
      opacity: 1.0
    }

    const { container } = render(<SpeechBubbleComponent bubble={bubble} />)

    const bubbleElement = container.querySelector('[data-testid="speech-bubble"]')
    const computedStyle = window.getComputedStyle(bubbleElement as Element)

    expect(computedStyle.position).toBe('absolute')
  })

  it('should have padding', () => {
    const bubble: SpeechBubble = {
      agentId: 'agent-1',
      text: 'Test',
      position: { isoX: 0, isoY: 0 },
      visible: true,
      opacity: 1.0
    }

    const { container } = render(<SpeechBubbleComponent bubble={bubble} />)

    const bubbleElement = container.querySelector('[data-testid="speech-bubble"]')
    const computedStyle = window.getComputedStyle(bubbleElement as Element)

    expect(computedStyle.padding).not.toBe('0px')
  })

  it('should have black text color', () => {
    const bubble: SpeechBubble = {
      agentId: 'agent-1',
      text: 'Test',
      position: { isoX: 0, isoY: 0 },
      visible: true,
      opacity: 1.0
    }

    const { container } = render(<SpeechBubbleComponent bubble={bubble} />)

    const bubbleElement = container.querySelector('[data-testid="speech-bubble"]')
    const computedStyle = window.getComputedStyle(bubbleElement as Element)

    // Should have dark text (black or near-black)
    expect(computedStyle.color).toMatch(/rgb\(0,\s*0,\s*0\)|black|#000/)
  })
})
