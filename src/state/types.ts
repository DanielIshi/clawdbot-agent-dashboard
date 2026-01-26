// Agent & Issue State Types

export type AgentStatus = 'idle' | 'working' | 'blocked'
export type IssueStatus = 'backlog' | 'development' | 'blocked' | 'review' | 'done'

export interface Agent {
  id: string
  name: string
  status: AgentStatus
  currentIssueId: string | null
  lastStatusChange: string
}

export interface Issue {
  id: string
  number: number
  title: string
  status: IssueStatus
  assignedAgentId: string | null
  blockReason?: string
  createdAt: string
  updatedAt: string
}

// Event Types
export interface BaseEvent {
  type: string
  timestamp: string
  seq?: number
}

export interface AgentAssignedEvent extends BaseEvent {
  type: 'agent.assigned'
  payload: {
    agent_id: string
    issue_id: string
  }
}

export interface AgentUnassignedEvent extends BaseEvent {
  type: 'agent.unassigned'
  payload: {
    agent_id: string
    issue_id: string
    reason?: string
  }
}

export interface AgentStatusChangedEvent extends BaseEvent {
  type: 'agent.status_changed'
  payload: {
    agent_id: string
    old_status: AgentStatus
    new_status: AgentStatus
    reason?: string
  }
}

export interface IssueStateChangedEvent extends BaseEvent {
  type: 'issue.state_changed'
  payload: {
    issue_id: string
    old_status: IssueStatus
    new_status: IssueStatus
  }
}

export interface IssueBlockedEvent extends BaseEvent {
  type: 'issue.blocked'
  payload: {
    issue_id: string
    reason: string
    agent_id?: string
  }
}

export type DashboardEvent =
  | AgentAssignedEvent
  | AgentUnassignedEvent
  | AgentStatusChangedEvent
  | IssueStateChangedEvent
  | IssueBlockedEvent

// State
export interface DashboardState {
  agents: Map<string, Agent>
  issues: Map<string, Issue>
  eventLog: DashboardEvent[]
  lastSeq: number
}
