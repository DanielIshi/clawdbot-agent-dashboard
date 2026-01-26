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

/**
 * Process a single event and update relevant stores
 */
export function processEvent(event: EventEnvelope): void {
  const activityStore = useActivityStore.getState()
  const connectionStore = useConnectionStore.getState()

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
