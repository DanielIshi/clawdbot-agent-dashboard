/**
 * Issue #57 - AC1: Speech Bubble Data Structure Tests
 * TDD-Approach: Tests ZUERST
 */

import { describe, it, expect } from 'vitest'
import type { SpeechBubble } from '../../src/components/settlers/types'

describe('SpeechBubble - Data Structure (AC1)', () => {
  it('should have all required properties', () => {
    const bubble: SpeechBubble = {
      agentId: 'agent-1',
      text: 'Hello World',
      position: { isoX: 100, isoY: 200 },
      visible: true,
      opacity: 1.0
    }

    expect(bubble.agentId).toBe('agent-1')
    expect(bubble.text).toBe('Hello World')
    expect(bubble.position.isoX).toBe(100)
    expect(bubble.position.isoY).toBe(200)
    expect(bubble.visible).toBe(true)
    expect(bubble.opacity).toBe(1.0)
  })

  it('should allow opacity values between 0 and 1', () => {
    const bubble1: SpeechBubble = {
      agentId: 'agent-1',
      text: 'Test',
      position: { isoX: 0, isoY: 0 },
      visible: false,
      opacity: 0.0
    }
    expect(bubble1.opacity).toBe(0.0)

    const bubble2: SpeechBubble = {
      agentId: 'agent-2',
      text: 'Test',
      position: { isoX: 0, isoY: 0 },
      visible: true,
      opacity: 0.5
    }
    expect(bubble2.opacity).toBe(0.5)

    const bubble3: SpeechBubble = {
      agentId: 'agent-3',
      text: 'Test',
      position: { isoX: 0, isoY: 0 },
      visible: true,
      opacity: 1.0
    }
    expect(bubble3.opacity).toBe(1.0)
  })

  it('should allow empty text', () => {
    const bubble: SpeechBubble = {
      agentId: 'agent-1',
      text: '',
      position: { isoX: 0, isoY: 0 },
      visible: true,
      opacity: 1.0
    }
    expect(bubble.text).toBe('')
  })

  it('should support multi-line text with newlines', () => {
    const bubble: SpeechBubble = {
      agentId: 'agent-1',
      text: 'Line 1\nLine 2\nLine 3',
      position: { isoX: 0, isoY: 0 },
      visible: true,
      opacity: 1.0
    }
    expect(bubble.text).toContain('\n')
    expect(bubble.text.split('\n').length).toBe(3)
  })

  it('should allow negative isometric positions', () => {
    const bubble: SpeechBubble = {
      agentId: 'agent-1',
      text: 'Test',
      position: { isoX: -50, isoY: -100 },
      visible: true,
      opacity: 1.0
    }
    expect(bubble.position.isoX).toBe(-50)
    expect(bubble.position.isoY).toBe(-100)
  })

  it('should handle invisible bubbles with 0 opacity', () => {
    const bubble: SpeechBubble = {
      agentId: 'agent-1',
      text: 'Hidden',
      position: { isoX: 0, isoY: 0 },
      visible: false,
      opacity: 0.0
    }
    expect(bubble.visible).toBe(false)
    expect(bubble.opacity).toBe(0.0)
  })

  it('should support long text content', () => {
    const longText = 'This is a very long text that should be truncated to max 3 lines. '.repeat(10)
    const bubble: SpeechBubble = {
      agentId: 'agent-1',
      text: longText,
      position: { isoX: 0, isoY: 0 },
      visible: true,
      opacity: 1.0
    }
    expect(bubble.text.length).toBeGreaterThan(100)
  })
})

describe('SpeechBubble - Collection Management', () => {
  it('should allow multiple bubbles for different agents', () => {
    const bubbles: SpeechBubble[] = [
      {
        agentId: 'agent-1',
        text: 'Agent 1 speaking',
        position: { isoX: 100, isoY: 100 },
        visible: true,
        opacity: 1.0
      },
      {
        agentId: 'agent-2',
        text: 'Agent 2 speaking',
        position: { isoX: 200, isoY: 200 },
        visible: true,
        opacity: 1.0
      }
    ]

    expect(bubbles.length).toBe(2)
    expect(bubbles[0].agentId).toBe('agent-1')
    expect(bubbles[1].agentId).toBe('agent-2')
  })

  it('should find bubble by agentId', () => {
    const bubbles: SpeechBubble[] = [
      {
        agentId: 'agent-1',
        text: 'Text 1',
        position: { isoX: 0, isoY: 0 },
        visible: true,
        opacity: 1.0
      },
      {
        agentId: 'agent-2',
        text: 'Text 2',
        position: { isoX: 0, isoY: 0 },
        visible: true,
        opacity: 1.0
      }
    ]

    const found = bubbles.find(b => b.agentId === 'agent-2')
    expect(found).toBeDefined()
    expect(found?.text).toBe('Text 2')
  })

  it('should filter visible bubbles', () => {
    const bubbles: SpeechBubble[] = [
      {
        agentId: 'agent-1',
        text: 'Visible',
        position: { isoX: 0, isoY: 0 },
        visible: true,
        opacity: 1.0
      },
      {
        agentId: 'agent-2',
        text: 'Hidden',
        position: { isoX: 0, isoY: 0 },
        visible: false,
        opacity: 0.0
      }
    ]

    const visible = bubbles.filter(b => b.visible)
    expect(visible.length).toBe(1)
    expect(visible[0].agentId).toBe('agent-1')
  })
})
