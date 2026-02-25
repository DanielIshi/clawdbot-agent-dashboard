/**
 * Issue #57 - AC5: Speech Bubble Truncation Integration Tests
 * Tests truncation functionality within the component
 */

import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { SpeechBubbleComponent } from '../../src/components/settlers/SpeechBubble'
import type { SpeechBubble } from '../../src/components/settlers/types'

describe('SpeechBubbleComponent - Truncation (AC5)', () => {
  it('should truncate text with more than 3 lines', () => {
    const longText = 'Line 1\nLine 2\nLine 3\nLine 4\nLine 5'
    const bubble: SpeechBubble = {
      agentId: 'agent-1',
      text: longText,
      position: { isoX: 0, isoY: 0 },
      visible: true,
      opacity: 1.0
    }

    const { container } = render(<SpeechBubbleComponent bubble={bubble} />)

    const bubbleElement = container.querySelector('[data-testid="speech-bubble"]')
    const displayedText = bubbleElement?.textContent || ''

    // Should contain "..."
    expect(displayedText).toContain('...')

    // Should not contain Line 4 and Line 5
    expect(displayedText).not.toContain('Line 4')
    expect(displayedText).not.toContain('Line 5')
  })

  it('should not truncate text with exactly 3 lines', () => {
    const text = 'Line 1\nLine 2\nLine 3'
    const bubble: SpeechBubble = {
      agentId: 'agent-1',
      text: text,
      position: { isoX: 0, isoY: 0 },
      visible: true,
      opacity: 1.0
    }

    const { container } = render(<SpeechBubbleComponent bubble={bubble} />)

    const bubbleElement = container.querySelector('[data-testid="speech-bubble"]')
    const displayedText = bubbleElement?.textContent || ''

    // Should NOT contain "..." (fits exactly)
    expect(displayedText).not.toContain('...')

    // Should contain all lines
    expect(displayedText).toContain('Line 1')
    expect(displayedText).toContain('Line 2')
    expect(displayedText).toContain('Line 3')
  })

  it('should truncate very long single line', () => {
    const longLine = 'This is a very long line that should be truncated because it exceeds the maximum allowed width. '.repeat(5)
    const bubble: SpeechBubble = {
      agentId: 'agent-1',
      text: longLine,
      position: { isoX: 0, isoY: 0 },
      visible: true,
      opacity: 1.0
    }

    const { container } = render(<SpeechBubbleComponent bubble={bubble} />)

    const bubbleElement = container.querySelector('[data-testid="speech-bubble"]')
    const displayedText = bubbleElement?.textContent || ''

    // Should contain "..."
    expect(displayedText).toContain('...')

    // Should be shorter than original
    expect(displayedText.length).toBeLessThan(longLine.length)
  })

  it('should preserve short text unchanged', () => {
    const text = 'Short message'
    const bubble: SpeechBubble = {
      agentId: 'agent-1',
      text: text,
      position: { isoX: 0, isoY: 0 },
      visible: true,
      opacity: 1.0
    }

    const { container } = render(<SpeechBubbleComponent bubble={bubble} />)

    const bubbleElement = container.querySelector('[data-testid="speech-bubble"]')
    const displayedText = bubbleElement?.textContent || ''

    expect(displayedText).toBe(text)
    expect(displayedText).not.toContain('...')
  })

  it('should handle empty text after truncation', () => {
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

  it('should wrap long words and truncate', () => {
    const text = 'supercalifragilisticexpialidocious '.repeat(10)
    const bubble: SpeechBubble = {
      agentId: 'agent-1',
      text: text,
      position: { isoX: 0, isoY: 0 },
      visible: true,
      opacity: 1.0
    }

    const { container } = render(<SpeechBubbleComponent bubble={bubble} />)

    const bubbleElement = container.querySelector('[data-testid="speech-bubble"]')
    const displayedText = bubbleElement?.textContent || ''

    expect(displayedText).toContain('...')
    expect(displayedText.length).toBeLessThan(text.length)
  })
})
