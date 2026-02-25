/**
 * Issue #57 - AC7: Hover-Erweiterung Tests
 * TDD-Approach: Tests ZUERST
 *
 * Requirements:
 * - Hover → Bubble expandiert (max 300px width)
 * - Volltext sichtbar (kein Truncate)
 * - Smooth transition
 */

import { describe, it, expect } from 'vitest'
import { render, fireEvent } from '@testing-library/react'
import { SpeechBubbleComponent } from '../../src/components/settlers/SpeechBubble'
import type { SpeechBubble } from '../../src/components/settlers/types'

describe('SpeechBubbleComponent - Hover Expansion (AC7)', () => {
  it('should show truncated text by default', () => {
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

    // Should be truncated
    expect(displayedText).toContain('...')
  })

  it('should expand to show full text on hover', () => {
    const longText = 'Line 1\nLine 2\nLine 3\nLine 4\nLine 5'
    const bubble: SpeechBubble = {
      agentId: 'agent-1',
      text: longText,
      position: { isoX: 0, isoY: 0 },
      visible: true,
      opacity: 1.0
    }

    const { container } = render(<SpeechBubbleComponent bubble={bubble} />)

    const bubbleElement = container.querySelector('[data-testid="speech-bubble"]') as HTMLElement

    // Hover
    fireEvent.mouseEnter(bubbleElement)

    const expandedText = bubbleElement.textContent || ''

    // Should show full text (no truncation)
    expect(expandedText).not.toContain('...')
    expect(expandedText).toContain('Line 4')
    expect(expandedText).toContain('Line 5')
  })

  it('should collapse back to truncated text on mouse leave', () => {
    const longText = 'Line 1\nLine 2\nLine 3\nLine 4\nLine 5'
    const bubble: SpeechBubble = {
      agentId: 'agent-1',
      text: longText,
      position: { isoX: 0, isoY: 0 },
      visible: true,
      opacity: 1.0
    }

    const { container } = render(<SpeechBubbleComponent bubble={bubble} />)

    const bubbleElement = container.querySelector('[data-testid="speech-bubble"]') as HTMLElement

    // Hover
    fireEvent.mouseEnter(bubbleElement)
    const expandedText = bubbleElement.textContent || ''
    expect(expandedText).not.toContain('...')

    // Leave
    fireEvent.mouseLeave(bubbleElement)
    const collapsedText = bubbleElement.textContent || ''
    expect(collapsedText).toContain('...')
  })

  it('should have max-width 300px when hovered', () => {
    const longText = 'This is a very long line that should expand on hover. '.repeat(5)
    const bubble: SpeechBubble = {
      agentId: 'agent-1',
      text: longText,
      position: { isoX: 0, isoY: 0 },
      visible: true,
      opacity: 1.0
    }

    const { container } = render(<SpeechBubbleComponent bubble={bubble} />)

    const bubbleElement = container.querySelector('[data-testid="speech-bubble"]') as HTMLElement

    // Hover
    fireEvent.mouseEnter(bubbleElement)

    const maxWidth = bubbleElement.style.maxWidth
    expect(maxWidth).toBe('300px')
  })

  it('should have default max-width 200px when not hovered', () => {
    const bubble: SpeechBubble = {
      agentId: 'agent-1',
      text: 'Short text',
      position: { isoX: 0, isoY: 0 },
      visible: true,
      opacity: 1.0
    }

    const { container } = render(<SpeechBubbleComponent bubble={bubble} />)

    const bubbleElement = container.querySelector('[data-testid="speech-bubble"]') as HTMLElement

    const maxWidth = bubbleElement.style.maxWidth
    expect(maxWidth).toBe('200px')
  })

  it('should not expand if text fits (no truncation)', () => {
    const shortText = 'Line 1\nLine 2'
    const bubble: SpeechBubble = {
      agentId: 'agent-1',
      text: shortText,
      position: { isoX: 0, isoY: 0 },
      visible: true,
      opacity: 1.0
    }

    const { container } = render(<SpeechBubbleComponent bubble={bubble} />)

    const bubbleElement = container.querySelector('[data-testid="speech-bubble"]') as HTMLElement

    // Hover
    fireEvent.mouseEnter(bubbleElement)

    const expandedText = bubbleElement.textContent || ''

    // Should still show same text (no "...")
    expect(expandedText).not.toContain('...')
    expect(expandedText).toContain('Line 1')
    expect(expandedText).toContain('Line 2')
  })

  it('should handle empty text on hover', () => {
    const bubble: SpeechBubble = {
      agentId: 'agent-1',
      text: '',
      position: { isoX: 0, isoY: 0 },
      visible: true,
      opacity: 1.0
    }

    const { container } = render(<SpeechBubbleComponent bubble={bubble} />)

    const bubbleElement = container.querySelector('[data-testid="speech-bubble"]') as HTMLElement

    // Should not crash
    expect(() => fireEvent.mouseEnter(bubbleElement)).not.toThrow()
  })

  it('should show full text even if very long (on hover)', () => {
    const veryLongText = 'Line\n'.repeat(20)
    const bubble: SpeechBubble = {
      agentId: 'agent-1',
      text: veryLongText,
      position: { isoX: 0, isoY: 0 },
      visible: true,
      opacity: 1.0
    }

    const { container } = render(<SpeechBubbleComponent bubble={bubble} />)

    const bubbleElement = container.querySelector('[data-testid="speech-bubble"]') as HTMLElement

    // Hover
    fireEvent.mouseEnter(bubbleElement)

    const expandedText = bubbleElement.textContent || ''

    // Should not be truncated
    expect(expandedText).not.toContain('...')

    // Should be much longer than truncated version
    const linesShown = expandedText.split('\n').length
    expect(linesShown).toBeGreaterThan(3)
  })
})
