/**
 * Tests für AgentSprite
 * Issue #55, AC1: Agent-Sprite-Datenstruktur
 */

import { describe, it, expect } from 'vitest'
import type { AgentSprite, AgentType, AgentStatus } from '../../src/components/settlers/types'

describe('AgentSprite Datenstruktur (AC1)', () => {
  describe('AgentSprite Properties', () => {
    it('sollte alle erforderlichen Properties haben', () => {
      const sprite: AgentSprite = {
        id: 'agent-1',
        name: 'Test Agent',
        type: 'codex',
        position: { x: 5, y: 3 },
        status: 'idle',
        color: '#4b8bff',
        animation: {
          type: 'idle',
          frame: 0,
          progress: 0,
          startTime: Date.now()
        }
      }

      expect(sprite).toHaveProperty('id')
      expect(sprite).toHaveProperty('name')
      expect(sprite).toHaveProperty('type')
      expect(sprite).toHaveProperty('position')
      expect(sprite).toHaveProperty('status')
      expect(sprite).toHaveProperty('color')
      expect(sprite).toHaveProperty('animation')
    })

    it('sollte korrekte Agent-Typen unterstützen', () => {
      const types: AgentType[] = ['codex', 'claude', 'gpt', 'ollama']

      types.forEach(type => {
        const sprite: AgentSprite = {
          id: `agent-${type}`,
          name: `${type} agent`,
          type,
          position: { x: 0, y: 0 },
          status: 'idle',
          color: '#000000',
          animation: {
            type: 'idle',
            frame: 0,
            progress: 0,
            startTime: Date.now()
          }
        }

        expect(sprite.type).toBe(type)
      })
    })

    it('sollte korrekte Status-Werte unterstützen', () => {
      const statuses: AgentStatus[] = ['idle', 'working', 'blocked']

      statuses.forEach(status => {
        const sprite: AgentSprite = {
          id: 'agent-1',
          name: 'Test',
          type: 'codex',
          position: { x: 0, y: 0 },
          status,
          color: '#000000',
          animation: {
            type: 'idle',
            frame: 0,
            progress: 0,
            startTime: Date.now()
          }
        }

        expect(sprite.status).toBe(status)
      })
    })

    it('sollte Grid-Koordinaten (x, y) in position haben', () => {
      const sprite: AgentSprite = {
        id: 'agent-1',
        name: 'Test',
        type: 'codex',
        position: { x: 7, y: 4 },
        status: 'idle',
        color: '#4b8bff',
        animation: {
          type: 'idle',
          frame: 0,
          progress: 0,
          startTime: Date.now()
        }
      }

      expect(sprite.position).toHaveProperty('x')
      expect(sprite.position).toHaveProperty('y')
      expect(sprite.position.x).toBe(7)
      expect(sprite.position.y).toBe(4)
    })

    it('sollte Animation-State haben', () => {
      const sprite: AgentSprite = {
        id: 'agent-1',
        name: 'Test',
        type: 'codex',
        position: { x: 0, y: 0 },
        status: 'working',
        color: '#4b8bff',
        animation: {
          type: 'working',
          frame: 5,
          progress: 0.5,
          startTime: Date.now()
        }
      }

      expect(sprite.animation.type).toBe('working')
      expect(sprite.animation.frame).toBe(5)
      expect(sprite.animation.progress).toBe(0.5)
      expect(sprite.animation.startTime).toBeGreaterThan(0)
    })

    it('sollte Animation-Typen: walking | working | waiting unterstützen', () => {
      const animationTypes = ['idle', 'working', 'walking'] as const

      animationTypes.forEach(animType => {
        const sprite: AgentSprite = {
          id: 'agent-1',
          name: 'Test',
          type: 'codex',
          position: { x: 0, y: 0 },
          status: 'idle',
          color: '#4b8bff',
          animation: {
            type: animType,
            frame: 0,
            progress: 0,
            startTime: Date.now()
          }
        }

        expect(sprite.animation.type).toBe(animType)
      })
    })
  })
})
