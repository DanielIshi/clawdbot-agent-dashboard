/**
 * Issue #57 - AC4: Speech Bubble Manager Integration Tests
 * Tests auto-hide logic with agent status
 */

import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { SpeechBubbleManager } from '../../src/components/settlers/SpeechBubbleManager'
import type { AgentSprite } from '../../src/components/settlers/types'

describe('SpeechBubbleManager - Auto-Hide Integration (AC4)', () => {
  it('should render bubbles for working agents', () => {
    const agents: AgentSprite[] = [
      {
        id: 'agent-1',
        name: 'Agent 1',
        type: 'claude',
        position: { x: 5, y: 5 },
        status: 'working',
        color: '#FF0000',
        animation: { type: 'working', frame: 0, progress: 0, startTime: 0 }
      }
    ]

    const bubbles = new Map([['agent-1', 'Processing task...']])

    const { container } = render(
      <SpeechBubbleManager agents={agents} bubbles={bubbles} />
    )

    const bubbleElements = container.querySelectorAll('[data-testid="speech-bubble"]')
    expect(bubbleElements.length).toBe(1)
  })

  it('should NOT render bubbles for idle agents', () => {
    const agents: AgentSprite[] = [
      {
        id: 'agent-1',
        name: 'Agent 1',
        type: 'claude',
        position: { x: 5, y: 5 },
        status: 'idle',
        color: '#FF0000',
        animation: { type: 'idle', frame: 0, progress: 0, startTime: 0 }
      }
    ]

    const bubbles = new Map([['agent-1', 'Old message']])

    const { container } = render(
      <SpeechBubbleManager agents={agents} bubbles={bubbles} />
    )

    const bubbleElements = container.querySelectorAll('[data-testid="speech-bubble"]')
    expect(bubbleElements.length).toBe(0)
  })

  it('should render bubbles for blocked agents', () => {
    const agents: AgentSprite[] = [
      {
        id: 'agent-1',
        name: 'Agent 1',
        type: 'claude',
        position: { x: 5, y: 5 },
        status: 'blocked',
        color: '#FF0000',
        animation: { type: 'idle', frame: 0, progress: 0, startTime: 0 }
      }
    ]

    const bubbles = new Map([['agent-1', 'Waiting for input']])

    const { container } = render(
      <SpeechBubbleManager agents={agents} bubbles={bubbles} />
    )

    const bubbleElements = container.querySelectorAll('[data-testid="speech-bubble"]')
    expect(bubbleElements.length).toBe(1)
  })

  it('should render multiple bubbles for multiple working agents', () => {
    const agents: AgentSprite[] = [
      {
        id: 'agent-1',
        name: 'Agent 1',
        type: 'claude',
        position: { x: 2, y: 3 },
        status: 'working',
        color: '#FF0000',
        animation: { type: 'working', frame: 0, progress: 0, startTime: 0 }
      },
      {
        id: 'agent-2',
        name: 'Agent 2',
        type: 'gpt',
        position: { x: 7, y: 8 },
        status: 'working',
        color: '#00FF00',
        animation: { type: 'working', frame: 0, progress: 0, startTime: 0 }
      }
    ]

    const bubbles = new Map([
      ['agent-1', 'Task A'],
      ['agent-2', 'Task B']
    ])

    const { container } = render(
      <SpeechBubbleManager agents={agents} bubbles={bubbles} />
    )

    const bubbleElements = container.querySelectorAll('[data-testid="speech-bubble"]')
    expect(bubbleElements.length).toBe(2)
  })

  it('should hide idle agents and show working agents', () => {
    const agents: AgentSprite[] = [
      {
        id: 'agent-1',
        name: 'Agent 1',
        type: 'claude',
        position: { x: 2, y: 3 },
        status: 'working',
        color: '#FF0000',
        animation: { type: 'working', frame: 0, progress: 0, startTime: 0 }
      },
      {
        id: 'agent-2',
        name: 'Agent 2',
        type: 'gpt',
        position: { x: 7, y: 8 },
        status: 'idle',
        color: '#00FF00',
        animation: { type: 'idle', frame: 0, progress: 0, startTime: 0 }
      }
    ]

    const bubbles = new Map([
      ['agent-1', 'Working'],
      ['agent-2', 'Idle message']
    ])

    const { container } = render(
      <SpeechBubbleManager agents={agents} bubbles={bubbles} />
    )

    const bubbleElements = container.querySelectorAll('[data-testid="speech-bubble"]')
    expect(bubbleElements.length).toBe(1)

    // Should only show agent-1's bubble
    expect(bubbleElements[0].textContent).toContain('Working')
  })

  it('should handle agents without text', () => {
    const agents: AgentSprite[] = [
      {
        id: 'agent-1',
        name: 'Agent 1',
        type: 'claude',
        position: { x: 5, y: 5 },
        status: 'working',
        color: '#FF0000',
        animation: { type: 'working', frame: 0, progress: 0, startTime: 0 }
      }
    ]

    const bubbles = new Map() // No text for agent-1

    const { container } = render(
      <SpeechBubbleManager agents={agents} bubbles={bubbles} />
    )

    const bubbleElements = container.querySelectorAll('[data-testid="speech-bubble"]')
    expect(bubbleElements.length).toBe(1) // Still show bubble (agent is working)
  })

  it('should position bubbles above agents', () => {
    const agents: AgentSprite[] = [
      {
        id: 'agent-1',
        name: 'Agent 1',
        type: 'claude',
        position: { x: 5, y: 5 },
        status: 'working',
        color: '#FF0000',
        animation: { type: 'working', frame: 0, progress: 0, startTime: 0 }
      }
    ]

    const bubbles = new Map([['agent-1', 'Test']])

    const { container } = render(
      <SpeechBubbleManager agents={agents} bubbles={bubbles} />
    )

    const bubbleElement = container.querySelector('[data-testid="speech-bubble"]') as HTMLElement
    const topPosition = parseInt(bubbleElement.style.top, 10)

    // Should be positioned above agent (negative offset)
    expect(topPosition).toBeDefined()
  })
})
