/**
 * Issue Types
 */

export type IssueState =
  | 'backlog'
  | 'analysis'
  | 'development'
  | 'testing'
  | 'review'
  | 'done'
  | 'cancelled'

export type Priority = 'P0' | 'P1' | 'P2' | 'P3'

export interface Issue {
  id: string
  number: number
  title: string
  projectId: string
  state: IssueState
  assignedAgentId: string | null
  isBlocked: boolean
  blockReason: string | null
  priority: Priority
  createdAt: string
  updatedAt: string
}

export interface IssueCreatedPayload {
  issue: Issue
}

export interface IssueStateChangedPayload {
  previous_state: IssueState
  new_state: IssueState
  issue: Issue
}

export interface IssueBlockedPayload {
  reason: string
  issue: Issue
}

export interface IssueUnblockedPayload {
  previous_reason: string
  issue: Issue
}

export interface IssueAssignedPayload {
  previous_agent_id: string | null
  new_agent_id: string
  issue: Issue
  agent: import('./agent').Agent
}

export interface IssueUnassignedPayload {
  previous_agent_id: string | null
  issue: Issue
}

// Kanban column mapping
export const STATE_TO_COLUMN: Record<IssueState, string> = {
  backlog: 'Backlog',
  analysis: 'Analysis',
  development: 'In Progress',
  testing: 'Testing',
  review: 'Review',
  done: 'Done',
  cancelled: 'Cancelled'
}

// Kanban columns in order
export const KANBAN_COLUMNS: IssueState[] = [
  'backlog',
  'analysis',
  'development',
  'testing',
  'review',
  'done'
]

// Issue state machine transitions
export const ISSUE_TRANSITIONS: Record<IssueState, IssueState[]> = {
  backlog: ['analysis', 'cancelled'],
  analysis: ['development', 'backlog', 'cancelled'],
  development: ['testing', 'analysis', 'cancelled'],
  testing: ['review', 'development', 'cancelled'],
  review: ['done', 'development', 'cancelled'],
  done: [],
  cancelled: ['backlog']
}

// Helper to check if transition is valid
export function canIssueTransition(from: IssueState, to: IssueState): boolean {
  return ISSUE_TRANSITIONS[from]?.includes(to) ?? false
}

// Priority colors
export const PRIORITY_COLORS: Record<Priority, string> = {
  P0: 'bg-red-600',
  P1: 'bg-orange-500',
  P2: 'bg-yellow-500',
  P3: 'bg-gray-500'
}
