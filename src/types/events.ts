/**
 * Event Types for WebSocket Communication
 */

// Event envelope structure from backend
export interface EventEnvelope {
  event_id: string
  event_type: EventType
  timestamp: string
  project_id: string
  agent_id?: string
  issue_id?: string
  seq: number
  payload: Record<string, unknown>
}

// All supported event types
export type EventType =
  | 'issue.created'
  | 'issue.state_changed'
  | 'issue.blocked'
  | 'issue.unblocked'
  | 'issue.assigned'
  | 'issue.unassigned'
  | 'issue.completed'
  | 'agent.status_changed'
  | 'agent.assigned'
  | 'agent.unassigned'
  | 'system.snapshot'
  | 'system.error'
  | 'system.alert'

// Client message types
export type ClientMessageType =
  | 'handshake'
  | 'subscribe'
  | 'unsubscribe'
  | 'command'
  | 'ping'

// Server message types
export type ServerMessageType =
  | 'handshake_ack'
  | 'subscribe_ack'
  | 'unsubscribe_ack'
  | 'error'
  | 'pong'
  | 'event'
  | 'snapshot'
  | 'replay'

// WebSocket message from client
export interface ClientMessage {
  type: ClientMessageType
  client_id?: string
  client_name?: string
  topics?: string[]
  command?: string
  data?: Record<string, unknown>
}

// WebSocket response from server
export interface ServerMessage {
  type: ServerMessageType
  client_id?: string
  server_time?: string
  subscribed_topics?: string[]
  available_topics?: string[]
  subscribed?: string[]
  unsubscribed?: string[]
  failed?: string[]
  error?: string
  code?: string
  timestamp?: string
  data?: {
    agents?: Agent[]
    issues?: Issue[]
    currentSeq?: number
  }
  events?: EventEnvelope[]
  current_seq?: number
}

// Import from agent/issue types for convenience
import type { Agent } from './agent'
import type { Issue } from './issue'

export type { Agent, Issue }
