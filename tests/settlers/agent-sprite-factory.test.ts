/**
 * Tests für Agent-Sprite Factory (API-Integration)
 * Issue #55, AC8: Agent-Sprite von API-Daten abgeleitet
 */

import { describe, it, expect } from 'vitest'
import type { AgentSprite } from '../../src/components/settlers/types'
import { createAgentSpriteFromApi, type ApiAgent } from '../../src/components/settlers/agentSpriteFactory'

describe('AC8: Agent-Sprite von API-Daten abgeleitet', () => {
  it('sollte Sprite-ID = Agent-ID setzen', () => {
    const apiAgent: ApiAgent = {
      id: 'agent-123',
      name: 'Coder',
      type: 'claude',
      status: 'working'
    }

    const sprite = createAgentSpriteFromApi(apiAgent)

    expect(sprite.id).toBe('agent-123')
  })

  it('sollte Sprite-Name = Agent-Name setzen', () => {
    const apiAgent: ApiAgent = {
      id: 'agent-1',
      name: 'Test Agent',
      type: 'codex',
      status: 'idle'
    }

    const sprite = createAgentSpriteFromApi(apiAgent)

    expect(sprite.name).toBe('Test Agent')
  })

  it('sollte Sprite-Type = Agent-Type setzen', () => {
    const types: Array<'codex' | 'claude' | 'gpt' | 'ollama'> = ['codex', 'claude', 'gpt', 'ollama']

    types.forEach(type => {
      const apiAgent: ApiAgent = {
        id: `agent-${type}`,
        name: 'Test',
        type,
        status: 'idle'
      }

      const sprite = createAgentSpriteFromApi(apiAgent)

      expect(sprite.type).toBe(type)
    })
  })

  it('sollte Sprite-Status = Agent-Status setzen', () => {
    const statuses: Array<'idle' | 'working' | 'blocked'> = ['idle', 'working', 'blocked']

    statuses.forEach(status => {
      const apiAgent: ApiAgent = {
        id: 'agent-1',
        name: 'Test',
        type: 'codex',
        status
      }

      const sprite = createAgentSpriteFromApi(apiAgent)

      expect(sprite.status).toBe(status)
    })
  })

  it('sollte Sprite-Color basierend auf Type setzen', () => {
    const colorMap = {
      codex: '#4b8bff',   // Blau
      claude: '#36c37c',  // Grün
      gpt: '#ff6b6b',     // Rot
      ollama: '#f4d03f'   // Gelb
    }

    Object.entries(colorMap).forEach(([type, expectedColor]) => {
      const apiAgent: ApiAgent = {
        id: 'agent-1',
        name: 'Test',
        type: type as 'codex' | 'claude' | 'gpt' | 'ollama',
        status: 'idle'
      }

      const sprite = createAgentSpriteFromApi(apiAgent)

      expect(sprite.color).toBe(expectedColor)
    })
  })

  it('sollte Animation-State basierend auf Status setzen', () => {
    const statusToAnimationMap = {
      idle: 'idle',
      working: 'working',
      blocked: 'idle'  // Blocked = idle Animation
    }

    Object.entries(statusToAnimationMap).forEach(([status, expectedAnimation]) => {
      const apiAgent: ApiAgent = {
        id: 'agent-1',
        name: 'Test',
        type: 'codex',
        status: status as 'idle' | 'working' | 'blocked'
      }

      const sprite = createAgentSpriteFromApi(apiAgent)

      expect(sprite.animation.type).toBe(expectedAnimation)
      expect(sprite.animation.frame).toBe(0)
      expect(sprite.animation.progress).toBe(0)
      expect(sprite.animation.startTime).toBeGreaterThan(0)
    })
  })

  it('sollte Default-Position setzen wenn keine currentIssueId', () => {
    const apiAgent: ApiAgent = {
      id: 'agent-1',
      name: 'Test',
      type: 'codex',
      status: 'idle'
    }

    const sprite = createAgentSpriteFromApi(apiAgent)

    // Default: Random Position oder (0, 0)
    expect(sprite.position).toHaveProperty('x')
    expect(sprite.position).toHaveProperty('y')
    expect(sprite.position.x).toBeGreaterThanOrEqual(0)
    expect(sprite.position.y).toBeGreaterThanOrEqual(0)
  })

  it('sollte AC8-Testfall erfüllen: API-Agent → Sprite-Mapping', () => {
    const apiAgent: ApiAgent = {
      id: 'agent-1',
      name: 'Coder',
      type: 'claude',
      status: 'working'
    }

    const sprite = createAgentSpriteFromApi(apiAgent)

    // AC8 Specs:
    expect(sprite.id).toBe('agent-1')            // Sprite-ID = Agent-ID
    expect(sprite.name).toBe('Coder')            // Sprite-Name = Agent-Name
    expect(sprite.type).toBe('claude')           // Sprite-Type = Agent-Type
    expect(sprite.color).toBe('#36c37c')         // Claude = Grün
    expect(sprite.status).toBe('working')        // Status mapped
    expect(sprite.animation.type).toBe('working') // Animation = Status-basiert
  })
})
