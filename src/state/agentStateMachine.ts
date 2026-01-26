// Agent State Machine
// Handles state transitions and event processing

import {
  Agent,
  Issue,
  AgentStatus,
  IssueStatus,
  DashboardState,
  DashboardEvent,
  AgentAssignedEvent,
  AgentUnassignedEvent,
  AgentStatusChangedEvent,
} from './types'

export class StateError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'StateError'
  }
}

// Create initial state
export function createInitialState(): DashboardState {
  return {
    agents: new Map(),
    issues: new Map(),
    eventLog: [],
    lastSeq: 0,
  }
}

// Create agent with initial state
export function createAgent(
  id: string,
  name: string,
  status: AgentStatus = 'idle'
): Agent {
  return {
    id,
    name,
    status,
    currentIssueId: null,
    lastStatusChange: new Date().toISOString(),
  }
}

// Create issue with initial state
export function createIssue(
  id: string,
  number: number,
  title: string,
  status: IssueStatus = 'backlog'
): Issue {
  const now = new Date().toISOString()
  return {
    id,
    number,
    title,
    status,
    assignedAgentId: null,
    createdAt: now,
    updatedAt: now,
  }
}

// Valid status transitions for agents
const VALID_AGENT_TRANSITIONS: Record<AgentStatus, AgentStatus[]> = {
  idle: ['working', 'blocked'],
  working: ['idle', 'blocked'],
  blocked: ['idle', 'working'],
}

// Valid status transitions for issues
const VALID_ISSUE_TRANSITIONS: Record<IssueStatus, IssueStatus[]> = {
  backlog: ['development'],
  development: ['blocked', 'review', 'done'],
  blocked: ['development', 'backlog'],
  review: ['development', 'done'],
  done: [], // Terminal state
}

// Check if agent can transition to new status
export function canAgentTransition(
  from: AgentStatus,
  to: AgentStatus
): boolean {
  return VALID_AGENT_TRANSITIONS[from]?.includes(to) ?? false
}

// Check if issue can transition to new status
export function canIssueTransition(
  from: IssueStatus,
  to: IssueStatus
): boolean {
  return VALID_ISSUE_TRANSITIONS[from]?.includes(to) ?? false
}

// Process agent.assigned event
export function processAgentAssigned(
  state: DashboardState,
  event: AgentAssignedEvent
): DashboardState {
  const { agent_id, issue_id } = event.payload
  const agent = state.agents.get(agent_id)
  const issue = state.issues.get(issue_id)

  // Validate agent exists
  if (!agent) {
    throw new StateError(`Agent ${agent_id} not found`)
  }

  // Validate issue exists
  if (!issue) {
    throw new StateError(`Issue ${issue_id} not found`)
  }

  // Validate agent is idle (can accept work)
  if (agent.status !== 'idle') {
    throw new StateError(
      `Agent ${agent_id} is ${agent.status}, cannot be assigned. Must be idle.`
    )
  }

  // Validate issue is in development state
  if (issue.status !== 'development') {
    throw new StateError(
      `Issue ${issue_id} is ${issue.status}, must be in development to assign agent`
    )
  }

  // Validate issue is not already assigned
  if (issue.assignedAgentId) {
    throw new StateError(
      `Issue ${issue_id} is already assigned to agent ${issue.assignedAgentId}`
    )
  }

  // Clone state
  const newState: DashboardState = {
    agents: new Map(state.agents),
    issues: new Map(state.issues),
    eventLog: [...state.eventLog, event],
    lastSeq: event.seq ?? state.lastSeq,
  }

  // Update agent
  const updatedAgent: Agent = {
    ...agent,
    status: 'working',
    currentIssueId: issue_id,
    lastStatusChange: event.timestamp,
  }
  newState.agents.set(agent_id, updatedAgent)

  // Update issue
  const updatedIssue: Issue = {
    ...issue,
    assignedAgentId: agent_id,
    updatedAt: event.timestamp,
  }
  newState.issues.set(issue_id, updatedIssue)

  return newState
}

// Process agent.unassigned event
export function processAgentUnassigned(
  state: DashboardState,
  event: AgentUnassignedEvent
): DashboardState {
  const { agent_id, issue_id } = event.payload
  const agent = state.agents.get(agent_id)
  const issue = state.issues.get(issue_id)

  if (!agent) {
    throw new StateError(`Agent ${agent_id} not found`)
  }

  if (!issue) {
    throw new StateError(`Issue ${issue_id} not found`)
  }

  if (agent.currentIssueId !== issue_id) {
    throw new StateError(
      `Agent ${agent_id} is not assigned to issue ${issue_id}`
    )
  }

  const newState: DashboardState = {
    agents: new Map(state.agents),
    issues: new Map(state.issues),
    eventLog: [...state.eventLog, event],
    lastSeq: event.seq ?? state.lastSeq,
  }

  // Update agent - back to idle
  const updatedAgent: Agent = {
    ...agent,
    status: 'idle',
    currentIssueId: null,
    lastStatusChange: event.timestamp,
  }
  newState.agents.set(agent_id, updatedAgent)

  // Update issue
  const updatedIssue: Issue = {
    ...issue,
    assignedAgentId: null,
    updatedAt: event.timestamp,
  }
  newState.issues.set(issue_id, updatedIssue)

  return newState
}

// Process agent.status_changed event
export function processAgentStatusChanged(
  state: DashboardState,
  event: AgentStatusChangedEvent
): DashboardState {
  const { agent_id, new_status } = event.payload
  const agent = state.agents.get(agent_id)

  if (!agent) {
    throw new StateError(`Agent ${agent_id} not found`)
  }

  if (!canAgentTransition(agent.status, new_status)) {
    throw new StateError(
      `Invalid transition for agent ${agent_id}: ${agent.status} → ${new_status}`
    )
  }

  const newState: DashboardState = {
    agents: new Map(state.agents),
    issues: new Map(state.issues),
    eventLog: [...state.eventLog, event],
    lastSeq: event.seq ?? state.lastSeq,
  }

  const updatedAgent: Agent = {
    ...agent,
    status: new_status,
    lastStatusChange: event.timestamp,
  }
  newState.agents.set(agent_id, updatedAgent)

  return newState
}

// Main event processor
export function processEvent(
  state: DashboardState,
  event: DashboardEvent
): DashboardState {
  switch (event.type) {
    case 'agent.assigned':
      return processAgentAssigned(state, event)
    case 'agent.unassigned':
      return processAgentUnassigned(state, event)
    case 'agent.status_changed':
      return processAgentStatusChanged(state, event)
    default:
      // Unknown event type - log but don't crash
      console.warn(`Unknown event type: ${(event as DashboardEvent).type}`)
      return {
        ...state,
        eventLog: [...state.eventLog, event],
      }
  }
}
