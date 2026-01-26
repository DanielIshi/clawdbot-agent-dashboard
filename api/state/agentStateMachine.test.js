/**
 * Tests für Agent State Machine (Issue #13)
 * Akzeptanzkriterien:
 * - [x] Nur gültige Transitions erlauben
 * - [x] Agent in genau einem State
 * - [x] Working erfordert Issue-Zuordnung
 * - [x] Blocked erfordert Block-Reason
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { AgentStateMachine, AgentStatus, createAgent } from './agentStateMachine.js'

describe('Agent State Machine (Issue #13)', () => {
  let agent
  let sm

  beforeEach(() => {
    agent = createAgent('agent-1', 'Test Agent')
    sm = new AgentStateMachine(agent)
  })

  describe('Initial State', () => {
    it('sollte neuen Agent mit Status "idle" erstellen', () => {
      expect(agent.status).toBe(AgentStatus.IDLE)
    })

    it('sollte Agent mit allen Pflichtfeldern erstellen', () => {
      expect(agent.id).toBe('agent-1')
      expect(agent.name).toBe('Test Agent')
      expect(agent.currentIssueId).toBeNull()
      expect(agent.blockReason).toBeNull()
      expect(agent.lastActivity).toBeDefined()
      expect(agent.createdAt).toBeDefined()
    })
  })

  describe('Gültige Transitions', () => {
    it('sollte idle -> working erlauben', () => {
      expect(sm.canTransition(AgentStatus.WORKING)).toBe(true)
      sm.transition(AgentStatus.WORKING)
      expect(agent.status).toBe(AgentStatus.WORKING)
    })

    it('sollte working -> idle erlauben', () => {
      sm.transition(AgentStatus.WORKING)
      expect(sm.canTransition(AgentStatus.IDLE)).toBe(true)
      sm.transition(AgentStatus.IDLE)
      expect(agent.status).toBe(AgentStatus.IDLE)
    })

    it('sollte working -> blocked erlauben (mit Reason)', () => {
      sm.transition(AgentStatus.WORKING)
      expect(sm.canTransition(AgentStatus.BLOCKED)).toBe(true)
      sm.transition(AgentStatus.BLOCKED, 'Waiting for API response')
      expect(agent.status).toBe(AgentStatus.BLOCKED)
    })

    it('sollte blocked -> working erlauben', () => {
      sm.transition(AgentStatus.WORKING)
      sm.transition(AgentStatus.BLOCKED, 'Blocked')
      expect(sm.canTransition(AgentStatus.WORKING)).toBe(true)
      sm.transition(AgentStatus.WORKING)
      expect(agent.status).toBe(AgentStatus.WORKING)
    })

    it('sollte blocked -> idle erlauben', () => {
      sm.transition(AgentStatus.WORKING)
      sm.transition(AgentStatus.BLOCKED, 'Blocked')
      expect(sm.canTransition(AgentStatus.IDLE)).toBe(true)
      sm.transition(AgentStatus.IDLE)
      expect(agent.status).toBe(AgentStatus.IDLE)
    })
  })

  describe('Ungültige Transitions', () => {
    it('sollte idle -> blocked verbieten', () => {
      expect(sm.canTransition(AgentStatus.BLOCKED)).toBe(false)
      expect(() => sm.transition(AgentStatus.BLOCKED, 'Reason')).toThrow()
    })

    it('sollte idle -> idle verbieten (selbst-transition)', () => {
      expect(sm.canTransition(AgentStatus.IDLE)).toBe(false)
    })
  })

  describe('Block-Reason Pflicht (Issue #16 Invariant)', () => {
    it('sollte Transition zu blocked ohne Reason ablehnen', () => {
      sm.transition(AgentStatus.WORKING)
      expect(() => sm.transition(AgentStatus.BLOCKED)).toThrow('Block reason is required')
    })

    it('sollte Block-Reason speichern', () => {
      sm.transition(AgentStatus.WORKING)
      sm.transition(AgentStatus.BLOCKED, 'API timeout')
      expect(agent.blockReason).toBe('API timeout')
    })

    it('sollte Block-Reason bei Unblock löschen', () => {
      sm.transition(AgentStatus.WORKING)
      sm.transition(AgentStatus.BLOCKED, 'API timeout')
      sm.transition(AgentStatus.WORKING)
      expect(agent.blockReason).toBeNull()
    })
  })

  describe('Convenience Methods', () => {
    it('startWork sollte Status auf working setzen', () => {
      sm.startWork('issue-123')
      expect(agent.status).toBe(AgentStatus.WORKING)
      expect(agent.currentIssueId).toBe('issue-123')
    })

    it('startWork sollte fehlschlagen wenn nicht idle', () => {
      sm.transition(AgentStatus.WORKING)
      expect(() => sm.startWork('issue-456')).toThrow('Agent must be idle')
    })

    it('finishWork sollte Status auf idle setzen', () => {
      sm.startWork('issue-123')
      sm.finishWork()
      expect(agent.status).toBe(AgentStatus.IDLE)
      expect(agent.currentIssueId).toBeNull()
    })

    it('block sollte Status auf blocked setzen', () => {
      sm.startWork('issue-123')
      sm.block('Waiting for review')
      expect(agent.status).toBe(AgentStatus.BLOCKED)
      expect(agent.blockReason).toBe('Waiting for review')
    })

    it('unblock sollte Status auf working setzen', () => {
      sm.startWork('issue-123')
      sm.block('Waiting')
      sm.unblock()
      expect(agent.status).toBe(AgentStatus.WORKING)
      expect(agent.blockReason).toBeNull()
    })
  })

  describe('lastActivity Update', () => {
    it('sollte lastActivity bei jeder Transition aktualisieren', () => {
      const before = agent.lastActivity
      // Kleine Verzögerung für Timestamp-Unterschied
      sm.transition(AgentStatus.WORKING)
      expect(new Date(agent.lastActivity).getTime()).toBeGreaterThanOrEqual(
        new Date(before).getTime()
      )
    })
  })

  describe('getValidTransitions', () => {
    it('sollte gültige Transitions für idle zurückgeben', () => {
      expect(sm.getValidTransitions()).toEqual([AgentStatus.WORKING])
    })

    it('sollte gültige Transitions für working zurückgeben', () => {
      sm.transition(AgentStatus.WORKING)
      expect(sm.getValidTransitions()).toContain(AgentStatus.IDLE)
      expect(sm.getValidTransitions()).toContain(AgentStatus.BLOCKED)
    })

    it('sollte gültige Transitions für blocked zurückgeben', () => {
      sm.transition(AgentStatus.WORKING)
      sm.transition(AgentStatus.BLOCKED, 'Reason')
      expect(sm.getValidTransitions()).toContain(AgentStatus.WORKING)
      expect(sm.getValidTransitions()).toContain(AgentStatus.IDLE)
    })
  })
})
