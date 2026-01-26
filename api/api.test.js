/**
 * API Integration Tests
 *
 * Tests für:
 * - Issue #6: issue.created
 * - Issue #7: issue.state_changed
 * - Issue #8: issue.blocked/unblocked
 * - Issue #10: agent.status_changed
 * - Issue #11: agent.assigned/unassigned
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import request from 'supertest'
import express from 'express'
import { EventLog } from './events/log.js'
import { createEventEnvelope, EventTypes } from './events/envelope.js'
import { createAgent, AgentStateMachine } from './state/agentStateMachine.js'
import { createIssue, IssueStateMachine } from './state/issueStateMachine.js'
import { validateAssignment, validateBlock } from './state/invariants.js'

// Create test app (simplified version of server.js)
function createTestApp() {
  const app = express()
  app.use(express.json())

  const eventLog = new EventLog(':memory:')
  const state = {
    agents: new Map(),
    issues: new Map()
  }

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

  // Health
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' })
  })

  // Agents
  app.get('/api/agents', (req, res) => {
    res.json(Array.from(state.agents.values()))
  })

  app.post('/api/agents', (req, res) => {
    const { id, name, projectId } = req.body
    if (!id || !name) {
      return res.status(400).json({ error: 'id and name required' })
    }
    if (state.agents.has(id)) {
      return res.status(409).json({ error: 'Agent already exists' })
    }

    const agent = createAgent(id, name)
    state.agents.set(id, agent)
    emitEvent(EventTypes.AGENT_STATUS_CHANGED, projectId || 'system', {
      previous_status: null,
      new_status: 'idle',
      agent
    }, { agentId: id })

    res.status(201).json(agent)
  })

  app.put('/api/agents/:id/status', (req, res) => {
    const { status, reason, projectId } = req.body
    const agent = state.agents.get(req.params.id)

    if (!agent) {
      return res.status(404).json({ error: 'Agent not found' })
    }

    const sm = new AgentStateMachine(agent)
    if (!sm.canTransition(status)) {
      return res.status(400).json({
        error: `Invalid transition from ${agent.status} to ${status}`
      })
    }

    if (status === 'blocked') {
      const blockValidation = validateBlock(agent, reason)
      if (!blockValidation.valid) {
        return res.status(400).json({ error: blockValidation.error })
      }
    }

    const previousStatus = agent.status
    sm.transition(status, reason)

    emitEvent(EventTypes.AGENT_STATUS_CHANGED, projectId || 'system', {
      previous_status: previousStatus,
      new_status: status,
      reason,
      agent: state.agents.get(req.params.id)
    }, { agentId: req.params.id })

    res.json(state.agents.get(req.params.id))
  })

  // Issues
  app.get('/api/issues', (req, res) => {
    res.json(Array.from(state.issues.values()))
  })

  app.post('/api/issues', (req, res) => {
    const { id, number, title, projectId, priority } = req.body
    if (!id || !number || !title || !projectId) {
      return res.status(400).json({ error: 'id, number, title, and projectId required' })
    }
    if (state.issues.has(id)) {
      return res.status(409).json({ error: 'Issue already exists' })
    }

    const issue = createIssue(id, number, title, projectId, priority)
    state.issues.set(id, issue)
    emitEvent(EventTypes.ISSUE_CREATED, projectId, { issue }, { issueId: id })

    res.status(201).json(issue)
  })

  app.put('/api/issues/:id/state', (req, res) => {
    const { state: newState } = req.body
    const issue = state.issues.get(req.params.id)

    if (!issue) {
      return res.status(404).json({ error: 'Issue not found' })
    }

    const sm = new IssueStateMachine(issue)
    if (!sm.canTransition(newState)) {
      return res.status(400).json({
        error: `Invalid transition from ${issue.state} to ${newState}`
      })
    }

    const previousState = issue.state
    sm.transition(newState)

    emitEvent(EventTypes.ISSUE_STATE_CHANGED, issue.projectId, {
      previous_state: previousState,
      new_state: newState,
      issue: state.issues.get(req.params.id)
    }, { issueId: req.params.id })

    res.json(state.issues.get(req.params.id))
  })

  app.put('/api/issues/:id/assign', (req, res) => {
    const { agentId } = req.body
    const issue = state.issues.get(req.params.id)
    const agent = state.agents.get(agentId)

    if (!issue) return res.status(404).json({ error: 'Issue not found' })
    if (!agent) return res.status(404).json({ error: 'Agent not found' })

    const validation = validateAssignment(agent, issue, state.issues)
    if (!validation.valid) {
      return res.status(400).json({ error: validation.error })
    }

    issue.assignedAgentId = agentId
    agent.currentIssueId = issue.id

    emitEvent(EventTypes.ISSUE_ASSIGNED, issue.projectId, {
      new_agent_id: agentId,
      issue,
      agent
    }, { issueId: issue.id, agentId })

    res.json(issue)
  })

  app.delete('/api/issues/:id/assign', (req, res) => {
    const issue = state.issues.get(req.params.id)
    if (!issue) return res.status(404).json({ error: 'Issue not found' })

    const previousAgent = issue.assignedAgentId
    if (previousAgent) {
      const agent = state.agents.get(previousAgent)
      if (agent) agent.currentIssueId = null
    }

    issue.assignedAgentId = null

    emitEvent(EventTypes.ISSUE_UNASSIGNED, issue.projectId, {
      previous_agent_id: previousAgent,
      issue
    }, { issueId: issue.id })

    res.json(issue)
  })

  app.put('/api/issues/:id/block', (req, res) => {
    const { reason } = req.body
    const issue = state.issues.get(req.params.id)

    if (!issue) return res.status(404).json({ error: 'Issue not found' })
    if (!reason) return res.status(400).json({ error: 'Block reason required' })

    issue.isBlocked = true
    issue.blockReason = reason

    emitEvent(EventTypes.ISSUE_BLOCKED, issue.projectId, {
      reason,
      issue
    }, { issueId: issue.id })

    res.json(issue)
  })

  app.delete('/api/issues/:id/block', (req, res) => {
    const issue = state.issues.get(req.params.id)
    if (!issue) return res.status(404).json({ error: 'Issue not found' })

    issue.isBlocked = false
    issue.blockReason = null

    emitEvent(EventTypes.ISSUE_UNBLOCKED, issue.projectId, { issue }, { issueId: issue.id })

    res.json(issue)
  })

  // Events
  app.get('/api/events', (req, res) => {
    const sinceSeq = parseInt(req.query.since_seq) || 0
    const events = eventLog.getEventsSince(sinceSeq, 100)
    res.json({ events, current_seq: eventLog.getCurrentSeq() })
  })

  return { app, state, eventLog }
}

describe('API Integration Tests', () => {
  let app
  let testState
  let eventLog

  beforeEach(() => {
    const setup = createTestApp()
    app = setup.app
    testState = setup.state
    eventLog = setup.eventLog
  })

  describe('Health Check', () => {
    it('GET /api/health sollte 200 OK zurückgeben', async () => {
      const res = await request(app).get('/api/health')
      expect(res.status).toBe(200)
      expect(res.body.status).toBe('ok')
    })
  })

  describe('Issue CRUD (Issue #6)', () => {
    it('POST /api/issues sollte Issue erstellen', async () => {
      const res = await request(app)
        .post('/api/issues')
        .send({
          id: 'issue-1',
          number: 1,
          title: 'Test Issue',
          projectId: 'project-1',
          priority: 'P1'
        })

      expect(res.status).toBe(201)
      expect(res.body.id).toBe('issue-1')
      expect(res.body.state).toBe('backlog') // Initial state
      expect(res.body.priority).toBe('P1')
    })

    it('POST /api/issues sollte Event erzeugen', async () => {
      await request(app)
        .post('/api/issues')
        .send({
          id: 'issue-1',
          number: 1,
          title: 'Test',
          projectId: 'project-1'
        })

      const events = eventLog.getEventsSince(0)
      expect(events.length).toBe(1)
      expect(events[0].event_type).toBe('issue.created')
    })

    it('POST /api/issues sollte Duplikat ablehnen', async () => {
      await request(app)
        .post('/api/issues')
        .send({ id: 'issue-1', number: 1, title: 'Test', projectId: 'p1' })

      const res = await request(app)
        .post('/api/issues')
        .send({ id: 'issue-1', number: 1, title: 'Test', projectId: 'p1' })

      expect(res.status).toBe(409)
    })

    it('POST /api/issues sollte Pflichtfelder validieren', async () => {
      const res = await request(app)
        .post('/api/issues')
        .send({ id: 'issue-1' }) // Missing fields

      expect(res.status).toBe(400)
    })
  })

  describe('Issue State Changes (Issue #7)', () => {
    beforeEach(async () => {
      await request(app)
        .post('/api/issues')
        .send({ id: 'issue-1', number: 1, title: 'Test', projectId: 'p1' })
    })

    it('PUT /api/issues/:id/state sollte State ändern', async () => {
      const res = await request(app)
        .put('/api/issues/issue-1/state')
        .send({ state: 'analysis' })

      expect(res.status).toBe(200)
      expect(res.body.state).toBe('analysis')
    })

    it('sollte ungültige Transition ablehnen', async () => {
      const res = await request(app)
        .put('/api/issues/issue-1/state')
        .send({ state: 'done' }) // backlog -> done nicht erlaubt

      expect(res.status).toBe(400)
      expect(res.body.error).toContain('Invalid transition')
    })

    it('sollte Event bei State-Change erzeugen', async () => {
      await request(app)
        .put('/api/issues/issue-1/state')
        .send({ state: 'analysis' })

      const events = eventLog.getEventsSince(0)
      const stateEvent = events.find(e => e.event_type === 'issue.state_changed')
      expect(stateEvent).toBeDefined()
      expect(stateEvent.payload.previous_state).toBe('backlog')
      expect(stateEvent.payload.new_state).toBe('analysis')
    })
  })

  describe('Issue Blocking (Issue #8)', () => {
    beforeEach(async () => {
      await request(app)
        .post('/api/issues')
        .send({ id: 'issue-1', number: 1, title: 'Test', projectId: 'p1' })
    })

    it('PUT /api/issues/:id/block sollte Issue blocken', async () => {
      const res = await request(app)
        .put('/api/issues/issue-1/block')
        .send({ reason: 'Waiting for API access' })

      expect(res.status).toBe(200)
      expect(res.body.isBlocked).toBe(true)
      expect(res.body.blockReason).toBe('Waiting for API access')
    })

    it('sollte Block ohne Reason ablehnen', async () => {
      const res = await request(app)
        .put('/api/issues/issue-1/block')
        .send({})

      expect(res.status).toBe(400)
      expect(res.body.error).toContain('reason required')
    })

    it('DELETE /api/issues/:id/block sollte Issue unblocken', async () => {
      await request(app)
        .put('/api/issues/issue-1/block')
        .send({ reason: 'Waiting' })

      const res = await request(app)
        .delete('/api/issues/issue-1/block')

      expect(res.status).toBe(200)
      expect(res.body.isBlocked).toBe(false)
      expect(res.body.blockReason).toBeNull()
    })
  })

  describe('Agent CRUD (Issue #10)', () => {
    it('POST /api/agents sollte Agent erstellen', async () => {
      const res = await request(app)
        .post('/api/agents')
        .send({ id: 'agent-1', name: 'Agent Alpha' })

      expect(res.status).toBe(201)
      expect(res.body.id).toBe('agent-1')
      expect(res.body.status).toBe('idle')
    })

    it('PUT /api/agents/:id/status sollte Status ändern', async () => {
      await request(app)
        .post('/api/agents')
        .send({ id: 'agent-1', name: 'Agent Alpha' })

      const res = await request(app)
        .put('/api/agents/agent-1/status')
        .send({ status: 'working' })

      expect(res.status).toBe(200)
      expect(res.body.status).toBe('working')
    })

    it('sollte blocked ohne reason ablehnen', async () => {
      await request(app)
        .post('/api/agents')
        .send({ id: 'agent-1', name: 'Agent Alpha' })

      await request(app)
        .put('/api/agents/agent-1/status')
        .send({ status: 'working' })

      const res = await request(app)
        .put('/api/agents/agent-1/status')
        .send({ status: 'blocked' }) // No reason

      expect(res.status).toBe(400)
    })

    it('sollte blocked mit reason akzeptieren', async () => {
      await request(app)
        .post('/api/agents')
        .send({ id: 'agent-1', name: 'Agent Alpha' })

      await request(app)
        .put('/api/agents/agent-1/status')
        .send({ status: 'working' })

      const res = await request(app)
        .put('/api/agents/agent-1/status')
        .send({ status: 'blocked', reason: 'Waiting for review' })

      expect(res.status).toBe(200)
      expect(res.body.status).toBe('blocked')
      expect(res.body.blockReason).toBe('Waiting for review')
    })
  })

  describe('Issue Assignment (Issue #11)', () => {
    beforeEach(async () => {
      await request(app)
        .post('/api/agents')
        .send({ id: 'agent-1', name: 'Agent Alpha' })
      await request(app)
        .post('/api/issues')
        .send({ id: 'issue-1', number: 1, title: 'Test', projectId: 'p1' })
    })

    it('PUT /api/issues/:id/assign sollte Agent zuweisen', async () => {
      const res = await request(app)
        .put('/api/issues/issue-1/assign')
        .send({ agentId: 'agent-1' })

      expect(res.status).toBe(200)
      expect(res.body.assignedAgentId).toBe('agent-1')
    })

    it('sollte zweites Issue für gleichen Agent ablehnen (Invariant #15)', async () => {
      await request(app)
        .post('/api/issues')
        .send({ id: 'issue-2', number: 2, title: 'Test 2', projectId: 'p1' })

      await request(app)
        .put('/api/issues/issue-1/assign')
        .send({ agentId: 'agent-1' })

      const res = await request(app)
        .put('/api/issues/issue-2/assign')
        .send({ agentId: 'agent-1' })

      expect(res.status).toBe(400)
      expect(res.body.error).toContain('already assigned')
    })

    it('DELETE /api/issues/:id/assign sollte Agent entfernen', async () => {
      await request(app)
        .put('/api/issues/issue-1/assign')
        .send({ agentId: 'agent-1' })

      const res = await request(app)
        .delete('/api/issues/issue-1/assign')

      expect(res.status).toBe(200)
      expect(res.body.assignedAgentId).toBeNull()
    })
  })

  describe('Event Log (Issue #17)', () => {
    it('sollte alle Events speichern', async () => {
      await request(app)
        .post('/api/agents')
        .send({ id: 'agent-1', name: 'Alpha' })

      await request(app)
        .post('/api/issues')
        .send({ id: 'issue-1', number: 1, title: 'Test', projectId: 'p1' })

      await request(app)
        .put('/api/issues/issue-1/assign')
        .send({ agentId: 'agent-1' })

      const res = await request(app).get('/api/events')

      expect(res.body.events.length).toBe(3)
      expect(res.body.current_seq).toBe(3)
    })

    it('sollte Events mit since_seq filtern', async () => {
      await request(app)
        .post('/api/agents')
        .send({ id: 'agent-1', name: 'Alpha' })

      await request(app)
        .post('/api/issues')
        .send({ id: 'issue-1', number: 1, title: 'Test', projectId: 'p1' })

      const res = await request(app).get('/api/events?since_seq=1')

      expect(res.body.events.length).toBe(1)
      expect(res.body.events[0].seq).toBe(2)
    })
  })
})
