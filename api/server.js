/**
 * Multi-Agent Command Center API Server
 * Express + WebSocket server for real-time agent coordination
 */
import express from 'express'
import { createServer } from 'http'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { setupWebSocket, broadcast, getStats } from './websocket/index.js'
import { EventLog } from './events/log.js'
import { createEventEnvelope, EventTypes } from './events/envelope.js'
import { AgentStateMachine, createAgent } from './state/agentStateMachine.js'
import { IssueStateMachine, createIssue } from './state/issueStateMachine.js'
import { validateAssignment, validateBlock } from './state/invariants.js'
import { pubsub } from './websocket/topics.js'

import costRoutes from './cost-routes.js'
const __dirname = dirname(fileURLToPath(import.meta.url))

// Configuration
const PORT = process.env.PORT || 3456
const DB_PATH = process.env.DB_PATH || join(__dirname, 'data', 'events.db')

// Initialize Express app
const app = express()
app.use(express.json())
app.use('/api/cost', costRoutes)

// CORS for local development
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*')
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  if (req.method === 'OPTIONS') return res.sendStatus(200)
  next()
})

// Create data directory if needed
import { mkdirSync, existsSync } from 'fs'
const dataDir = dirname(DB_PATH)
if (!existsSync(dataDir)) {
  mkdirSync(dataDir, { recursive: true })
}

// Initialize Event Log
const eventLog = new EventLog(DB_PATH)

// In-memory state (rebuilt from events on startup)
const state = {
  agents: new Map(),      // Map<agentId, AgentState>
  issues: new Map(),      // Map<issueId, IssueState>
  projects: new Map()     // Map<projectId, ProjectInfo>
}

// Helper to create and publish events
function emitEvent(eventType, projectId, payload, { agentId, issueId } = {}) {
  const event = createEventEnvelope({
    event_type: eventType,
    project_id: projectId,
    agent_id: agentId,
    issue_id: issueId,
    payload,
    getNextSeq: () => eventLog.getNextSeq()
  })

  // Persist event
  eventLog.append(event)

  // Broadcast to subscribers
  broadcast(event)

  return event
}

// Command handler for WebSocket commands
function commandHandler(ws, message, context) {
  const { command, data } = message

  switch (command) {
    case 'get_snapshot':
      return {
        type: 'snapshot',
        data: {
          agents: Array.from(state.agents.values()),
          issues: Array.from(state.issues.values()),
          currentSeq: eventLog.getCurrentSeq()
        }
      }

    case 'replay_events':
      const sinceSeq = data?.since_seq || 0
      const events = eventLog.getEventsSince(sinceSeq, 100)
      return {
        type: 'replay',
        events,
        current_seq: eventLog.getCurrentSeq()
      }

    default:
      return {
        type: 'error',
        error: `Unknown command: ${command}`,
        code: 'UNKNOWN_COMMAND'
      }
  }
}

// ==================== REST API Routes ====================

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    eventCount: eventLog.getEventCount(),
    currentSeq: eventLog.getCurrentSeq()
  })
})

// Get WebSocket stats
app.get('/api/stats', (req, res) => {
  const httpServer = app.get('httpServer')
  const wss = app.get('wss')
  res.json({
    agents: state.agents.size,
    issues: state.issues.size,
    websocket: wss ? getStats(wss) : null
  })
})

// ==================== Agent Routes ====================

// List all agents
app.get('/api/agents', (req, res) => {
  res.json(Array.from(state.agents.values()))
})

// Get single agent
app.get('/api/agents/:id', (req, res) => {
  const agent = state.agents.get(req.params.id)
  if (!agent) {
    return res.status(404).json({ error: 'Agent not found' })
  }
  res.json(agent)
})

// Create/register agent
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

// Update agent status
app.put('/api/agents/:id/status', (req, res) => {
  const { status, reason, projectId } = req.body
  const agent = state.agents.get(req.params.id)

  if (!agent) {
    return res.status(404).json({ error: 'Agent not found' })
  }

  // Validate status transition
  const sm = new AgentStateMachine(agent)
  if (!sm.canTransition(status)) {
    return res.status(400).json({
      error: `Invalid transition from ${agent.status} to ${status}`,
      validTransitions: sm.getValidTransitions()
    })
  }

  // Working requires assigned issue (invariant)
  if (status === 'working' && !agent.currentIssueId) {
    return res.status(400).json({
      error: 'Cannot set status to "working" without assigned issue (Invariant)',
      code: 'INVARIANT_VIOLATION'
    })
  }

  // Block requires reason (invariant) - FIX 4: Check reason first
  if (status === 'blocked') {
    if (!reason) {
      return res.status(400).json({
        error: 'Cannot set status to "blocked" without reason (Invariant)',
        code: 'INVARIANT_VIOLATION'
      })
    }
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

// ==================== Issue Routes ====================

// List all issues
app.get('/api/issues', (req, res) => {
  const { projectId, state: filterState } = req.query
  let issues = Array.from(state.issues.values())

  if (projectId) {
    issues = issues.filter(i => i.projectId === projectId)
  }
  if (filterState) {
    issues = issues.filter(i => i.state === filterState)
  }

  res.json(issues)
})

// Get single issue
app.get('/api/issues/:id', (req, res) => {
  const issue = state.issues.get(req.params.id)
  if (!issue) {
    return res.status(404).json({ error: 'Issue not found' })
  }
  res.json(issue)
})

// Create issue
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

// Update issue state
app.put('/api/issues/:id/state', (req, res) => {
  const { state: newState } = req.body
  const issue = state.issues.get(req.params.id)

  if (!issue) {
    return res.status(404).json({ error: 'Issue not found' })
  }

  const sm = new IssueStateMachine(issue)
  if (!sm.canTransition(newState)) {
    return res.status(400).json({
      error: `Invalid transition from ${issue.state} to ${newState}`,
      validTransitions: sm.getValidTransitions()
    })
  }

  const previousState = issue.state
  sm.transition(newState)
  issue.updatedAt = new Date().toISOString() // FIX 1: Update timestamp

  emitEvent(EventTypes.ISSUE_STATE_CHANGED, issue.projectId, {
    previous_state: previousState,
    new_state: newState,
    issue: state.issues.get(req.params.id)
  }, { issueId: req.params.id })

  res.json(state.issues.get(req.params.id))
})

// Assign issue to agent
app.put('/api/issues/:id/assign', (req, res) => {
  const { agentId } = req.body

  // FIX 5: Validate agentId is provided
  if (!agentId) {
    return res.status(400).json({ error: 'agentId required' })
  }

  const issue = state.issues.get(req.params.id)
  const agent = state.agents.get(agentId)

  if (!issue) {
    return res.status(404).json({ error: 'Issue not found' })
  }
  if (!agent) {
    return res.status(404).json({ error: 'Agent not found' })
  }

  // Validate assignment (invariant: max 1 issue per agent)
  const validation = validateAssignment(agent, issue, state.issues)
  if (!validation.valid) {
    return res.status(400).json({ error: validation.error })
  }

  const previousAgent = issue.assignedAgentId
  issue.assignedAgentId = agentId
  issue.updatedAt = new Date().toISOString()

  // Update agent's current issue
  agent.currentIssueId = issue.id
  agent.status = 'working' // FIX 3: Auto-set status to working
  agent.lastActivity = new Date().toISOString()

  emitEvent(EventTypes.ISSUE_ASSIGNED, issue.projectId, {
    previous_agent_id: previousAgent,
    new_agent_id: agentId,
    issue,
    agent
  }, { issueId: issue.id, agentId })

  res.json(issue)
})

// Unassign issue
app.delete('/api/issues/:id/assign', (req, res) => {
  const issue = state.issues.get(req.params.id)

  if (!issue) {
    return res.status(404).json({ error: 'Issue not found' })
  }

  const previousAgent = issue.assignedAgentId
  if (previousAgent) {
    const agent = state.agents.get(previousAgent)
    if (agent) {
      agent.currentIssueId = null
      agent.lastActivity = new Date().toISOString()
    }
  }

  issue.assignedAgentId = null
  issue.updatedAt = new Date().toISOString()

  emitEvent(EventTypes.ISSUE_UNASSIGNED, issue.projectId, {
    previous_agent_id: previousAgent,
    issue
  }, { issueId: issue.id, agentId: previousAgent })

  res.json(issue)
})

// Block issue
app.put('/api/issues/:id/block', (req, res) => {
  const { reason } = req.body
  const issue = state.issues.get(req.params.id)

  if (!issue) {
    return res.status(404).json({ error: 'Issue not found' })
  }

  if (!reason) {
    return res.status(400).json({ error: 'Block reason required (invariant)' })
  }

  issue.isBlocked = true
  issue.blockReason = reason
  issue.updatedAt = new Date().toISOString()

  emitEvent(EventTypes.ISSUE_BLOCKED, issue.projectId, {
    reason,
    issue
  }, { issueId: issue.id })

  res.json(issue)
})

// Unblock issue
app.delete('/api/issues/:id/block', (req, res) => {
  const issue = state.issues.get(req.params.id)

  if (!issue) {
    return res.status(404).json({ error: 'Issue not found' })
  }

  const previousReason = issue.blockReason
  issue.isBlocked = false
  issue.blockReason = null
  issue.updatedAt = new Date().toISOString()

  emitEvent(EventTypes.ISSUE_UNBLOCKED, issue.projectId, {
    previous_reason: previousReason,
    issue
  }, { issueId: issue.id })

  res.json(issue)
})

// Complete issue (Issue #9)
app.put('/api/issues/:id/complete', (req, res) => {
  const issue = state.issues.get(req.params.id)

  if (!issue) {
    return res.status(404).json({ error: 'Issue not found' })
  }

  const sm = new IssueStateMachine(issue)

  // FIX 2: Allow completion from review state (normal flow) or force complete
  const { force } = req.body

  const previousState = issue.state
  const previousAgent = issue.assignedAgentId

  // If in review state, use state machine
  if (issue.state === 'review') {
    sm.transition('done')
  } else if (force) {
    // Force completion bypasses state machine
    issue.state = 'done'
  } else {
    // Not in review and no force flag
    return res.status(400).json({
      error: `Cannot complete issue in state '${issue.state}'. Move to 'review' first or use force=true`,
      validTransitions: sm.getValidTransitions(),
      currentState: issue.state
    })
  }

  // Ensure state is done (in case transition failed)
  issue.state = 'done'
  issue.completedAt = new Date().toISOString()
  issue.updatedAt = issue.completedAt

  // Unassign agent
  if (previousAgent) {
    const agent = state.agents.get(previousAgent)
    if (agent) {
      agent.currentIssueId = null
      agent.status = 'idle'
      agent.lastActivity = new Date().toISOString()
    }
    issue.assignedAgentId = null
  }

  emitEvent(EventTypes.ISSUE_COMPLETED, issue.projectId, {
    previous_state: previousState,
    previous_agent_id: previousAgent,
    completion_time: issue.completedAt,
    issue
  }, { issueId: issue.id, agentId: previousAgent })

  res.json(issue)
})

// ==================== System Routes (Issue #12) ====================

// Send system alert
app.post('/api/system/alert', (req, res) => {
  const { level, message, projectId, metadata } = req.body

  if (!message) {
    return res.status(400).json({ error: 'Alert message required' })
  }

  const validLevels = ['info', 'warning', 'error', 'critical']
  const alertLevel = validLevels.includes(level) ? level : 'info'

  const event = emitEvent(EventTypes.SYSTEM_ALERT, projectId || 'system', {
    level: alertLevel,
    message,
    metadata: metadata || {},
    source: 'api'
  })

  res.status(201).json({
    success: true,
    event_id: event.event_id,
    level: alertLevel,
    message
  })
})

// Get system status
app.get('/api/system/status', (req, res) => {
  const wss = app.get('wss')
  res.json({
    status: 'online',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    counts: {
      agents: state.agents.size,
      issues: state.issues.size,
      events: eventLog.getEventCount(),
      currentSeq: eventLog.getCurrentSeq()
    },
    websocket: wss ? getStats(wss) : null
  })
})

// ==================== Session Routes (Issue #58) ====================

// Get all sessions (Mock data for now - can be extended with real session tracking)
app.get('/api/sessions', (req, res) => {
  // Mock session data
  const sessions = [
    {
      id: 'claude-session-1',
      status: 'active',
      lastActivity: new Date().toISOString(),
      output: 'Building settlers dashboard... implementing session sidebar component...'
    },
    {
      id: 'agent-session-2',
      status: 'done',
      lastActivity: new Date(Date.now() - 60000).toISOString(),
      output: 'Build completed successfully. All tests passed. PR merged.'
    }
  ]

  res.json({ sessions })
})

// ==================== Event Routes ====================

// Get events (for replay)
app.get('/api/events', (req, res) => {
  const sinceSeq = parseInt(req.query.since_seq) || 0
  const limit = Math.min(parseInt(req.query.limit) || 100, 1000)

  const events = eventLog.getEventsSince(sinceSeq, limit)
  res.json({
    events,
    current_seq: eventLog.getCurrentSeq()
  })
})

// Legacy ClawdBot status endpoint (compatibility)
app.get('/api/clawdbot-status', (req, res) => {
  res.json({
    status: 'online',
    timestamp: new Date().toISOString(),
    auth: {
      activeProfile: 'anthropic:claude-cli',
      oauthToken: {
        exists: true,
        expires: new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString(),
        hoursRemaining: 12,
        minutesRemaining: 0,
        isValid: true,
        needsRenewal: false
      },
      apiKeyFallback: {
        exists: true,
        type: 'sk-ant'
      }
    },
    rateLimit: {
      detected: false,
      occurrences: 0,
      lastDetected: null,
      recentErrors: []
    },
    recommendations: []
  })
})

// ==================== Start Server ====================

const httpServer = createServer(app)

// Setup WebSocket
const wss = setupWebSocket(httpServer, {
  eventLog,
  commandHandler
})

// Store references for stats endpoint
app.set('httpServer', httpServer)
app.set('wss', wss)

httpServer.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════════╗
║     Multi-Agent Command Center API Server                 ║
╠═══════════════════════════════════════════════════════════╣
║  HTTP API:    http://localhost:${PORT}/api                   ║
║  WebSocket:   ws://localhost:${PORT}/ws/agentops             ║
║  DB Path:     ${DB_PATH.slice(-40).padStart(40)}  ║
╚═══════════════════════════════════════════════════════════╝
  `)
})

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\nShutting down...')
  eventLog.close()
  httpServer.close(() => {
    console.log('Server closed')
    process.exit(0)
  })
})

export { app, httpServer, wss, state, emitEvent }
