import { describe, it, expect, beforeEach } from 'vitest'
import {
  createInitialState,
  createAgent,
  createIssue,
  processAgentAssigned,
  processEvent,
  StateError,
} from './agentStateMachine'
import {
  DashboardState,
  AgentAssignedEvent,
} from './types'

/**
 * Test: Agent startet Arbeit (Idle→Working)
 * Issue #27 - Dev/QA Spec Testfall 1
 *
 * GIVEN ein Agent ist Idle
 * AND ein Issue befindet sich im Status Development
 * WHEN agent.assigned Event empfangen wird
 * THEN Agent wechselt in Status Working
 * AND Agent wird genau diesem Issue zugeordnet
 */

describe('Agent startet Arbeit (Idle→Working)', () => {
  let state: DashboardState
  const agentId = 'agent-001'
  const issueId = 'issue-42'
  const timestamp = new Date().toISOString()

  // Test-Fixture erstellt Agent mit Status idle
  // Test-Fixture erstellt Issue mit Status development
  beforeEach(() => {
    state = createInitialState()

    // Agent mit Status idle
    const agent = createAgent(agentId, 'Test Agent', 'idle')
    state.agents.set(agentId, agent)

    // Issue mit Status development
    const issue = createIssue(issueId, 42, 'Test Issue', 'development')
    state.issues.set(issueId, issue)
  })

  // Initiale State-Assertions
  it('Setup: Agent ist idle und kein Issue zugeordnet', () => {
    const agent = state.agents.get(agentId)!

    expect(agent).toBeDefined()
    expect(agent.status).toBe('idle')
    expect(agent.currentIssueId).toBeNull()
  })

  it('Setup: Issue ist in development und kein Agent zugeordnet', () => {
    const issue = state.issues.get(issueId)!

    expect(issue).toBeDefined()
    expect(issue.status).toBe('development')
    expect(issue.assignedAgentId).toBeNull()
  })

  describe('Event-Verarbeitung', () => {
    it('agent.assigned Event wird ohne Fehler verarbeitet', () => {
      const event: AgentAssignedEvent = {
        type: 'agent.assigned',
        timestamp,
        seq: 1,
        payload: {
          agent_id: agentId,
          issue_id: issueId,
        },
      }

      // Should not throw
      expect(() => processAgentAssigned(state, event)).not.toThrow()
    })

    it('Event wird mit korrekter Payload verarbeitet', () => {
      const event: AgentAssignedEvent = {
        type: 'agent.assigned',
        timestamp,
        seq: 1,
        payload: {
          agent_id: agentId,
          issue_id: issueId,
        },
      }

      const newState = processEvent(state, event)

      // Event wurde zum Log hinzugefügt
      expect(newState.eventLog).toHaveLength(1)
      expect(newState.eventLog[0]).toEqual(event)
      expect(newState.lastSeq).toBe(1)
    })
  })

  describe('State-Transitions', () => {
    const createAssignEvent = (): AgentAssignedEvent => ({
      type: 'agent.assigned',
      timestamp,
      seq: 1,
      payload: {
        agent_id: agentId,
        issue_id: issueId,
      },
    })

    it('Agent-Status wechselt von idle → working', () => {
      const event = createAssignEvent()
      const newState = processAgentAssigned(state, event)

      const agent = newState.agents.get(agentId)!
      expect(agent.status).toBe('working')
    })

    it('Agent.currentIssueId === Event.issue_id', () => {
      const event = createAssignEvent()
      const newState = processAgentAssigned(state, event)

      const agent = newState.agents.get(agentId)!
      expect(agent.currentIssueId).toBe(issueId)
    })

    it('Issue.assignedAgentId === Event.agent_id', () => {
      const event = createAssignEvent()
      const newState = processAgentAssigned(state, event)

      const issue = newState.issues.get(issueId)!
      expect(issue.assignedAgentId).toBe(agentId)
    })

    it('Timestamp der Zuweisung wird gespeichert', () => {
      const event = createAssignEvent()
      const newState = processAgentAssigned(state, event)

      const agent = newState.agents.get(agentId)!
      expect(agent.lastStatusChange).toBe(timestamp)
    })
  })

  describe('Negative Tests', () => {
    it('Agent bereits working + neues assigned Event → Fehler', () => {
      // Agent auf working setzen
      const workingAgent = createAgent(agentId, 'Test Agent', 'working')
      workingAgent.currentIssueId = 'other-issue'
      state.agents.set(agentId, workingAgent)

      const event: AgentAssignedEvent = {
        type: 'agent.assigned',
        timestamp,
        payload: {
          agent_id: agentId,
          issue_id: issueId,
        },
      }

      expect(() => processAgentAssigned(state, event)).toThrow(StateError)
      expect(() => processAgentAssigned(state, event)).toThrow(/is working/)
    })

    it('Issue nicht im Status development → Fehler', () => {
      // Issue auf backlog setzen
      const backlogIssue = createIssue(issueId, 42, 'Test Issue', 'backlog')
      state.issues.set(issueId, backlogIssue)

      const event: AgentAssignedEvent = {
        type: 'agent.assigned',
        timestamp,
        payload: {
          agent_id: agentId,
          issue_id: issueId,
        },
      }

      expect(() => processAgentAssigned(state, event)).toThrow(StateError)
      expect(() => processAgentAssigned(state, event)).toThrow(
        /must be in development/
      )
    })

    it('Event mit ungültiger Agent-ID → Graceful Error', () => {
      const event: AgentAssignedEvent = {
        type: 'agent.assigned',
        timestamp,
        payload: {
          agent_id: 'non-existent-agent',
          issue_id: issueId,
        },
      }

      expect(() => processAgentAssigned(state, event)).toThrow(StateError)
      expect(() => processAgentAssigned(state, event)).toThrow(/not found/)
    })

    it('Event mit ungültiger Issue-ID → Graceful Error', () => {
      const event: AgentAssignedEvent = {
        type: 'agent.assigned',
        timestamp,
        payload: {
          agent_id: agentId,
          issue_id: 'non-existent-issue',
        },
      }

      expect(() => processAgentAssigned(state, event)).toThrow(StateError)
      expect(() => processAgentAssigned(state, event)).toThrow(/not found/)
    })

    it('Issue bereits einem anderen Agent zugeordnet → Fehler', () => {
      // Issue anderem Agent zuordnen
      const issue = state.issues.get(issueId)!
      issue.assignedAgentId = 'other-agent'
      state.issues.set(issueId, issue)

      const event: AgentAssignedEvent = {
        type: 'agent.assigned',
        timestamp,
        payload: {
          agent_id: agentId,
          issue_id: issueId,
        },
      }

      expect(() => processAgentAssigned(state, event)).toThrow(StateError)
      expect(() => processAgentAssigned(state, event)).toThrow(/already assigned/)
    })
  })

  describe('State Immutability', () => {
    it('Original state bleibt unverändert nach Event', () => {
      const originalAgent = state.agents.get(agentId)!
      const originalIssue = state.issues.get(issueId)!

      const event: AgentAssignedEvent = {
        type: 'agent.assigned',
        timestamp,
        payload: {
          agent_id: agentId,
          issue_id: issueId,
        },
      }

      processAgentAssigned(state, event)

      // Original state unchanged
      expect(state.agents.get(agentId)!.status).toBe('idle')
      expect(state.agents.get(agentId)!.currentIssueId).toBeNull()
      expect(state.issues.get(issueId)!.assignedAgentId).toBeNull()

      // Referenzen unverändert
      expect(state.agents.get(agentId)).toBe(originalAgent)
      expect(state.issues.get(issueId)).toBe(originalIssue)
    })
  })

  describe('Test-Qualität', () => {
    it('Test ist deterministisch - mehrfache Ausführung gleiche Ergebnisse', () => {
      const results: boolean[] = []

      for (let i = 0; i < 5; i++) {
        const testState = createInitialState()
        testState.agents.set(agentId, createAgent(agentId, 'Test', 'idle'))
        testState.issues.set(issueId, createIssue(issueId, 42, 'Test', 'development'))

        const event: AgentAssignedEvent = {
          type: 'agent.assigned',
          timestamp: new Date().toISOString(),
          payload: { agent_id: agentId, issue_id: issueId },
        }

        const newState = processAgentAssigned(testState, event)
        results.push(newState.agents.get(agentId)!.status === 'working')
      }

      // Alle Durchläufe haben gleiches Ergebnis
      expect(results.every((r) => r === true)).toBe(true)
    })

    it('Test läuft isoliert - keine geteilten Abhängigkeiten', () => {
      // Frischer State für jeden Test
      const state1 = createInitialState()
      const state2 = createInitialState()

      state1.agents.set('a1', createAgent('a1', 'Agent 1', 'idle'))
      state2.agents.set('a2', createAgent('a2', 'Agent 2', 'idle'))

      // States sind unabhängig
      expect(state1.agents.has('a2')).toBe(false)
      expect(state2.agents.has('a1')).toBe(false)
    })
  })
})
