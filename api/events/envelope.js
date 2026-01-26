/**
 * Event Envelope Factory
 * Creates standardized event envelopes with unique IDs and sequence numbers
 */
import { v4 as uuidv4 } from 'uuid'

/**
 * @typedef {Object} EventEnvelope
 * @property {string} event_id - Unique event identifier
 * @property {string} event_type - Type of event (e.g., 'issue.created', 'agent.status_changed')
 * @property {string} timestamp - ISO 8601 timestamp
 * @property {string} project_id - Project identifier
 * @property {string} [agent_id] - Agent identifier (optional)
 * @property {string} [issue_id] - Issue identifier (optional)
 * @property {number} seq - Sequence number for ordering
 * @property {Object} payload - Event-specific data
 */

/**
 * Creates an event envelope with all required fields
 * @param {Object} params
 * @param {string} params.event_type - Type of the event
 * @param {string} params.project_id - Project ID
 * @param {string} [params.agent_id] - Agent ID (optional)
 * @param {string} [params.issue_id] - Issue ID (optional)
 * @param {Object} params.payload - Event payload data
 * @param {function} params.getNextSeq - Function to get next sequence number
 * @returns {EventEnvelope}
 */
export function createEventEnvelope({ event_type, project_id, agent_id, issue_id, payload, getNextSeq }) {
  const envelope = {
    event_id: uuidv4(),
    event_type,
    timestamp: new Date().toISOString(),
    project_id,
    seq: getNextSeq(),
    payload
  }

  if (agent_id) envelope.agent_id = agent_id
  if (issue_id) envelope.issue_id = issue_id

  return envelope
}

/**
 * Validates an event envelope has all required fields
 * @param {EventEnvelope} envelope
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function validateEnvelope(envelope) {
  const errors = []

  if (!envelope.event_id) errors.push('Missing event_id')
  if (!envelope.event_type) errors.push('Missing event_type')
  if (!envelope.timestamp) errors.push('Missing timestamp')
  if (!envelope.project_id) errors.push('Missing project_id')
  if (typeof envelope.seq !== 'number') errors.push('Missing or invalid seq')
  if (!envelope.payload || typeof envelope.payload !== 'object') {
    errors.push('Missing or invalid payload')
  }

  return {
    valid: errors.length === 0,
    errors
  }
}

/**
 * Event types supported by the system
 */
export const EventTypes = {
  // Issue events
  ISSUE_CREATED: 'issue.created',
  ISSUE_STATE_CHANGED: 'issue.state_changed',
  ISSUE_BLOCKED: 'issue.blocked',
  ISSUE_UNBLOCKED: 'issue.unblocked',
  ISSUE_ASSIGNED: 'issue.assigned',
  ISSUE_UNASSIGNED: 'issue.unassigned',
  ISSUE_COMPLETED: 'issue.completed',

  // Agent events
  AGENT_STATUS_CHANGED: 'agent.status_changed',
  AGENT_ASSIGNED: 'agent.assigned',
  AGENT_UNASSIGNED: 'agent.unassigned',

  // System events
  SYSTEM_SNAPSHOT: 'system.snapshot',
  SYSTEM_ERROR: 'system.error',
  SYSTEM_ALERT: 'system.alert'
}

export default { createEventEnvelope, validateEnvelope, EventTypes }
