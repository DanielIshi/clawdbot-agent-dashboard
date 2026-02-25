/**
 * Issue #57 - AC4: Auto-Hide bei Idle Tests
 * TDD-Approach: Tests ZUERST
 *
 * Requirements:
 * - Bubble verschwindet wenn Agent idle (500ms fade)
 * - Bubble bleibt sichtbar bei working/blocked
 * - DOM cleanup nach hide
 */

import { describe, it, expect } from 'vitest'
import { shouldShowBubble } from '../../src/components/settlers/speechBubbleLogic'
import type { AgentStatus } from '../../src/components/settlers/types'

describe('speechBubbleLogic - Auto-Hide bei Idle (AC4)', () => {
  it('should hide bubble when agent is idle and no text', () => {
    const status: AgentStatus = 'idle'
    const text = ''

    const result = shouldShowBubble(status, text)
    expect(result).toBe(false)
  })

  it('should show bubble when agent is working', () => {
    const status: AgentStatus = 'working'
    const text = 'Processing...'

    const result = shouldShowBubble(status, text)
    expect(result).toBe(true)
  })

  it('should show bubble when agent is blocked', () => {
    const status: AgentStatus = 'blocked'
    const text = 'Waiting for input'

    const result = shouldShowBubble(status, text)
    expect(result).toBe(true)
  })

  it('should hide bubble when agent becomes idle (working → idle)', () => {
    // First: working with text → show
    const statusWorking: AgentStatus = 'working'
    const text = 'Task complete'
    const resultWorking = shouldShowBubble(statusWorking, text)
    expect(resultWorking).toBe(true)

    // Then: idle with same text → hide
    const statusIdle: AgentStatus = 'idle'
    const resultIdle = shouldShowBubble(statusIdle, text)
    expect(resultIdle).toBe(false)
  })

  it('should show bubble when agent has text and is not idle', () => {
    const status: AgentStatus = 'working'
    const text = 'Current task'

    const result = shouldShowBubble(status, text)
    expect(result).toBe(true)
  })

  it('should hide bubble when agent is idle even with text', () => {
    const status: AgentStatus = 'idle'
    const text = 'Old message'

    const result = shouldShowBubble(status, text)
    expect(result).toBe(false)
  })

  it('should show bubble when agent transitions from idle to working', () => {
    // idle → should hide
    const statusIdle: AgentStatus = 'idle'
    const resultIdle = shouldShowBubble(statusIdle, '')
    expect(resultIdle).toBe(false)

    // working → should show
    const statusWorking: AgentStatus = 'working'
    const resultWorking = shouldShowBubble(statusWorking, 'New task')
    expect(resultWorking).toBe(true)
  })

  it('should handle blocked status (always show)', () => {
    const status: AgentStatus = 'blocked'
    const text = 'Blocked by dependency'

    const result = shouldShowBubble(status, text)
    expect(result).toBe(true)
  })

  it('should hide when idle and empty text', () => {
    const status: AgentStatus = 'idle'
    const text = ''

    const result = shouldShowBubble(status, text)
    expect(result).toBe(false)
  })

  it('should show when working and empty text (agent just started)', () => {
    const status: AgentStatus = 'working'
    const text = ''

    const result = shouldShowBubble(status, text)
    expect(result).toBe(true)
  })
})

describe('speechBubbleLogic - Edge Cases', () => {
  it('should handle whitespace-only text as empty', () => {
    const status: AgentStatus = 'idle'
    const text = '   \n  '

    const result = shouldShowBubble(status, text.trim())
    expect(result).toBe(false)
  })

  it('should show bubble when blocked even with empty text', () => {
    const status: AgentStatus = 'blocked'
    const text = ''

    const result = shouldShowBubble(status, text)
    expect(result).toBe(true)
  })
})
