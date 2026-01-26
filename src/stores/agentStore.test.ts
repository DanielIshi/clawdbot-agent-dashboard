/**
 * Tests für Agent Store (Issue #19)
 * Akzeptanzkriterien:
 * - [x] Status-Badges (farbcodiert)
 * - [x] Aktuelles Issue anzeigen
 * - [x] Real-time Updates
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { useAgentStore, selectIdleAgents, selectWorkingAgents, selectBlockedAgents } from './agentStore'
import type { Agent } from '../types/agent'

describe('Agent Store (Issue #19)', () => {
  beforeEach(() => {
    useAgentStore.getState().clearAgents()
  })

  const createMockAgent = (id: string, status: 'idle' | 'working' | 'blocked' = 'idle'): Agent => ({
    id,
    name: `Agent ${id}`,
    status,
    currentIssueId: status === 'working' ? 'issue-1' : null,
    blockReason: status === 'blocked' ? 'Test block' : null,
    lastActivity: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  })

  describe('CRUD Operations', () => {
    it('sollte Agent hinzufügen', () => {
      const agent = createMockAgent('agent-1')
      useAgentStore.getState().upsertAgent(agent)

      expect(useAgentStore.getState().agents.size).toBe(1)
      expect(useAgentStore.getState().getAgent('agent-1')).toEqual(agent)
    })

    it('sollte mehrere Agents setzen', () => {
      const agents = [
        createMockAgent('agent-1'),
        createMockAgent('agent-2'),
        createMockAgent('agent-3')
      ]
      useAgentStore.getState().setAgents(agents)

      expect(useAgentStore.getState().agents.size).toBe(3)
    })

    it('sollte Agent entfernen', () => {
      useAgentStore.getState().upsertAgent(createMockAgent('agent-1'))
      useAgentStore.getState().removeAgent('agent-1')

      expect(useAgentStore.getState().agents.size).toBe(0)
    })

    it('sollte alle Agents löschen', () => {
      useAgentStore.getState().setAgents([
        createMockAgent('agent-1'),
        createMockAgent('agent-2')
      ])
      useAgentStore.getState().clearAgents()

      expect(useAgentStore.getState().agents.size).toBe(0)
    })
  })

  describe('Status Updates', () => {
    it('sollte Agent-Status aktualisieren', () => {
      useAgentStore.getState().upsertAgent(createMockAgent('agent-1', 'idle'))
      useAgentStore.getState().updateAgentStatus('agent-1', 'working')

      const agent = useAgentStore.getState().getAgent('agent-1')
      expect(agent?.status).toBe('working')
    })

    it('sollte Block-Reason bei blocked setzen', () => {
      useAgentStore.getState().upsertAgent(createMockAgent('agent-1', 'working'))
      useAgentStore.getState().updateAgentStatus('agent-1', 'blocked', 'API timeout')

      const agent = useAgentStore.getState().getAgent('agent-1')
      expect(agent?.status).toBe('blocked')
      expect(agent?.blockReason).toBe('API timeout')
    })

    it('sollte Block-Reason bei nicht-blocked löschen', () => {
      const blockedAgent = createMockAgent('agent-1', 'blocked')
      useAgentStore.getState().upsertAgent(blockedAgent)
      useAgentStore.getState().updateAgentStatus('agent-1', 'working')

      const agent = useAgentStore.getState().getAgent('agent-1')
      expect(agent?.blockReason).toBeNull()
    })
  })

  describe('Issue Assignment', () => {
    it('sollte Issue zu Agent zuweisen', () => {
      useAgentStore.getState().upsertAgent(createMockAgent('agent-1'))
      useAgentStore.getState().assignIssueToAgent('agent-1', 'issue-123')

      const agent = useAgentStore.getState().getAgent('agent-1')
      expect(agent?.currentIssueId).toBe('issue-123')
    })

    it('sollte Issue von Agent entfernen', () => {
      const agent = createMockAgent('agent-1', 'working')
      agent.currentIssueId = 'issue-123'
      useAgentStore.getState().upsertAgent(agent)

      useAgentStore.getState().unassignIssueFromAgent('agent-1')

      expect(useAgentStore.getState().getAgent('agent-1')?.currentIssueId).toBeNull()
    })
  })

  describe('Selectors', () => {
    beforeEach(() => {
      useAgentStore.getState().setAgents([
        createMockAgent('agent-1', 'idle'),
        createMockAgent('agent-2', 'working'),
        createMockAgent('agent-3', 'blocked'),
        createMockAgent('agent-4', 'idle')
      ])
    })

    it('sollte idle Agents filtern', () => {
      const state = useAgentStore.getState()
      const idle = selectIdleAgents(state)
      expect(idle.length).toBe(2)
      expect(idle.every(a => a.status === 'idle')).toBe(true)
    })

    it('sollte working Agents filtern', () => {
      const state = useAgentStore.getState()
      const working = selectWorkingAgents(state)
      expect(working.length).toBe(1)
      expect(working[0].status).toBe('working')
    })

    it('sollte blocked Agents filtern', () => {
      const state = useAgentStore.getState()
      const blocked = selectBlockedAgents(state)
      expect(blocked.length).toBe(1)
      expect(blocked[0].status).toBe('blocked')
    })

    it('sollte Agents nach Status gruppieren', () => {
      const state = useAgentStore.getState()
      const byStatus = state.getAgentsByStatus('idle')
      expect(byStatus.length).toBe(2)
    })

    it('sollte alle Agents zurückgeben', () => {
      const state = useAgentStore.getState()
      const all = state.getAllAgents()
      expect(all.length).toBe(4)
    })
  })

  describe('Selection', () => {
    it('sollte Agent auswählen', () => {
      useAgentStore.getState().upsertAgent(createMockAgent('agent-1'))
      useAgentStore.getState().selectAgent('agent-1')

      expect(useAgentStore.getState().selectedAgentId).toBe('agent-1')
    })

    it('sollte Auswahl aufheben', () => {
      useAgentStore.getState().selectAgent('agent-1')
      useAgentStore.getState().selectAgent(null)

      expect(useAgentStore.getState().selectedAgentId).toBeNull()
    })
  })
})
