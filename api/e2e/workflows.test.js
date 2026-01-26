/**
 * E2E Workflow Tests (Issues #28-31)
 * Tests für komplexe Workflows und Event-Verarbeitung
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import express from 'express'
import { createServer } from 'http'
import { EventLog } from '../events/log.js'
import { createEventEnvelope, EventTypes } from '../events/envelope.js'
import { AgentStateMachine, createAgent } from '../state/agentStateMachine.js'
import { IssueStateMachine, createIssue, IssueState } from '../state/issueStateMachine.js'
import { validateAssignment, validateBlock } from '../state/invariants.js'

// In-memory state for tests
let state
let eventLog
let events

function resetState() {
  state = {
    agents: new Map(),
    issues: new Map()
  }
  events = []
  eventLog = {
    getNextSeq: () => events.length + 1,
    append: (event) => events.push(event),
    getEventsSince: (seq) => events.filter(e => e.seq > seq)
  }
}

// Helper to simulate event emission
function emitEvent(eventType, projectId, payload, { agentId, issueId } = {}) {
  const event = createEventEnvelope({
    event_type: eventType,
    project_id: projectId,
    agent_id: agentId,
    issue_id: issueId,
    payload,
    getNextSeq: () => eventLog.getNextSeq()
  })
  eventLog.append(event)
  return event
}

describe('E2E Workflow Tests', () => {
  beforeEach(() => {
    resetState()
  })

  describe('Issue Status Workflow (Issue #28)', () => {
    it('sollte Issue durch kompletten Workflow führen können', () => {
      // Create issue
      const issue = createIssue('issue-1', 1, 'Test Issue', 'project-1')
      state.issues.set(issue.id, issue)
      emitEvent(EventTypes.ISSUE_CREATED, 'project-1', { issue }, { issueId: issue.id })

      expect(issue.state).toBe(IssueState.BACKLOG)

      // Move through workflow
      const sm = new IssueStateMachine(issue)
      const workflow = [
        IssueState.ANALYSIS,
        IssueState.DEVELOPMENT,
        IssueState.TESTING,
        IssueState.REVIEW,
        IssueState.DONE
      ]

      workflow.forEach((targetState, index) => {
        const previousState = issue.state
        expect(sm.canTransition(targetState)).toBe(true)
        sm.transition(targetState)

        emitEvent(EventTypes.ISSUE_STATE_CHANGED, 'project-1', {
          previous_state: previousState,
          new_state: targetState,
          issue
        }, { issueId: issue.id })

        expect(issue.state).toBe(targetState)
      })

      // Should have created events for each transition + initial create
      expect(events.length).toBe(6)
      expect(events[0].event_type).toBe('issue.created')
      expect(events[5].event_type).toBe('issue.state_changed')
      expect(events[5].payload.new_state).toBe('done')
    })

    it('sollte ungültige State-Transitions ablehnen', () => {
      const issue = createIssue('issue-1', 1, 'Test', 'project-1')
      const sm = new IssueStateMachine(issue)

      // Cannot jump from backlog to done
      expect(sm.canTransition(IssueState.DONE)).toBe(false)

      // Cannot jump from backlog to testing
      expect(sm.canTransition(IssueState.TESTING)).toBe(false)

      // Can only go to analysis from backlog
      expect(sm.canTransition(IssueState.ANALYSIS)).toBe(true)
    })

    it('sollte Kanban-Column korrekt reflektieren', () => {
      const issue = createIssue('issue-1', 1, 'Test', 'project-1')
      const sm = new IssueStateMachine(issue)

      expect(sm.column).toBe('Backlog')

      sm.transition(IssueState.ANALYSIS)
      expect(sm.column).toBe('Analysis')

      sm.transition(IssueState.DEVELOPMENT)
      expect(sm.column).toBe('In Progress')

      sm.transition(IssueState.TESTING)
      expect(sm.column).toBe('Testing')

      sm.transition(IssueState.REVIEW)
      expect(sm.column).toBe('Review')

      sm.transition(IssueState.DONE)
      expect(sm.column).toBe('Done')
    })
  })

  describe('Agent + Issue Blockade (Issue #29)', () => {
    it('sollte Agent und Issue gleichzeitig blocken', () => {
      // Create agent and issue
      const agent = createAgent('agent-1', 'Test Agent')
      const issue = createIssue('issue-1', 1, 'Test Issue', 'project-1')
      state.agents.set(agent.id, agent)
      state.issues.set(issue.id, issue)

      // Assign issue to agent
      issue.assignedAgentId = agent.id
      agent.currentIssueId = issue.id

      const agentSm = new AgentStateMachine(agent)
      agentSm.transition('working')

      // Now block both
      const blockReason = 'Waiting for external API'

      // Block agent
      expect(agentSm.canTransition('blocked')).toBe(true)
      agentSm.transition('blocked', blockReason)

      emitEvent(EventTypes.AGENT_STATUS_CHANGED, 'project-1', {
        previous_status: 'working',
        new_status: 'blocked',
        reason: blockReason,
        agent
      }, { agentId: agent.id })

      // Block issue
      issue.isBlocked = true
      issue.blockReason = blockReason

      emitEvent(EventTypes.ISSUE_BLOCKED, 'project-1', {
        reason: blockReason,
        issue
      }, { issueId: issue.id })

      // Verify both are blocked
      expect(agent.status).toBe('blocked')
      expect(agent.blockReason).toBe(blockReason)
      expect(issue.isBlocked).toBe(true)
      expect(issue.blockReason).toBe(blockReason)

      // Verify events were created
      expect(events.length).toBe(2)
      expect(events[0].event_type).toBe('agent.status_changed')
      expect(events[0].payload.new_status).toBe('blocked')
      expect(events[1].event_type).toBe('issue.blocked')
    })

    it('sollte Block ohne Reason ablehnen (Invariant)', () => {
      const agent = createAgent('agent-1', 'Test Agent')
      const agentSm = new AgentStateMachine(agent)
      agentSm.transition('working')

      // Validate block without reason
      const validation = validateBlock(agent, null)
      expect(validation.valid).toBe(false)
      expect(validation.error.toLowerCase()).toContain('block reason')

      // Validate block with reason
      const validationWithReason = validateBlock(agent, 'Good reason')
      expect(validationWithReason.valid).toBe(true)
    })

    it('sollte Agent und Issue gleichzeitig unblocken', () => {
      const agent = createAgent('agent-1', 'Test Agent')
      const issue = createIssue('issue-1', 1, 'Test Issue', 'project-1')

      // Set up blocked state
      agent.status = 'blocked'
      agent.blockReason = 'API down'
      issue.isBlocked = true
      issue.blockReason = 'API down'
      issue.assignedAgentId = agent.id
      agent.currentIssueId = issue.id

      // Unblock agent
      const agentSm = new AgentStateMachine(agent)
      agentSm.transition('working')

      emitEvent(EventTypes.AGENT_STATUS_CHANGED, 'project-1', {
        previous_status: 'blocked',
        new_status: 'working',
        agent
      }, { agentId: agent.id })

      // Unblock issue
      const previousReason = issue.blockReason
      issue.isBlocked = false
      issue.blockReason = null

      emitEvent(EventTypes.ISSUE_UNBLOCKED, 'project-1', {
        previous_reason: previousReason,
        issue
      }, { issueId: issue.id })

      // Verify both unblocked
      expect(agent.status).toBe('working')
      expect(agent.blockReason).toBeNull()
      expect(issue.isBlocked).toBe(false)
      expect(issue.blockReason).toBeNull()
    })
  })

  describe('View-Konsistenz (Issue #30)', () => {
    it('sollte globale View konsistent mit Agent-Focus sein', () => {
      // Create multiple agents and issues
      const agents = [
        createAgent('agent-1', 'Agent Alpha'),
        createAgent('agent-2', 'Agent Beta'),
        createAgent('agent-3', 'Agent Gamma')
      ]

      const issues = [
        createIssue('issue-1', 1, 'Issue One', 'project-1'),
        createIssue('issue-2', 2, 'Issue Two', 'project-1'),
        createIssue('issue-3', 3, 'Issue Three', 'project-1')
      ]

      agents.forEach(a => state.agents.set(a.id, a))
      issues.forEach(i => state.issues.set(i.id, i))

      // Assign issues to agents
      issues[0].assignedAgentId = agents[0].id
      agents[0].currentIssueId = issues[0].id

      issues[1].assignedAgentId = agents[1].id
      agents[1].currentIssueId = issues[1].id

      // Issue 3 unassigned

      // Global view: all agents and issues
      const globalAgents = Array.from(state.agents.values())
      const globalIssues = Array.from(state.issues.values())

      expect(globalAgents.length).toBe(3)
      expect(globalIssues.length).toBe(3)

      // Agent-focus view for Agent Alpha
      const focusAgent = state.agents.get('agent-1')
      const focusIssue = focusAgent.currentIssueId
        ? state.issues.get(focusAgent.currentIssueId)
        : null

      expect(focusAgent.name).toBe('Agent Alpha')
      expect(focusIssue).not.toBeNull()
      expect(focusIssue.title).toBe('Issue One')

      // Verify assignment consistency
      const assignedIssues = globalIssues.filter(i => i.assignedAgentId)
      const busyAgents = globalAgents.filter(a => a.currentIssueId)

      expect(assignedIssues.length).toBe(busyAgents.length)

      // Each assigned issue should have a matching busy agent
      assignedIssues.forEach(issue => {
        const agent = state.agents.get(issue.assignedAgentId)
        expect(agent).toBeDefined()
        expect(agent.currentIssueId).toBe(issue.id)
      })
    })

    it('sollte nach Event-Update konsistent bleiben', () => {
      const agent = createAgent('agent-1', 'Test Agent')
      const issue = createIssue('issue-1', 1, 'Test Issue', 'project-1')
      state.agents.set(agent.id, agent)
      state.issues.set(issue.id, issue)

      // Initial state
      expect(agent.currentIssueId).toBeNull()
      expect(issue.assignedAgentId).toBeNull()

      // Assign via event simulation
      issue.assignedAgentId = agent.id
      agent.currentIssueId = issue.id

      emitEvent(EventTypes.ISSUE_ASSIGNED, 'project-1', {
        new_agent_id: agent.id,
        issue,
        agent
      }, { issueId: issue.id, agentId: agent.id })

      // Verify consistency
      const storedAgent = state.agents.get('agent-1')
      const storedIssue = state.issues.get('issue-1')

      expect(storedAgent.currentIssueId).toBe(storedIssue.id)
      expect(storedIssue.assignedAgentId).toBe(storedAgent.id)
    })
  })

  describe('Event-Stream Recovery (Issue #31)', () => {
    it('sollte nach Gap neue Events korrekt verarbeiten', () => {
      // Simulate initial events
      for (let i = 0; i < 5; i++) {
        const issue = createIssue(`issue-${i}`, i + 1, `Issue ${i}`, 'project-1')
        state.issues.set(issue.id, issue)
        emitEvent(EventTypes.ISSUE_CREATED, 'project-1', { issue }, { issueId: issue.id })
      }

      expect(events.length).toBe(5)

      // Simulate gap - client has only seq 3
      const clientLastSeq = 3

      // Get events since client's last seq
      const missedEvents = eventLog.getEventsSince(clientLastSeq)

      expect(missedEvents.length).toBe(2) // Events 4 and 5
      expect(missedEvents[0].seq).toBe(4)
      expect(missedEvents[1].seq).toBe(5)
    })

    it('sollte Replay-Events korrekt anwenden', () => {
      // Create initial events
      const issue1 = createIssue('issue-1', 1, 'Issue 1', 'project-1')
      const issue2 = createIssue('issue-2', 2, 'Issue 2', 'project-1')
      state.issues.set(issue1.id, issue1)
      state.issues.set(issue2.id, issue2)

      emitEvent(EventTypes.ISSUE_CREATED, 'project-1', { issue: issue1 }, { issueId: issue1.id })
      emitEvent(EventTypes.ISSUE_CREATED, 'project-1', { issue: issue2 }, { issueId: issue2.id })

      // Change state of issue1
      const sm = new IssueStateMachine(issue1)
      sm.transition(IssueState.ANALYSIS)
      emitEvent(EventTypes.ISSUE_STATE_CHANGED, 'project-1', {
        previous_state: 'backlog',
        new_state: 'analysis',
        issue: issue1
      }, { issueId: issue1.id })

      expect(events.length).toBe(3)

      // Simulate fresh client connecting - needs snapshot + replay
      const clientState = {
        agents: new Map(),
        issues: new Map()
      }

      // Apply snapshot (current state)
      clientState.issues.set(issue1.id, { ...issue1 })
      clientState.issues.set(issue2.id, { ...issue2 })

      // Verify client has correct state
      expect(clientState.issues.get('issue-1').state).toBe('analysis')
      expect(clientState.issues.get('issue-2').state).toBe('backlog')
    })

    it('sollte Duplikate bei Replay ignorieren (idempotent)', () => {
      const processedEventIds = new Set()
      let processedCount = 0

      function processEvent(event) {
        if (processedEventIds.has(event.event_id)) {
          return // Skip duplicate
        }
        processedEventIds.add(event.event_id)
        processedCount++
      }

      // Create events
      const issue = createIssue('issue-1', 1, 'Test', 'project-1')
      const event1 = emitEvent(EventTypes.ISSUE_CREATED, 'project-1', { issue }, { issueId: issue.id })
      const event2 = emitEvent(EventTypes.ISSUE_STATE_CHANGED, 'project-1', {
        previous_state: 'backlog',
        new_state: 'analysis'
      }, { issueId: issue.id })

      // Process events
      processEvent(event1)
      processEvent(event2)
      expect(processedCount).toBe(2)

      // Simulate replay - reprocess same events
      processEvent(event1)
      processEvent(event2)
      expect(processedCount).toBe(2) // Should not increase

      // New event should still be processed
      const event3 = emitEvent(EventTypes.ISSUE_STATE_CHANGED, 'project-1', {
        previous_state: 'analysis',
        new_state: 'development'
      }, { issueId: issue.id })

      processEvent(event3)
      expect(processedCount).toBe(3)
    })

    it('sollte Connection-State nach Reconnect wiederherstellen', () => {
      // Simulate server state
      const agent = createAgent('agent-1', 'Worker Bot')
      const issue = createIssue('issue-1', 1, 'Important Task', 'project-1')

      agent.status = 'working'
      agent.currentIssueId = issue.id
      issue.assignedAgentId = agent.id
      issue.state = 'development'

      state.agents.set(agent.id, agent)
      state.issues.set(issue.id, issue)

      // Client disconnects and reconnects
      // Server sends snapshot
      const snapshot = {
        agents: Array.from(state.agents.values()),
        issues: Array.from(state.issues.values()),
        currentSeq: events.length
      }

      // Client receives snapshot and rebuilds state
      const clientState = {
        agents: new Map(),
        issues: new Map()
      }

      snapshot.agents.forEach(a => clientState.agents.set(a.id, a))
      snapshot.issues.forEach(i => clientState.issues.set(i.id, i))

      // Verify client state matches server
      const clientAgent = clientState.agents.get('agent-1')
      const clientIssue = clientState.issues.get('issue-1')

      expect(clientAgent.status).toBe('working')
      expect(clientAgent.currentIssueId).toBe('issue-1')
      expect(clientIssue.state).toBe('development')
      expect(clientIssue.assignedAgentId).toBe('agent-1')
    })
  })
})
