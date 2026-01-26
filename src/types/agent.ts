/**
 * Agent Types
 */

export type AgentStatus = 'idle' | 'working' | 'blocked'

export interface Agent {
  id: string
  name: string
  status: AgentStatus
  currentIssueId: string | null
  blockReason: string | null
  lastActivity: string
  createdAt: string
  updatedAt: string
}

export interface AgentStatusChangePayload {
  previous_status: AgentStatus | null
  new_status: AgentStatus
  reason?: string
  agent: Agent
}

export interface AgentAssignedPayload {
  issue_id: string
  agent: Agent
}

export interface AgentUnassignedPayload {
  issue_id: string
  agent: Agent
}

// Agent state machine transitions
export const AGENT_TRANSITIONS: Record<AgentStatus, AgentStatus[]> = {
  idle: ['working'],
  working: ['idle', 'blocked'],
  blocked: ['working', 'idle']
}

// Helper to check if transition is valid
export function canAgentTransition(from: AgentStatus, to: AgentStatus): boolean {
  return AGENT_TRANSITIONS[from]?.includes(to) ?? false
}
