/**
 * Event Processor - processes WebSocket events and updates stores
 */
import type { EventEnvelope, ServerMessage } from '../types/events'
import type { Agent } from '../types/agent'
import type { Issue } from '../types/issue'
import { useAgentStore } from '../stores/agentStore'
import { useIssueStore } from '../stores/issueStore'
import { useActivityStore } from '../stores/activityStore'
import { useConnectionStore } from '../stores/connectionStore'

// Gap detection callback (Issue #25)
let gapDetectionCallback: ((currentSeq: number, expectedSeq: number) => void) | null = null

/**
 * Set callback for gap detection
 */
export function setGapDetectionCallback(callback: (currentSeq: number, expectedSeq: number) => void): void {
  gapDetectionCallback = callback
}

/**
 * Detect sequence gaps (Issue #25)
 */
function detectGap(eventSeq: number, currentSeq: number): boolean {
  // If currentSeq is 0, this is first event - no gap
  if (currentSeq === 0) return false

  // Expected next seq is currentSeq + 1
  const expectedSeq = currentSeq + 1

  // If event seq is greater than expected, we have a gap
  if (eventSeq > expectedSeq) {
    console.warn(`[EventProcessor] Gap detected! Expected seq ${expectedSeq}, got ${eventSeq}. Missing ${eventSeq - expectedSeq} events.`)

    if (gapDetectionCallback) {
      gapDetectionCallback(currentSeq, eventSeq)
    }

    return true
  }

  return false
}

/**
 * Process a single event and update relevant stores
 */
export function processEvent(event: EventEnvelope): void {
  const activityStore = useActivityStore.getState()
  const connectionStore = useConnectionStore.getState()

  // Gap detection (Issue #25)
  const hasGap = detectGap(event.seq, connectionStore.currentSeq)
  if (hasGap) {
    // Activity for gap detection
    activityStore.addActivity({
      message: `Gap detected: missing events between ${connectionStore.currentSeq} and ${event.seq}`,
      type: 'warning'
    })
  }

  // Update sequence number
  connectionStore.updateSeq(event.seq)

  // Check for duplicate (already processed)
  if (activityStore.isEventProcessed(event.event_id)) {
    console.log(`[EventProcessor] Skipping duplicate event: ${event.event_id}`)
    return
  }

  // Add to activity feed
  activityStore.processEvent(event)

  // Process based on event type
  const payload = event.payload as Record<string, unknown>

  switch (event.event_type) {
    case 'issue.created':
      handleIssueCreated(payload)
      break

    case 'issue.state_changed':
      handleIssueStateChanged(payload)
      break

    case 'issue.blocked':
      handleIssueBlocked(event.issue_id!, payload)
      break

    case 'issue.unblocked':
      handleIssueUnblocked(event.issue_id!)
      break

    case 'issue.assigned':
      handleIssueAssigned(payload)
      break

    case 'issue.unassigned':
      handleIssueUnassigned(payload)
      break

    case 'issue.completed':
      handleIssueCompleted(payload)
      break

    case 'agent.status_changed':
      handleAgentStatusChanged(payload)
      break

    case 'agent.assigned':
      handleAgentAssigned(event.agent_id!, payload)
      break

    case 'agent.unassigned':
      handleAgentUnassigned(event.agent_id!)
      break

    case 'system.snapshot':
      handleSnapshot(payload)
      break

    case 'system.alert':
      handleSystemAlert(payload)
      break

    case 'system.error':
      handleSystemError(payload)
      break

    default:
      console.log(`[EventProcessor] Unknown event type: ${event.event_type}`)
  }
}

function handleIssueCreated(payload: Record<string, unknown>): void {
  const issue = payload.issue as Issue
  if (issue) {
    useIssueStore.getState().upsertIssue(issue)
  }
}

function handleIssueStateChanged(payload: Record<string, unknown>): void {
  const issue = payload.issue as Issue
  if (issue) {
    useIssueStore.getState().upsertIssue(issue)
  }
}

function handleIssueBlocked(issueId: string, payload: Record<string, unknown>): void {
  const reason = payload.reason as string
  const issue = payload.issue as Issue
  if (issue) {
    useIssueStore.getState().upsertIssue(issue)
  } else if (issueId && reason) {
    useIssueStore.getState().blockIssue(issueId, reason)
  }
}

function handleIssueUnblocked(issueId: string): void {
  useIssueStore.getState().unblockIssue(issueId)
}

function handleIssueAssigned(payload: Record<string, unknown>): void {
  const issue = payload.issue as Issue
  const agent = payload.agent as Agent

  if (issue) {
    useIssueStore.getState().upsertIssue(issue)
  }
  if (agent) {
    useAgentStore.getState().upsertAgent(agent)
  }
}

function handleIssueUnassigned(payload: Record<string, unknown>): void {
  const issue = payload.issue as Issue
  const previousAgentId = payload.previous_agent_id as string | null

  if (issue) {
    useIssueStore.getState().upsertIssue(issue)
  }
  if (previousAgentId) {
    useAgentStore.getState().unassignIssueFromAgent(previousAgentId)
  }
}

function handleAgentStatusChanged(payload: Record<string, unknown>): void {
  const agent = payload.agent as Agent
  if (agent) {
    useAgentStore.getState().upsertAgent(agent)
  }
}

function handleAgentAssigned(agentId: string, payload: Record<string, unknown>): void {
  const issueId = payload.issue_id as string
  if (agentId && issueId) {
    useAgentStore.getState().assignIssueToAgent(agentId, issueId)
  }
}

function handleAgentUnassigned(agentId: string): void {
  useAgentStore.getState().unassignIssueFromAgent(agentId)
}

// Issue completed handler (Issue #9)
function handleIssueCompleted(payload: Record<string, unknown>): void {
  const issue = payload.issue as Issue
  const previousAgentId = payload.previous_agent_id as string | null

  if (issue) {
    useIssueStore.getState().upsertIssue(issue)
  }

  // Release the agent
  if (previousAgentId) {
    const agentStore = useAgentStore.getState()
    const agent = agentStore.agents.get(previousAgentId)
    if (agent) {
      agentStore.upsertAgent({
        ...agent,
        status: 'idle',
        currentIssueId: null,
        lastActivity: new Date().toISOString()
      })
    }
  }
}

// System alert handler (Issue #12)
function handleSystemAlert(payload: Record<string, unknown>): void {
  const level = payload.level as string
  const message = payload.message as string

  // Map alert level to activity type
  const typeMap: Record<string, 'info' | 'success' | 'warning' | 'error'> = {
    info: 'info',
    warning: 'warning',
    error: 'error',
    critical: 'error'
  }

  useActivityStore.getState().addActivity({
    message: `[ALERT] ${message}`,
    type: typeMap[level] || 'warning'
  })
}

// System error handler
function handleSystemError(payload: Record<string, unknown>): void {
  const message = payload.message as string || 'Unknown system error'

  useActivityStore.getState().addActivity({
    message: `[ERROR] ${message}`,
    type: 'error'
  })
}

function handleSnapshot(payload: Record<string, unknown>): void {
  const agents = payload.agents as Agent[] | undefined
  const issues = payload.issues as Issue[] | undefined

  if (agents) {
    useAgentStore.getState().setAgents(agents)
  }
  if (issues) {
    useIssueStore.getState().setIssues(issues)
  }
}

/**
 * Process server message (wraps event processing with type handling)
 */
export function processServerMessage(message: ServerMessage): void {
  // Handle event-type messages directly
  if ('event_type' in message && 'seq' in message) {
    processEvent(message as unknown as EventEnvelope)
    return
  }

  switch (message.type) {
    case 'snapshot':
      if (message.data) {
        handleSnapshot(message.data as Record<string, unknown>)
        if (message.data.currentSeq) {
          useConnectionStore.getState().updateSeq(message.data.currentSeq)
        }
      }
      break

    case 'replay':
      if (message.events) {
        message.events.forEach(processEvent)
      }
      if (message.current_seq) {
        useConnectionStore.getState().updateSeq(message.current_seq)
      }
      break

    case 'error':
      console.error('[EventProcessor] Server error:', message.error, message.code)
      useActivityStore.getState().addActivity({
        message: `Server error: ${message.error}`,
        type: 'error'
      })
      break

    default:
      // Other message types (handshake_ack, etc.) are handled by the WebSocket hook
      break
  }
}
